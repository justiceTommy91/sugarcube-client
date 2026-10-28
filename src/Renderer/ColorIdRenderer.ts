/* eslint-disable no-bitwise */
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'

import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'

import {
    NOTIFY_FURNITURE_ITEM_READY,
    NOTIFY_ART_ITEM_READY,
    COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR,
    COLOR_ID_SUBOBJECT_LAYER,
} from 'Renderer/constants'
import { ViewerStateUpdateNotification } from 'Renderer/geomviewer/geom_notifications'
import { NOTIFY_VIEWER_STATE_UPDATE } from 'Renderer/geomviewer/geom_constants'

import { RENDER_DIMENSIONS_READY } from 'Renderer/StartupWarden'
import { FurnitureItemInfo, ArtItemInfo, NotificationInfo } from 'Renderer/NotificationDispatcher'
import type FurnitureItem3D from 'Renderer/model/FurnitureItem3D'
import { clamp } from 'utils/math'
import { GrandCentral } from './GrandCentral'
import { gvCurrentScene, gvStartupWarden, gvViewManager, gvRenderLibrary, gvGeomModel } from './foundation/geom_app'
import ArtItem3D from './model/ArtItem3D'
import { RenderItem3D } from './model/RenderItem3D'
import { isFurnitureItem3D, isArtItem3D } from './rendering/scene_utils'
import { mulberry32 } from './utils/utils'

export interface ColorIdPixelsData {
    width: number,
    height: number,
    pixelsBuffer: Uint8Array | null,
    success: boolean
}

