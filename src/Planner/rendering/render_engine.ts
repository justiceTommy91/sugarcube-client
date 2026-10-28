/* eslint-disable class-methods-use-this */
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'

import CustomOutlinePass from 'Renderer/CustomOutlinePass'
import { getHardwareInfo } from 'utils/getHardwareInfo'
import { IOffscreenRenderContext } from 'Renderer/rendering/OffscreenRenderer'

import type { Camera } from 'Planner/rendering/camera'
import type { RoomScene } from 'Planner/rendering/room_scene'
import type { PlannerViewer } from 'Planner/planner_viewer'

import {
    INPUT_HANDLER_HOVER_START,
    INPUT_HANDLER_HOVER_END,
    INPUT_HANDLER_SELECT_START,
    INPUT_HANDLER_SELECT_END,
  } from 'Planner/planner_constants'

import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import type { GlContextInfo } from 'Renderer/geomviewer/geom_types'
import { patchRendererForRenderTargets } from 'Renderer/rendering/rendering_utils'
import PropertyManager from 'Renderer/utils/property_manager'

import type { InteractableItemType } from 'Planner/api_types'
import { ERROR_ACQUIRING_WEBGL_CONTEXT } from 'Planner/api_constants'

interface EffectComposerDisposable {
    dispose(): void
}

type AntiAlias = {
    type: 'None'
    pass: null
} | {
    type: 'FXAA'
    pass: ShaderPass | null
} | {
    type: 'SMAA'
    pass: SMAAPass | null
} | {
    type: 'SSAA'
    pass: SSAARenderPass | null
}

type FrameRenderCallback = {
    callback: () => void
    autoRemove: boolean
}

export const EDGE_THICKNESS_THICK = 1.0
export const EDGE_THICKNESS_THIN = 1.0
export const EDGE_STRENGTH_THICK = 1.0
export const EDGE_STRENGTH_THIN = 0.8

export class RenderEngine {
    private viewer: PlannerViewer
    private viewSize: THREE.Vector2 = new THREE.Vector2()
    private renderer: THREE.WebGLRenderer
    private isDirty = false
    private composer: EffectComposer
    private hoveredOutlinePass: CustomOutlinePass  | null = null
    private selectedOutlinePass: CustomOutlinePass  | null = null
    private readonly antiAlias: AntiAlias = { type: `None`, pass: null }
    private camera: Camera | null = null
    private scene: RoomScene | null = null
    private animationFrameHandle: number | null = null
    private onFrameRenderCallbacks: FrameRenderCallback[] = []

    constructor(canvas: HTMLCanvasElement, parentViewer: PlannerViewer) {
        this.onHoverStart = this.onHoverStart.bind(this)
        this.onHoverEnd = this.onHoverEnd.bind(this)
        this.onSelectStart = this.onSelectStart.bind(this)
        this.onSelectEnd = this.onSelectEnd.bind(this)

        this.viewer = parentViewer
        this.viewer.addEventListener(INPUT_HANDLER_HOVER_START,
            evt => this.onHoverStart(evt.id, evt.objectType, evt.isSelected))
        this.viewer.addEventListener(INPUT_HANDLER_HOVER_END,
            evt => this.onHoverEnd(evt.id, evt.objectType, evt.isSelected))
        this.viewer.addEventListener(INPUT_HANDLER_SELECT_START,
            evt => this.onSelectStart(evt.id, evt.objectType))
        this.viewer.addEventListener(INPUT_HANDLER_SELECT_END,
            this.onSelectEnd)

        this.animate = this.animate.bind(this)

        // ThreeJS can throw a lower level WebGL error, or one of these own errors during renderer creation:
        // - 'Error creating WebGL context with your selected attributes.'
        // - 'Error creating WebGL context.'
        // If it's one of those two, we want to show the sad bear, otherwise re-throw the error as is.
        try {
            this.renderer = RenderEngine.createThreeRenderer(canvas)
        } catch(error) {
            const threeError1 = `Error creating WebGL context with your selected attributes.`
            const threeError2 = `Error creating WebGL context.`
            if (error instanceof Error && (error.message === threeError1 || error.message === threeError2)) {
                throw new Error(ERROR_ACQUIRING_WEBGL_CONTEXT, { cause: error.message })
            }
            throw error
        }
        this.renderer.getSize(this.viewSize)

        this.composer = new EffectComposer(this.renderer)
        this.composer.renderTarget1.texture.colorSpace = THREE.SRGBColorSpace
        this.composer.renderTarget2.texture.colorSpace = THREE.SRGBColorSpace
        if ('samples' in this.composer.renderTarget1) {
            this.composer.renderTarget1.samples = 4
        }
        if ('samples' in this.composer.renderTarget2) {
            this.composer.renderTarget2.samples = 4
        }
    }

