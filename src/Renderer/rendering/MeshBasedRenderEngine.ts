/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable i18next/no-literal-string */

import * as THREE from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import CustomOutlinePass from 'Renderer/CustomOutlinePass'
import { ViewerSettings } from 'Renderer/geomviewer/geom_types'
import { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import { BaseRenderEngine } from 'Renderer/rendering/BaseRenderEngine'
import { MeshScene } from 'Renderer/rendering/MeshScene'
import * as constants from 'Renderer/constants'
import { blendTransparentPixels, imageDataToDataURL} from 'Renderer/ImageUtils'
import PropertyManager from 'Renderer/utils/property_manager'
import {
    InitializationFailureCallback,
    OnFirstRenderCallback,
    ThumbnailGenerationResult,
    ThumbnailTelemetry,
    isMeshStandardMaterial,
    isMesh,
    type StandardMesh,
} from './rendering_types'

export class MeshBasedRenderEngine extends BaseRenderEngine<MeshScene> {
    private floorDirectSpecularDisabled = false

    constructor(
        canvas: HTMLCanvasElement,
        settings: ViewerSettings,
        debugSettings: DebugSettings,
        onInitializationFailure: InitializationFailureCallback,
        onFirstRenderCallback: OnFirstRenderCallback,
    ) {
        super(canvas, settings, debugSettings, onInitializationFailure, onFirstRenderCallback)
        this.initSize(canvas.clientWidth, canvas.clientHeight)
    }

    takeRoomScreenshot(onSuccess: (result: ThumbnailGenerationResult) => void, onError: (error: Error) => void): void {
        const artCanvas = document.getElementById('PreviewCanvas')
        if (!artCanvas || !(artCanvas instanceof HTMLCanvasElement)) {
            onError(new Error('No canvas data sources'))
        } else { 
            const thumbCanvas = document.createElement('canvas')
            thumbCanvas.width = artCanvas.width
            thumbCanvas.height = artCanvas.height
            this.scene?.onBeforeScreenshot()
            this.renderToCanvas(thumbCanvas)
            this.scene?.onAfterScreenshot()

            const currentAspectRatio = thumbCanvas.width / thumbCanvas.height
            const croppedWidth = currentAspectRatio > constants.MESH_ROOM_THUMBNAIL_ASPECT_RATIO_W_H
                ? (thumbCanvas.height * constants.MESH_ROOM_THUMBNAIL_ASPECT_RATIO_W_H) : thumbCanvas.width
            const croppedHeight = currentAspectRatio > constants.MESH_ROOM_THUMBNAIL_ASPECT_RATIO_W_H
                ? thumbCanvas.height : (thumbCanvas.width / constants.MESH_ROOM_THUMBNAIL_ASPECT_RATIO_W_H)
            const cropX = ((thumbCanvas.width - croppedWidth) / 2)
            const cropY = ((thumbCanvas.height - croppedHeight) / 2)

            const thumbTelemetry: ThumbnailTelemetry = {
                scale: 1.0,
                quality: 0.92,
                tabIsHidden: document.hidden,
                artCanvasExists: true,
                artCanvasWidth: artCanvas.width,
                artCanvasHeight: artCanvas.height,
                artCanvasContextInitialized: true,
                artCanvasIsBlack: false,
                thumbCanvasExists: true,
                thumbCanvasWidth: croppedWidth,
                thumbCanvasHeight: croppedHeight,
                thumbCanvasContextInitialized: true,
                imageIsBlack: false
            }

            const thumbCanvasContext = thumbCanvas.getContext('2d')
            if (thumbCanvasContext) {
                const imgData = thumbCanvasContext.getImageData(cropX, cropY, croppedWidth, croppedHeight)
                thumbTelemetry.imageIsBlack = imgData.data.every((val, idx) => idx % 4 !== 3 && val === 0)
                let thumbDataUrl
                if (!thumbTelemetry.imageIsBlack) {
                    // Alpha Blend with the background color #ccc to match backgroundPreview: $color-midDarkGray
                    blendTransparentPixels(imgData.data, 204, 204, 204)
                    thumbDataUrl = imageDataToDataURL(imgData, 'image/jpeg', 0.92)
                }
                if (!thumbDataUrl) {
                    thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.92)
                }
            
                onSuccess({ thumbTelemetry, thumbDataUrl })
            } else {
                onError(new Error('No thumb canvas context'))
            }
        }
    }

    frameArea(sizeToFitOnScreen: number, boxSize: number, boxCenter:THREE.Vector3, camera: THREE.PerspectiveCamera) {
        const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
        const halfFovY = THREE.MathUtils.degToRad(camera.fov * .5);
        const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);

        // compute a unit vector that points in the direction the camera is now
        // from the center of the box
        const direction = (new THREE.Vector3()).subVectors(camera.position, boxCenter).normalize();

        // move the camera to a position distance units way from the center
        // in whatever direction the camera was from the center already
        camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

        // pick some near and far values for the frustum that
        // will contain the box.
        camera.near = boxSize / 100;
        camera.far = boxSize * 100;

        camera.updateProjectionMatrix();

        // point the camera to look at the center of the box
        camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
    }

    setScene(scene: MeshScene): void {
        if (this.scene) {
            this.scene.onDeactivate()
        }
        this.scene = scene
        this.scene.onActivate()

        // Update passes that depend on curent scene.
        const threeScene = scene.getObjectsScene()
        this.hoveredOutlinePass?.setScene(threeScene, null)
        this.selectedOutlinePass?.setScene(threeScene, null)
        this.aoPass?.setOcclusionScene(threeScene, null);

        this.setDirty()
    }

    getScene(): MeshScene | null { return this.scene }

    changeViewerSettings(settings: ViewerSettings): void {
        if (this.hasRendered) {
            this.setDirty()
        }
    }

    public override renderColorIds() {
        if (!this.scene || !this.threeRenderer) {
          return
        }
        const objectsScene = this.scene.getObjectsScene()
        if (!objectsScene) {
            return
        }

        const wallColorIdMeshes: StandardMesh[] = []
        const furnitureColorIdMeshes: StandardMesh[] = []
        const wallObjects = this.scene.getStaticSceneGraph()?.getWallsObjects() || []
        wallObjects.forEach((obj) => {
            const colorIdMesh = obj.children.find(child =>
                child.layers.isEnabled(constants.COLOR_ID_SUBOBJECT_LAYER))
            if (isMesh(colorIdMesh)) {
                wallColorIdMeshes.push(colorIdMesh)
            }
        })
        objectsScene.traverse((object) => {
            if (isMesh(object) && object.userData.isColorIdMesh) {
                furnitureColorIdMeshes.push(object)
            }
        })

        const threeCamera = this.getCamera()
        const prevLayers = threeCamera.layers.mask
        threeCamera.layers.set(constants.COLOR_ID_SUBOBJECT_LAYER)

        const propertyManager = new PropertyManager()

        // Rendering of color id is done in 3 passes to support distinct colors for non-occluded
        // and occluded only by walls parts of furniture objects.
        // PASS 1: Both walls and furniture are rendered into depth buffer and stencil buffers.
        // with stencil value 1 and 0 respectively.
        // PASS 3: Furniture is rendered with regular colorId as usual, and with red channel set 
        // to 0xFF where is it occluded by walls (i.e. its depth is greater and stencil is 1).

        // PASS 1,
        wallColorIdMeshes.forEach((wallObject) => {
            propertyManager.applyPropertyChange(wallObject.material, 'colorWrite', false)
            propertyManager.applyPropertyChange(wallObject.material, 'depthWrite', true)

            propertyManager.applyPropertyChange(wallObject.material, 'stencilWrite', true)
            propertyManager.applyPropertyChange(wallObject.material, 'stencilRef', 1)
            propertyManager.applyPropertyChange(wallObject.material, 'stencilFunc', THREE.AlwaysStencilFunc)
            propertyManager.applyPropertyChange(wallObject.material, 'stencilFail', THREE.KeepStencilOp)
            propertyManager.applyPropertyChange(wallObject.material, 'stencilZFail', THREE.KeepStencilOp)
            propertyManager.applyPropertyChange(wallObject.material, 'stencilZPass', THREE.ReplaceStencilOp)
        })
        furnitureColorIdMeshes.forEach((furnitureObject) => {
            propertyManager.applyPropertyChange(furnitureObject.material, 'colorWrite', false)
            propertyManager.applyPropertyChange(furnitureObject.material, 'depthWrite', true)

            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilWrite', true)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilRef', 0)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilFunc', THREE.AlwaysStencilFunc)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilFail', THREE.KeepStencilOp)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilZFail', THREE.KeepStencilOp)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilZPass', THREE.ReplaceStencilOp)
        })
        this.threeRenderer.render(objectsScene, threeCamera)

        // PASS 2a
        wallColorIdMeshes.forEach(wallObject =>
            wallObject.layers.disable(constants.COLOR_ID_SUBOBJECT_LAYER))
        furnitureColorIdMeshes.forEach((furnitureObject) => {
            furnitureObject.layers.enable(constants.COLOR_ID_SUBOBJECT_LAYER)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilWrite', false)
            propertyManager.applyPropertyChange(furnitureObject.material, 'colorWrite', true)
            propertyManager.applyPropertyChange(furnitureObject.material, 'depthWrite', false)
            propertyManager.applyPropertyChange(furnitureObject.material, 'depthFunc', THREE.EqualDepth)
        })
        this.threeRenderer.render(objectsScene, threeCamera)

        // PASS 2b
        furnitureColorIdMeshes.forEach((furnitureObject) => {
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilWrite', true)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilRef', 1)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilFunc', THREE.EqualStencilFunc)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilFail', THREE.KeepStencilOp)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilZFail', THREE.KeepStencilOp)
            propertyManager.applyPropertyChange(furnitureObject.material, 'stencilZPass', THREE.KeepStencilOp)

            propertyManager.applyPropertyChange(furnitureObject.material, 'colorWrite', true)
            propertyManager.applyPropertyChange(furnitureObject.material, 'depthWrite', false)
            propertyManager.applyPropertyChange(furnitureObject.material, 'depthFunc', THREE.GreaterDepth)

            if (furnitureObject.material instanceof THREE.ShaderMaterial) {
                furnitureObject.material.uniforms.diffuse.value.r = 1.0
            }
        })
        this.threeRenderer.render(objectsScene, threeCamera)

        // Restore values.
        furnitureColorIdMeshes.forEach((furnitureObject) => {
            furnitureObject.layers.enable(constants.COLOR_ID_SUBOBJECT_LAYER)
            if (furnitureObject.material instanceof THREE.ShaderMaterial) {
                furnitureObject.material.uniforms.diffuse.value.copy(furnitureObject.userData.colorIdColor)
            }
        })
        wallColorIdMeshes.forEach(wallObject =>
            wallObject.layers.enable(constants.COLOR_ID_SUBOBJECT_LAYER))
        propertyManager.revertChanges()
        threeCamera.layers.mask = prevLayers
    }

    override changeDebugSettings(settings: DebugSettings): void {
        const prevSettings = {
            ...this.debugSettings
        }
        super.changeDebugSettings(settings)

        if (this.scene) {
            this.scene.setDebugSettings(settings)

            if (prevSettings.vAOlightIntensity !== this.debugSettings.vAOlightIntensity
                || prevSettings.vAOdarkIntesity !== this.debugSettings.vAOdarkIntesity
                || prevSettings.vAOcontrast !== this.debugSettings.vAOcontrast
                || prevSettings.vAOdirectDiffuse !== this.debugSettings.vAOdirectDiffuse
                || prevSettings.vAOindirectDiffuse !== this.debugSettings.vAOindirectDiffuse
                || prevSettings.vAOdirectSpecular !== this.debugSettings.vAOdirectSpecular
                || prevSettings.vAOindirectSpecular !== this.debugSettings.vAOindirectSpecular
            )
            this.scene.setVAOsettings(settings.vAOlightIntensity, settings.vAOdarkIntesity,
                settings.vAOcontrast, settings.vAOdirectDiffuse, settings.vAOindirectDiffuse,
                settings.vAOdirectSpecular, settings.vAOindirectSpecular)

            if (!this.floorDirectSpecularDisabled
                || prevSettings.disableFloorDirectSpecular !== this.debugSettings.disableFloorDirectSpecular) {
                this.floorDirectSpecularDisabled = this.setFloorSpecular(this.debugSettings.disableFloorDirectSpecular)
            }
            if (prevSettings.keepLocallyGeneratedLights !== this.debugSettings.keepLocallyGeneratedLights) {
                this.scene.setLocallyGeneratedLightsVisibility(this.debugSettings.keepLocallyGeneratedLights)
            }
            if (prevSettings.blockerSearchRadiusMultiplier !== this.debugSettings.blockerSearchRadiusMultiplier
                || prevSettings.pcfFilterRadiusMultiplier !== this.debugSettings.pcfFilterRadiusMultiplier
                || prevSettings.poissonKernelSize !== this.debugSettings.poissonKernelSize) {
                this.scene.setShadowDynamicProperties(this.debugSettings.blockerSearchRadiusMultiplier,
                    this.debugSettings.pcfFilterRadiusMultiplier)
            }
            if (prevSettings.poissonKernelSize !== this.debugSettings.poissonKernelSize) {
                this.scene.setShadowStaticProperties(this.debugSettings.poissonKernelSize)
            }
            if (prevSettings.sunLightIntensity !== this.debugSettings.sunLightIntensity) {
                this.scene.setSunLightIntensity(this.debugSettings.sunLightIntensity)
            }
            if (prevSettings.areaLightIntensities.some((prevVal, i) => prevVal
                !== this.debugSettings.areaLightIntensities[i])
                || prevSettings.skyLightIntensity !== this.debugSettings.skyLightIntensity) {
                this.scene.setSunBounceIntensities(this.debugSettings.areaLightIntensities, 
                    this.debugSettings.skyLightIntensity)
            }
            if (prevSettings.sunLightDeltaX !== this.debugSettings.sunLightDeltaX
                || prevSettings.sunLightDeltaY !== this.debugSettings.sunLightDeltaY
                || prevSettings.sunLightDeltaZ !== this.debugSettings.sunLightDeltaZ) {
                this.scene.translateSunLightSource(
                    this.debugSettings.sunLightDeltaX - prevSettings.sunLightDeltaX,
                    this.debugSettings.sunLightDeltaY - prevSettings.sunLightDeltaY,
                    this.debugSettings.sunLightDeltaZ - prevSettings.sunLightDeltaZ,
                )
            }

            if (prevSettings.saturationDampIntensity !== this.debugSettings.saturationDampIntensity) {
                this.scene.setEnvmapSaturationDampingIntensity(this.debugSettings.saturationDampIntensity)
            }
        }
    }

    override initCanvasSizeDesktop() {
        const width = this.canvas.clientWidth
        const height = this.canvas.clientHeight
        if (this.threeRenderer) {
            this.threeRenderer.setSize(width, height)
        }
    }

    override onCanvasResize(): void {
        super.onCanvasResize()

        const rendererSize = new THREE.Vector2()
        this.threeRenderer?.getSize(rendererSize)
        this.scene?.onCanvasResize(rendererSize)
    }

    protected switchLUTtoneMapping(useFilmicLUT: boolean): boolean {
        const baseApplied = super.switchLUTtoneMapping(useFilmicLUT)
        this.scene?.getObjectsScene()?.traverse((obj) => {
            if (obj instanceof THREE.Mesh && isMeshStandardMaterial(obj.material as THREE.Material)) {
                const currentMaterial = obj.material as THREE.MeshStandardMaterial
                // eslint-disable-next-line no-param-reassign
                obj.material = (useFilmicLUT ? 
                    new CustomStandardMaterial() : 
                    new THREE.MeshStandardMaterial()).copy(currentMaterial)
                currentMaterial.dispose()
            }
        })
        return baseApplied
    }

    protected switchParallaxMapping(disableParallaxMapping: boolean) {
        const roomMesh = this.scene?.getRoomMeshGroup()
        roomMesh?.traverse(child => {
            if (child instanceof THREE.Mesh && child.material instanceof CustomStandardMaterial) {
                child.material.switchParallaxMapping(disableParallaxMapping)
              }      
        })
        return super.switchParallaxMapping(disableParallaxMapping)
    }    

    protected setFloorSpecular(disableFloorDirectSpecular: boolean): boolean {
        const roomMesh = this.scene?.getRoomMeshGroup()
        const floorObj = roomMesh?.children.find(obj => obj.name.includes('floor'))
        if (floorObj) {
            const floorMesh = floorObj as THREE.Mesh
            const floorMaterial = floorMesh.material as CustomStandardMaterial
            floorMaterial.switchDirectSpecular(disableFloorDirectSpecular)
            return true
        }
        return false
    }

    override setToneMappingParameters(type: THREE.ToneMapping, exposure: number): boolean {
        if (!this.threeRenderer) {
            return false
        }
        if (this.threeRenderer.toneMapping !== type) {
            this.threeRenderer.toneMapping = type
            this.scene?.getObjectsScene()?.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.material.needsUpdate = true;
                }
            })
        }
        this.threeRenderer.toneMappingExposure = exposure
        return true
    }

    protected renderSceneOffscreen(): void {
        // Hide the backside mesh of the rug. This causes z-fighting
        // artifacts in thumbnail views and doesn't seem to provide
        // a substantial visual benefit.
        this.scene?.setVisibilityRugBacksideMeshes(false)
        this.renderScene()
        this.scene?.setVisibilityRugBacksideMeshes(true)
    }

    protected renderScene(): void {
        if (!this.threeRenderer || !this.getCamera() || !this.scene) {
            return
        }
        const objectsScene = this.scene.getObjectsScene()
        if (!objectsScene) {
            return
        }

        const camera = this.getCamera()
        this.scene.hideViewObstructingGeometries(camera)
        
        this.threeRenderer.clear(true, true, true)
        this.threeRenderer.render(objectsScene, camera)

        if (this.scene.getHasRugs() && this.debugSettings.useFloorContactShadows) {
            // Rugs contact shadows require a custom render call to project
            // all the items ontop of the rugs onto a separate render target.
            this.prepareRugsContactShadowsFrameRender()
            const origRenderTarget = this.threeRenderer.getRenderTarget()
            this.threeRenderer.setRenderTarget(this.contactShadowTexRenderTarget)
            this.threeRenderer.clear(true, true, true)
            this.threeRenderer.render(objectsScene, this.contactShadowCamera)
            this.threeRenderer.setRenderTarget(origRenderTarget)
            this.revertContactShadowsCustomPreparations()  
        }
        if (this.scene.getHasStaticStackableSurfaces()) {
            // Static surfaces stackables are split into a separate Threejs render layer for customized
            // shadow interaction with the surfaces/floor. Note the render order required for transparency.
            camera.layers.set(constants.STATIC_STACKABLES_THREE_NATIVE_LAYER)
            this.threeRenderer.render(objectsScene, camera)
            camera.layers.set(constants.DEFAULT_THREE_NATIVE_LAYER)
        }
        if (this.debugSettings.showShadowMap) {
            this.scene.getShadowMapDebugObj()?.render(this.threeRenderer)
        }
        if (this.debugSettings.environmentViz) {
            this.scene.getEnvMapViewer()?.render(this.threeRenderer)
        }
    }

    protected createOutlinePass(): CustomOutlinePass {
        const threeScene = this.scene?.getObjectsScene()
        const cam = this.getCamera()!
        return new CustomOutlinePass(
            new THREE.Vector2(this.width, this.height),
            threeScene,
            cam,
            [],
            null,
        )
    }
}