export function createFlatColorMaterial(inflationValue: number, inflationMultiplier: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
                #include <common>
                varying vec3 vViewPosition;
                uniform float inflation;
                uniform float inflationMultiplier;

                void main() {
                    #include <uv_vertex>
                    #include <beginnormal_vertex>
                    #include <begin_vertex>

                    transformed += normalize(objectNormal) * inflation * inflationMultiplier;
                    vec4 mvPosition = vec4(transformed, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    mvPosition = modelViewMatrix * mvPosition;
                    gl_Position = projectionMatrix * mvPosition;

                    #include <worldpos_vertex>
                }
            `,
        fragmentShader: /* glsl */ `
                uniform vec3 diffuse;
                void main() {
                    gl_FragColor = vec4(diffuse, 1.0);
                }
            `,
        uniforms: {
            diffuse: { value: new THREE.Color },
            inflation: { value: inflationValue },
            inflationMultiplier: { value: inflationMultiplier },
        },
    })
}

export class ColorIdRenderer {
    private renderTarget: THREE.WebGLRenderTarget | null = null

    private material: THREE.ShaderMaterial

    private idCounter = 0

    private pixelsDataCache: Uint8Array | null = null

    private width = 0

    private height = 0

    private debugFsQuad: FullScreenQuad | undefined

    private inflationValue = 0.0

    private inflationMultiplier = 0.0

    private pixelsCacheValid = false

    private renderingDisabled = false

    constructor(initialInflationValue: number, initialInflationMultiplier: number, enableDebugControls: boolean) {
        this.inflationValue = initialInflationValue
        this.inflationMultiplier = initialInflationMultiplier
        this.material = this.createMaterial()
        if (enableDebugControls) {
            this.debugFsQuad = ColorIdRenderer.createDebugFsQuad()
        }

        this.furnitureItemLoadObserver = this.furnitureItemLoadObserver.bind(this)
        this.artItemLoadObserver = this.artItemLoadObserver.bind(this)
        this.onCameraStateChange = this.onCameraStateChange.bind(this)

        GrandCentral.getDispatcher().addObserver(NOTIFY_ART_ITEM_READY, this.artItemLoadObserver)
        GrandCentral.getDispatcher().addObserver(NOTIFY_FURNITURE_ITEM_READY, this.furnitureItemLoadObserver)
        GrandCentral.getDispatcher().addObserver(NOTIFY_VIEWER_STATE_UPDATE, this.onCameraStateChange)
        gvStartupWarden()?.registerCallback(RENDER_DIMENSIONS_READY, this.renderDimensionsReady.bind(this))
    }

    createMaterial() {
        return createFlatColorMaterial(this.inflationValue, this.inflationMultiplier)
    }

    static createDebugFsQuad(): FullScreenQuad {
        const paletteSize = 128
        // most of the time furniture color ids have color RGB values like (0,0,1), (0,0,2), etc
        // making them hardly distinguishable visually on the black background,
        // so for this debug output we'll map them to some random colors:
        return new FullScreenQuad(new THREE.ShaderMaterial({
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: /* glsl */ `
                uniform sampler2D rtMap;
                uniform sampler2D paletteTex;
                uniform float maxId;
                uniform float paletteSize;
                varying vec2 vUv;
                void main() {
                    vec4 color = texture2D(rtMap, vUv);
                    vec3 bytes = floor(color.rgb * 255.0 + 0.5);
                    float id = bytes.g * 256.0 + bytes.b;
                    if (bytes.r >= 255.0) {
                        color.rgb = vec3(1.0, 0.0, 0.0);
                    } else if (id > 0.5) {
                        id = clamp(id, 0.0, paletteSize - 1.0);
                        float u = (id + 0.5) / paletteSize;
                        color.rgb = texture2D(paletteTex, vec2(u, 0.5)).rgb;
                    }
                    gl_FragColor = vec4(color.rgb, 1.0);
                }
            `,
            uniforms: {
                rtMap: { value: null },
                paletteSize: { value: paletteSize },
                paletteTex: { value: ColorIdRenderer.createDebugColorsPalette(paletteSize) },
            },
        }))
    }

    static createDebugColorsPalette(paletteSize: number) {
        const maxIds = paletteSize
        const rng = mulberry32(paletteSize)
        const data = new Uint8Array(maxIds * 4)
        for (let i = 0; i < maxIds; i += 1) {
            data[i * 4 + 0] = Math.floor(rng() * 255)
            data[i * 4 + 1] = Math.floor(rng() * 255)
            data[i * 4 + 2] = Math.floor(rng() * 255)
        }
        const paletteTex = new THREE.DataTexture(data, maxIds, 1)
        paletteTex.minFilter = THREE.NearestFilter
        paletteTex.magFilter = THREE.NearestFilter
        paletteTex.generateMipmaps = false
        paletteTex.colorSpace = THREE.NoColorSpace
        paletteTex.needsUpdate = true
        return paletteTex
    }

    private getOrCreateDebugFsQuad() {
        if (!this.debugFsQuad) {
            this.debugFsQuad = ColorIdRenderer.createDebugFsQuad()
            this.initDebugFsQuadMaterial()
        }
        return this.debugFsQuad
    }

    setMeshInflationValues(value: number, multiplier: number): boolean {
        if (value === this.inflationValue && multiplier === this.inflationMultiplier) {
            return false
        }

        this.inflationValue = value
        this.inflationMultiplier = multiplier
        this.material.uniforms.inflation.value = this.inflationValue
        this.material.uniforms.inflationMultiplier.value = gvViewManager()?.getIsTopView()
            ? this.inflationMultiplier : 1.0

        const renderItems = gvCurrentScene()?.getRenderItems()
        if (renderItems) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of renderItems) {
                const renderObject = item.getObject()
                if (renderObject) {
                    renderObject.traverse((obj) => {
                        const isColorIdMesh = !!obj?.userData?.isColorIdMesh
                        const isThinWallItem = !!obj?.userData?.isThinWallItem
                        const isPlaceholder = !!obj?.userData?.isPlaceholder
                        if (isColorIdMesh && !isPlaceholder) {
                            const mesh = obj as THREE.Mesh
                            const shaderMaterial = mesh.material as THREE.ShaderMaterial
                            shaderMaterial.uniforms.inflation.value = this.inflationValue
                            shaderMaterial.uniforms.inflationMultiplier.value = isThinWallItem
                                && gvViewManager()?.getIsTopView() ? this.inflationMultiplier : 1.0
                        }
                    })
                }
            }
        }
        return true
    }

    private furnitureItemLoadObserver(info: NotificationInfo) {
        const scene = gvCurrentScene()
        if (!scene || gvGeomModel()?.isCompositionLoading()) {
            return
        }
        const itemId = (info?.payload as FurnitureItemInfo)?.furnitureItemId
        const renderItem = scene.getRenderItem(itemId)
        if (isFurnitureItem3D(renderItem)) {
            this.prepareFurnitureItem(renderItem)
        }
    }

    private artItemLoadObserver(info: NotificationInfo) {
        const scene = gvCurrentScene()
        if (!scene || gvGeomModel()?.isCompositionLoading()) {
            return
        }
        const itemId = (info?.payload as ArtItemInfo)?.itemId
        const renderItem = scene.getRenderItem(itemId)
        if (isArtItem3D(renderItem)) {
            this.prepareArtItem(renderItem)
        }
    }

    // Search for colorIdReady in parents hierarchy, until stopParent is reached.
    // We're interested only in learning if colorIdReady is true in one of the ancestors until
    // stopParent, but not further. The object we're checking might be a stackable child with
    // its parent already colorIdReady, which, without stopParent check, may result in false positive here.
    static isColorIdReady(object: THREE.Object3D, stopParent: THREE.Object3D) {
        if (!object) {
            return false
        }
        let isReady = false
        let searchDone = false
        object.traverseAncestors((parent) => {
            if (searchDone) {
                return
            }
            if (parent.userData.colorIdReady) {
                isReady = true
            }
            searchDone = parent === stopParent
        })
        return isReady
    }

    public reserveColorId(renderItem: RenderItem3D) {
        if (renderItem.colorId !== -1) {
            return
        }
        this.idCounter += 1
        renderItem.colorId = this.idCounter

        const multiplier = 1 / 255.0
        const r = 0
        const g = multiplier * ((renderItem.colorId & 0x0000ff00) >> 8)
        const b = multiplier * (renderItem.colorId & 0x000000ff)

        renderItem.colorIdColor = new THREE.Color(r, g, b)
    }

    public createMaterialFor(renderItem: RenderItem3D) {
        const newMaterial = this.material.clone()
        newMaterial.uniforms.diffuse.value.copy(renderItem.colorIdColor)
        return newMaterial
    }

    /* eslint-disable no-param-reassign */
    prepareFurnitureItem(furnitureItem: FurnitureItem3D) {
        let isThinWallItem = false
        const size = furnitureItem.getBbox().getSize(new THREE.Vector3())
        if (size.z < 0.1 && furnitureItem.getFurnitureData().placingBehaviorHint === 'WallPlaceable') {
            isThinWallItem = true
        }
        this.prepareRenderItem(furnitureItem, isThinWallItem)
    }
    /* eslint-enable no-param-reassign */

    prepareArtItem(artItem: ArtItem3D) {
        this.prepareRenderItem(artItem, true)
    }

    private prepareRenderItem(renderItem: RenderItem3D, isThinWallItem: boolean) {
        const renderObject = renderItem.getObject()
        if (!renderObject) {
            return
        }

        this.reserveColorId(renderItem)
        // it might be a cloned object, just set up correct properties
        if (renderObject.userData.colorIdReady) {
            renderObject.traverse((obj) => {
                if (obj.userData.isColorIdMesh) {
                    obj.layers.set(COLOR_ID_SUBOBJECT_LAYER)
                    const mesh = obj as THREE.Mesh
                    // THREE.MESH doesn't clone its material when being cloned
                    mesh.material = this.createMaterialFor(renderItem)
                }
            })
            return
        }

        const meshes: Array<THREE.Mesh> = []
        renderObject.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                const mesh = obj as THREE.Mesh
                // there could be additional helper meshes, we're interested only
                // in meshes rendered with MeshStandardMaterial or CustomStandardMaterial
                const isStandardMaterial = mesh.material instanceof THREE.MeshStandardMaterial
                    || mesh.material instanceof CustomStandardMaterial
                // there might be stackable or combinable children which are already processed
                const alreadyProcessed = ColorIdRenderer.isColorIdReady(obj, renderObject)
                if (isStandardMaterial && !alreadyProcessed) {
                    meshes.push(obj)
                }
            }
        })

        meshes.forEach((meshObj) => {
            const material = this.material.clone()
            material.uniforms.diffuse.value.copy(renderItem.colorIdColor)
            material.uniforms.inflationMultiplier.value = gvViewManager()?.getIsTopView()
                ? this.inflationMultiplier
                : 1.0

            // To support vertex inflation, we need to create a new simplified mesh, with shared vertices and normals
            // vertex merge utility checks vertices similarity not only by position, but also by all other attributes
            // and we're interested only in position, all other attributes are not needed
            let geometry = meshObj.geometry.clone()
            geometry.deleteAttribute(`normal`)
            geometry.deleteAttribute(`tangent`)
            geometry.deleteAttribute(`uv`)
            geometry.deleteAttribute(`uv2`)

            geometry = BufferGeometryUtils.mergeVertices(geometry)
            geometry.computeVertexNormals()
            const child = new THREE.Mesh(geometry, material)
            meshObj.add(child)
            child.layers.set(COLOR_ID_SUBOBJECT_LAYER)

            child.userData.colorIdColor = renderItem.colorIdColor
            child.userData.isColorIdMesh = true
            child.userData.isThinWallItem = isThinWallItem
        })
        renderObject.userData.colorIdReady = true
    }

    private renderDimensionsReady() {
        const [width, height] = gvCurrentScene()?.getDimensions() || [1, 1]
        this.setSize(width, height)
    }

    private setSize(width: number, height: number) {
        if (width === this.width && height === this.height) {
            return
        }

        this.width = width
        this.height = height

        this.recreateRenderTarget()
    }

    getRenderTargetSize() {
        return {
            width: this.width * COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR,
            height: this.height * COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR,
        }
    }

    recreateRenderTarget() {
        if (this.renderTarget) {
            this.renderTarget.dispose()
            this.renderTarget = null
        }
        this.renderTarget = new THREE.WebGLRenderTarget(Math.ceil(this.width * COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR),
            Math.ceil(this.height * COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR), {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                colorSpace: THREE.LinearSRGBColorSpace,
                stencilBuffer: true,
            })

        this.pixelsDataCache = new Uint8Array(this.renderTarget.width * this.renderTarget.height * 4)
        this.pixelsCacheValid = false
        this.initDebugFsQuadMaterial()
    }

    private initDebugFsQuadMaterial() {
        if (!this.debugFsQuad || !this.renderTarget) {
            return
        }
        const debugMaterial = this.debugFsQuad.material as THREE.ShaderMaterial
        debugMaterial.uniforms.rtMap.value = this.renderTarget.texture
    }

    public renderFrame() {
        if (this.renderingDisabled) {
            return
        }

        if (!this.renderTarget) {
            this.recreateRenderTarget()
        }

        const scene = gvCurrentScene()
        if (!this.renderTarget || !this.pixelsDataCache || !scene) {
            return
        }
        const renderTargetSize = this.renderTarget.width * this.renderTarget.height
        if (renderTargetSize <= 0) {
            return
        }
        const renderEngine = gvViewManager()?.getRenderEngine()
        const threeRenderer = gvRenderLibrary()?.renderer
        if (!threeRenderer || !renderEngine) {
            return
        }

        const prevRenderTarget = threeRenderer.getRenderTarget()
        const prevClearAlpha = threeRenderer.getClearAlpha()
        const prevClearColor = threeRenderer.getClearColor(new THREE.Color())
        const prevEncoding = threeRenderer.outputColorSpace

        threeRenderer.setClearColor(new THREE.Color(0.0, 0.0, 0.0))
        threeRenderer.setClearAlpha(1.0)
        threeRenderer.outputColorSpace = THREE.LinearSRGBColorSpace
        threeRenderer.setRenderTarget(this.renderTarget)
        threeRenderer.clear()

        renderEngine.renderColorIds()

        threeRenderer.setClearColor(prevClearColor)
        threeRenderer.setClearAlpha(prevClearAlpha)
        threeRenderer.outputColorSpace = prevEncoding
        threeRenderer.setRenderTarget(prevRenderTarget)

        this.pixelsCacheValid = false
    }

    public forceRenderFrame() {
        this.renderingDisabled = false
        this.renderFrame()
    }

    private refreshPixelsChache() {
        if (this.pixelsCacheValid) {
            return true
        }
        const threeRenderer = gvRenderLibrary()?.renderer
        if (!threeRenderer || !this.renderTarget) {
            return false
        }
        try {
            threeRenderer.readRenderTargetPixels(this.renderTarget, 0, 0, this.renderTarget.width,
                this.renderTarget.height, this.pixelsDataCache)
        } catch (err) {
            return false
        }
        this.pixelsCacheValid = true
        return true
    }

    getPixelsData(outBuffer?: Uint8Array): ColorIdPixelsData {
        this.refreshPixelsChache()
        const ret = {
            width: 0,
            height: 0,
            pixelsBuffer: outBuffer || null,
            success: false
        }

        if (!this.renderTarget || !this.pixelsDataCache) {
            return ret
        }
        if (outBuffer) {
            try {
                outBuffer.set(this.pixelsDataCache)
            } catch (err) {
                return ret
            }
        } else {
            ret.pixelsBuffer = this.pixelsDataCache.slice()
        }

        ret.width = this.renderTarget.width
        ret.height = this.renderTarget.height
        ret.success = true
        return ret
    }

    public getColorIdValueAtPoint(pixelX: number, pixelY: number) {
        if (!this.renderTarget || !this.pixelsDataCache || this.pixelsDataCache.length === 0) {
            return undefined
        }
        const w = this.renderTarget.width
        const index = (pixelY * w + pixelX) * 4
        const g = this.pixelsDataCache[index + 1]
        const b = this.pixelsDataCache[index + 2]
        return (g << 8) | b
    }

    public sampleColorIdAtPoint(relX: number, relY: number) {
        const noItemsAdded = this.idCounter === 0
        if (noItemsAdded || !this.renderTarget || !this.pixelsDataCache || this.pixelsDataCache.length === 0) {
            return undefined
        }
        const refreshUpdateResult = this.refreshPixelsChache()
        if (!refreshUpdateResult) {
            return undefined
        }

        const w = this.renderTarget.width
        const h = this.renderTarget.height
        const centerX = clamp(0, Math.round(w * relX))(w)
        const centerY = clamp(0, Math.round(h * (1.0 - relY)))(h)

        // Smaller sigma values - weights are more concentrated in the center, larger - more spread out.
        const radius = 3
        const gaussianSigma = radius / 6.0
        const sigmaSq = gaussianSigma * gaussianSigma
        const radiusSq = radius * radius
        const colorWeights = new Map<number, number>()

        const minX = Math.max(0, centerX - radius)
        const maxX = Math.min(w - 1, centerX + radius)
        const minY = Math.max(0, centerY - radius)
        const maxY = Math.min(h - 1, centerY + radius)

        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                const dx = x - centerX
                const dy = y - centerY
                const distanceSq = dx * dx + dy * dy

                if (distanceSq > radiusSq) {
                    continue // eslint-disable-line no-continue
                }

                const colorId = this.getColorIdValueAtPoint(x, y)
                if (colorId === undefined) {
                    continue  // eslint-disable-line no-continue
                }
                const weight = colorId > 0 ? Math.exp(-distanceSq / (2 * sigmaSq)) : 0
                const currentWeight = colorWeights.get(colorId) || 0
                colorWeights.set(colorId, currentWeight + weight)
            }
        }

        if (colorWeights.size === 0) {
            return undefined
        }

        let maxWeight = 0
        let bestColorId = 0
        for (const [colorId, weight] of colorWeights) {
            if (weight > maxWeight) {
                maxWeight = weight
                bestColorId = colorId
            }
        }
        return bestColorId
    }

    cleanup() {
        GrandCentral.getDispatcher().removeObserver(this.furnitureItemLoadObserver)
        GrandCentral.getDispatcher().removeObserver(this.onCameraStateChange)
        if (this.renderTarget) {
            this.renderTarget.dispose()
            this.renderTarget = null
        }

        if (this.debugFsQuad) {
            const material = this.debugFsQuad.material as THREE.Material
            if (material) {
                material.dispose()
            }

            this.debugFsQuad.dispose()
        }
    }

    debugRender() {
        const threeRenderer = gvRenderLibrary()?.renderer
        const debugQuad = this.getOrCreateDebugFsQuad()
        if (!threeRenderer || !debugQuad) {
            return
        }
        debugQuad.render(threeRenderer)
    }

    private onCameraStateChange(info: NotificationInfo) {
        const state = info as ViewerStateUpdateNotification
        if (state.payload.stateInfo === 'ViewChangeEnd'
            || state.payload.stateInfo === 'CameraEnterStaticView'
            || state.payload.stateInfo === 'OrbitMoveEnd') {
                this.onCameraEnterStaticView()
            }

        if (state.payload.stateInfo === 'ViewChangeStart'
            || state.payload.stateInfo === 'CameraExitStaticView'
            || state.payload.stateInfo === 'OrbitMoveStart') {
                this.onCameraExitStaticView()
            }
    }

    private onCameraEnterStaticView() {
        const vm = gvViewManager()
        const debugSettings = vm?.getCurrentSettings().debugSettings
        if (vm && debugSettings) {
            const inflationMultiplier = vm.getIsTopView() ? debugSettings.pinsColorIdInflationMultiplier : 1.0
            this.setMeshInflationValues(this.inflationValue, inflationMultiplier)
        }

        this.renderingDisabled = false
    }

    private onCameraExitStaticView() {
        this.renderingDisabled = true
    }

    onCanvasResize() {
        // ColorId rendering is delayed until the composition is fully loaded
        // so we don't want to refresh the RT until then.
        if (!gvGeomModel()?.isCompositionLoading()) {
            this.renderFrame()
        }
    }
}