    public onCanvasResized() {
        const width = this.renderer.domElement.clientWidth;
        const height = this.renderer.domElement.clientHeight;
        this.renderer.setSize(width, height, false)
        this.renderer.getSize(this.viewSize)
        this.composer.setSize(width, height)
        if (this.camera) {
            // as we can be scaling the width and height of the canvas on resize,
            // we need to update the camera aspect ratio
            const renderCamera = this.camera.getRenderCamera();
            renderCamera.aspect = width / height;
            renderCamera.updateProjectionMatrix();
        }
        if (this.antiAlias.pass) {
            switch (this.antiAlias.type) {
                case 'FXAA':
                    this.antiAlias.pass.uniforms.resolution.value.set(1 / this.viewSize.x, 1 / this.viewSize.y)
                    break
                case 'SMAA':
                    this.antiAlias.pass.setSize(this.viewSize.x * this.renderer.getPixelRatio(),
                        this.viewSize.y * this.renderer.getPixelRatio())
                    break
                default:
                    break
            }
        }
        this.setDirty()
    }

    public shutDown() {
        if (this.animationFrameHandle) {
            cancelAnimationFrame(this.animationFrameHandle)
        }
        this.camera = null
        // ThreeJS' EffectCOmposer has "dispose" method, but it's not present in its type declaration for some reason.
        const composerWithDispose = this.composer as unknown as EffectComposerDisposable
        composerWithDispose.dispose()
        this.renderer.clear()
        this.renderer.dispose()
    }

    public initialize(scene: RoomScene, camera: Camera) {
        this.scene = scene
        this.camera = camera
        this.hoveredOutlinePass = new CustomOutlinePass(this.viewSize, this.scene.getRenderScene(),
            this.camera.getRenderCamera())
        this.hoveredOutlinePass.visibleEdgeColor.set(0xffdb00)
        this.hoveredOutlinePass.selectedEdgeColor.set(0xffdb00)
        this.hoveredOutlinePass.hiddenEdgeColor.set(0xffdb00)
        this.hoveredOutlinePass.edgeThickness = EDGE_THICKNESS_THIN
        this.hoveredOutlinePass.edgeStrength = EDGE_STRENGTH_THIN

        this.selectedOutlinePass = new CustomOutlinePass(this.viewSize, this.scene.getRenderScene(),
            this.camera.getRenderCamera())
        this.selectedOutlinePass.visibleEdgeColor.set(0xffdb00)
        this.selectedOutlinePass.selectedEdgeColor.set(0xffdb00)
        this.selectedOutlinePass.hiddenEdgeColor.set(0xffdb00)
        this.selectedOutlinePass.edgeThickness = EDGE_THICKNESS_THICK
        this.selectedOutlinePass.edgeStrength = EDGE_STRENGTH_THICK

        if (this.antiAlias.type !== 'SSAA') {
            this.composer.addPass(new RenderPass(this.scene.getRenderScene(), this.camera.getRenderCamera()))
            this.composer.addPass(this.hoveredOutlinePass)
            this.composer.addPass(this.selectedOutlinePass)
        }
        switch (this.antiAlias.type) {
            case 'FXAA':
                this.antiAlias.pass = new ShaderPass(FXAAShader)
                this.antiAlias.pass.uniforms.resolution.value.set(1 / this.viewSize.x, 1 / this.viewSize.y)
                break
            case 'SMAA':
                this.antiAlias.pass = new SMAAPass(this.viewSize.x * this.renderer.getPixelRatio(),
                    this.viewSize.y * this.renderer.getPixelRatio())
                break
            case 'SSAA':
                this.antiAlias.pass = new SSAARenderPass(this.scene.getRenderScene(), this.camera.getRenderCamera(),
                    this.renderer.getClearColor(new THREE.Color()), this.renderer.getClearAlpha())
                break
            default:
                break
        }
        if (this.antiAlias.pass) {
            this.composer.addPass(this.antiAlias.pass)
        }
        if (this.antiAlias.type === 'SSAA') {
            this.composer.addPass(this.hoveredOutlinePass)
            this.composer.addPass(this.selectedOutlinePass)
            const copyPass = new ShaderPass(CopyShader)
            this.composer.addPass(copyPass)
        }

        this.scene.getRenderScene().traverse((child) => {
            if (child.userData.needsTextureInit) {
                this.initObjectTextures(child)
            }
        })

        const waitRenderFrame = new Promise<void>((resolve) => {
            this.addRenderCallback(resolve, true)
        })
        return this.scene.initWithRenderEngine(this.renderer)
            .then(() => this.animate())
            .then(() => waitRenderFrame)
    }

    public setDirty() {
        this.isDirty = true
    }

    public getSize() {
        const size = this.renderer.getSize(this.viewSize)
        return {
            width: size.x,
            height: size.y,
        }
    }

    public addRenderCallback(callback: () => void, autoRemove = false) {
        this.onFrameRenderCallbacks.push({
            callback,
            autoRemove,
        })
    }

    public removeRenderCallback(callback: () => void) {
        const index = this.onFrameRenderCallbacks.findIndex((cb) => cb.callback === callback)
        if (index !== -1) {
            this.onFrameRenderCallbacks.splice(index, 1)
        }
    }

    private frameNeedsRender() {
        return this.isDirty || this.scene?.getIsDirty() || this.camera?.getIsDirty()
    }

    private cubemapFrameNeedsRender() {
        return this.scene?.getCubemapIsDirty()
    }

    private static createThreeRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
        const params = {
            canvas,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: `high-performance`,
            antialias: false, // It will be handled by effect composer.
        }

        const renderer = new THREE.WebGLRenderer(params)
        patchRendererForRenderTargets(renderer)
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
        renderer.setClearColor(0xcccccc)
        renderer.setClearAlpha(0)
        // We're using CustomStandardMaterial which needs this setting (see BaseRenderEngine.switchLUTtoneMapping).
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace
        renderer.toneMapping = THREE.LinearToneMapping
        renderer.localClippingEnabled = true
        renderer.toneMappingExposure = 1.0
        renderer.useLegacyLights = false
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFShadowMap
        return renderer
    }

    private animate() {
        this.animationFrameHandle = requestAnimationFrame(this.animate)
        if (this.cubemapFrameNeedsRender()) {
            this.renderCubemapFrame()
        }
        if (this.frameNeedsRender()) {
            this.renderFrame()
        }
    }

    private renderCubemapFrame() {
        if (!this.scene) {
            return
        }

        const stateCtx = new PropertyManager()
        this.scene.onBeforeCubemapRender(stateCtx)

        const renderScene = this.scene.getRenderScene()
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer)
        const cubemapRenderTarget = pmremGenerator.fromScene(renderScene)

        this.scene.onAfterCubemapRender(cubemapRenderTarget, stateCtx)
    }

    private renderFrame() {
        if (!this.camera || !this.scene) {
            return
        }

        const renderCamera = this.camera.getRenderCamera()

        const cameraWorldPos = renderCamera.getWorldPosition(new THREE.Vector3())
        this.scene.onBeforeRender(cameraWorldPos, this.viewSize)

        this.composer.render()

        this.isDirty = false
        this.scene.setIsDirty(false)
        this.camera.setIsDirty(false)

        this.onFrameRenderCallbacks.forEach(cb => cb.callback())
        this.onFrameRenderCallbacks = this.onFrameRenderCallbacks.filter(cb => !cb.autoRemove)
    }

    private onHoverStart(id: string, type: InteractableItemType, isSelected: boolean) {
        const outlinePass = isSelected ? this.selectedOutlinePass : this.hoveredOutlinePass

        if (!outlinePass || !this.hoveredOutlinePass || !this.scene) {
            return
        }
        const object = this.getInteractableObject(id, type)
        if (!object) {
            return
        }
        outlinePass.selectedObjects.push(object)
        this.setDirty()
        if (isSelected) {
            this.removeFromPass(this.hoveredOutlinePass, object)
        }
    }

    private removeFromPass(pass: OutlinePass, object: THREE.Object3D) {
        if (!this.scene) {
            return
        }
        const idx = pass.selectedObjects.findIndex(obj => obj === object)
        if (idx >= 0) {
            pass.selectedObjects.splice(idx, 1)
        }
    }

    private onHoverEnd(id: string, type: InteractableItemType, isSelected: boolean) {
        if (!this.selectedOutlinePass || !this.hoveredOutlinePass || !this.scene) {
            return
        }

        const object = this.getInteractableObject(id, type)
        if (!isSelected && object) {
            this.removeFromPass(this.selectedOutlinePass, object)
            this.removeFromPass(this.hoveredOutlinePass, object)
        }
        this.setDirty()
    }

    private onSelectStart(id: string, type: InteractableItemType) {
        if (!this.selectedOutlinePass || !this.hoveredOutlinePass || !this.scene) {
            return
        }
        const object = this.getInteractableObject(id, type)
        if (!object) {
            return
        }
        this.selectedOutlinePass.selectedObjects.push(object)
        this.removeFromPass(this.hoveredOutlinePass, object)
        this.setDirty()
    }

    private onSelectEnd() {
        if (!this.selectedOutlinePass) {
            return
        }
        this.selectedOutlinePass.selectedObjects.length = 0
        this.setDirty()
    }

    public onFurnitureItemResolved(itemUuid: string) {
        const object = this.scene?.getRenderScene().getObjectByProperty(`uuid`, itemUuid)
        if (!object) {
            return
        }
        object.traverse((child) => this.initObjectTextures(child))
    }

    private initObjectTextures(object: THREE.Object3D) {
        if (!object.userData.needsTextureInit ||
            !(object instanceof THREE.Mesh) ||
            !(object.material instanceof CustomStandardMaterial)) {
            return
        }
        const material = object.material
        Object.entries(material).forEach(([key, value]) => {
            if (value && key !== 'envMap' && key.toLowerCase().endsWith('map') && value.image) {
                this.renderer.initTexture(value)
                if (typeof value.image.close === 'function') {
                    value.image.close()
                }
                delete value.image
            }
        })
        delete object.userData.needsTextureInit
    }

    private getInteractableObject(id: string, type: InteractableItemType) {
        let result: THREE.Object3D | undefined = undefined
        if (!this.scene) {
            return  result
        }
        switch (type) {
            case `wall-element`:
                result = this.scene.getWallElementObject(id)
                break
            case `composition-item`:
                result = this.scene.getCompositionItemObject(id)
                break
            default:
                break
        }
        return result
    }

    public debugForceWebglContextLoss() {
        this.renderer.forceContextLoss()
    }

    public borrowOffscreenRenderContext<T>(fn: (r: IOffscreenRenderContext) => T): T {
        const offscreenRenderCtx = this.renderer as unknown as IOffscreenRenderContext
        const result = fn(offscreenRenderCtx)
        return result
    }

    public querySystemInfo(): GlContextInfo | null {
        let isSoftwareRenderer = false
        const queryCanvas = document.createElement('canvas')
        let context = queryCanvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })
        if (!context) {
            isSoftwareRenderer = true
            context = this.renderer.getContext()
        }
        if (!context) {
            return null
        }

        const extDepth = context.getExtension(`EXT_frag_depth`)
        const wgl2QueryTimerExt = context.getExtension(`EXT_disjoint_timer_query_webgl2`)
        const wgl1QueryTimerExt = context.getExtension(`EXT_disjoint_timer_query`)

        const debugInfo = context.getExtension(`WEBGL_debug_renderer_info`)
        const version = context.getParameter(context.VERSION)
        const GLSLversion = context.getParameter(context.SHADING_LANGUAGE_VERSION)
        const vendor = context.getParameter(context.VENDOR)
        const renderer = context.getParameter(context.RENDERER)
        const underlyingVendor = debugInfo ? context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : undefined
        const underlyingRenderer = debugInfo ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : undefined

        isSoftwareRenderer = isSoftwareRenderer ||
            (renderer === 'WebKit WebGL' &&
            underlyingVendor === 'Google Inc. (Google)' &&
            underlyingRenderer.indexOf('SwiftShader Device') >= 0 &&
            underlyingRenderer.indexOf('SwiftShader driver') >= 0 &&
            navigator.userAgent.indexOf('Chrome') >= 0)

        return {
            hasFragmentDepth: !!extDepth,
            antialias: false,
            software: isSoftwareRenderer,
            canvas_height: this.viewSize.y,
            canvas_width: this.viewSize.x,
            hasWGL1QueryTimer: !!wgl1QueryTimerExt,
            hasWGL2QueryTimer: !!wgl2QueryTimerExt,
            hwinfo: getHardwareInfo(),
            version,
            GLSLversion,
            vendor,
            renderer,
            underlyingVendor,
            underlyingRenderer,
            devicePixelRatio: window.devicePixelRatio,
        }
    }
}
