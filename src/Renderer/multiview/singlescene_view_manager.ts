import * as THREE from 'three'
import { AssetManager } from "Renderer/assets/AssetManager";
import type { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import type { GeomBaseScene } from "Renderer/rendering/GeomBaseScene"
import { MeshScene } from "Renderer/rendering/MeshScene"
import type { InitializationFailureCallback } from 'Renderer/rendering/rendering_types'
import type { ViewerSettings } from 'Renderer/geomviewer/geom_types'
import { findAllCameras } from 'Renderer/multiview/camera_utils'
import { CameraViewFinder } from "Renderer/multiview/camera_view_finder";
import type { CameraView } from 'Renderer/multiview/camera_types'
import { AssetsList } from "Renderer/assets/AssetsList";
import { AssetSelectorOptions, AssetSelectorDeviceConfig } from "Renderer/assets/Types";
import { BaseRenderEngine } from "Renderer/rendering/BaseRenderEngine";
import { gvCameraManager, gvStartupWarden, gvGeomModel } from 'Renderer/foundation/geom_app'
import { SCENE_BUILD_COMPLETE } from 'Renderer/StartupWarden'
import { createSceneBuilder } from 'Renderer/rendering/SceneBuilderFactory'
import { WholeRoomGLTFAssets } from "Renderer/assets/WholeRoomGLTFAssets";
import { toPoint3 } from 'Renderer/geometry';
import { GeomCamera } from "./geom_camera";
import { ViewManager } from "./view_manager";

export class SingleSceneViewManager extends ViewManager {
    views: Map<string, CameraView> = new Map<string, CameraView>()
    camera?: GeomCamera
    scene?: GeomBaseScene
    assetManager?: AssetManager

    override initialize(renderEngine: BaseRenderEngine<GeomBaseScene>, 
        assetsList: AssetsList, 
        options: AssetSelectorOptions, 
        deviceConfig: AssetSelectorDeviceConfig, 
        onInitializationFailure: InitializationFailureCallback, 
        settings: ViewerSettings, 
        debugSettings: DebugSettings, 
        maxTextureSize: number): void {

        super.initialize(renderEngine, assetsList, options, deviceConfig, onInitializationFailure, 
            settings, debugSettings, maxTextureSize)

        if (!this.viewerSettings || !this.assetsList || 
            !this.renderEngine || !this.maxTextureSize || !this.debugSettings ||
            !this.onInitializationFailure) {
            return
        }

        const screenSize = new THREE.Vector2()
        this.renderEngine?.getThreeRenderer()?.getSize(screenSize)

        this.camera = new GeomCamera(0)
        const geomIntrinsics = assetsList.getCameraIntrinsics(0)
        if (geomIntrinsics) {
            // Explicitly setting the near plane to 1.0 to avoid clipping issues. 
            // This increases the depth buffer precision for the camera, which was 
            // causing rendering artifacts for rugs in thumbnail views (see GFX-3718).
            const tempView = { intrinsics: geomIntrinsics } as CameraView
            const scaledView = CameraViewFinder.scaleViewToScreenSize(tempView, screenSize)
            this.camera.init(scaledView.intrinsics, 1.0, 100.0)
        }
        this.assetManager = this.createAssetManager(0) || undefined
        if (!this.assetManager) {
            return
        }
        this.assetManager.startDownload()
        const sceneBuilder = createSceneBuilder(assetsList, this.viewerSettings, debugSettings,
            this.maxTextureSize, this.onInitializationFailure, 0)

        // Initializing cameras extrinsics then resetting camera to scaled default view early in the scene
        // building process; since some legacy features still depend on the screen projected 2d position.
        // TODO: PR-2977 can be reverted into building the scene first when GFX-3706 is resolved.
        const views = Array.from(this.views.values())
        // TODO: Extrinsics already set by base view manager, no need to set it here.
        // TODO: Also view scaling can be initialized once earlier.
        this.initCameraExtrinsics(this.assetsList as WholeRoomGLTFAssets, views)
            .then(() => {
                const currentDefaultView = this.getCurrentViewDefaults()
                if (currentDefaultView) {
                    const scaledView = CameraViewFinder.scaleViewToScreenSize(currentDefaultView, screenSize)
                    CameraViewFinder.resetCameraToView(this.camera, scaledView)
                }
            })
            .then(() => {
                if (!this.renderEngine || !this.assetsList || !this.assetManager) {
                    return null
                }
                return sceneBuilder.buildScene(this.renderEngine, this.assetsList, this.assetManager,
                    (scene) => { this.scene = scene })
            })
            .then((scene) => {
                if (!this.renderEngine || !this.camera || !scene) {
                    return
                }

                if (scene instanceof MeshScene) {
                    const bbox = new THREE.Box3()
                    const roomGroup = scene.getRoomMeshGroup()
                    if (roomGroup) {
                        bbox.expandByObject(roomGroup)
                        const boundingSphere = bbox.getBoundingSphere(new THREE.Sphere())

                        // compute maximum far clipping plane from all views.
                        const maxFar = Math.max(
                            ...Array.from(this.views.values())
                                .map((view) => {
                                    const dist = toPoint3(view.position).distanceTo({
                                        x: boundingSphere.center.x,
                                        y: boundingSphere.center.y,
                                        z: boundingSphere.center.z
                                    })
                                    return dist + boundingSphere.radius * 2
                                }))

                        // set all views to maximum far clipping plane
                        // We can't set each one to it's own far clipping plane because
                        // transitions between views will cause the far clipping plane to change
                        // which can cause clipping during the animation.
                        for (const view of this.views.values()) {
                            view.far = maxFar
                        }
                    }
                }
                const wallColor = gvGeomModel()?.retrieveWallColor()
                scene.setWallColor(wallColor)

                this.renderEngine.setScene(scene)
                this.renderEngine.setGeomCamera(this.camera)
                if (this.debugSettings) {
                    this.renderEngine.changeDebugSettings(this.debugSettings)
                }
                this.debugRenderingManager.setScene(scene.getObjectsScene())
                gvStartupWarden()?.markStartupStage(SCENE_BUILD_COMPLETE)
            })
            .then(() => {
                this.setCurrentView(`view-5`, false)
                this.scene?.refreshViewBlockingItemsVisibility(true)
            })
    }

    override cleanup(): void {
        if (this.assetManager) {
            this.assetManager.shutdown()
            delete this.assetManager
        }

        if (this.scene) {
            this.scene.dispose()
            delete this.scene
        }

        super.cleanup()
    }

    /* eslint-disable class-methods-use-this */
    private async initCameraExtrinsics(roomGltfAssets: WholeRoomGLTFAssets, views: CameraView[]) {
        return roomGltfAssets.getParsedGltfScene().then((resultGroup) => {
            if (resultGroup === null) {
                return
            }
            const cameraCount = roomGltfAssets.getCamerasCount()
            const cameraObjects: (THREE.Object3D | null)[] = new Array(cameraCount).fill(null)
            findAllCameras(resultGroup, cameraObjects)
            cameraObjects.forEach((gltfCam, index) => {
                if (gltfCam) {
                    views[index].position = { ...gltfCam.position }
                    views[index].rotation = {
                        x: gltfCam.quaternion.x,
                        y: gltfCam.quaternion.y,
                        z: gltfCam.quaternion.z,
                        w: gltfCam.quaternion.w }
                }
            })
        })
    }

    addView(label: string, camera: GeomCamera): boolean {
        if (this.views.has(label)) {
            return false;
        }
        const view = CameraViewFinder.getViewFromCamera(camera)
        this.views.set(label, view)
        return true
    }

    getCameraView(label: string): CameraView | undefined {
        return this.views.get(label)
    }

    isMultiview(): boolean { 
        return this.views.size > 1
    }

    getCurrentViewDefaults(): CameraView | undefined {
        if (this.currentViewLabel) {
            return this.views.get(this.currentViewLabel)
        }
        return undefined
    }

    getCanonicalViewDefaults(): CameraView | undefined {
        return this.views.get(this.canonicalViewLabel)
    }
    
    getAllViewLabels(): string[] {
        return Array.from(this.views.keys())
    }

    // Returns the camera for the current view or undefined if not view has been set.
    getCurrentViewCamera(): GeomCamera | undefined {
        if (this.camera) {
            return this.camera
        }
        return undefined
    }

    private resetCameraToView(label: string, view: CameraView) { 
        CameraViewFinder.resetCameraToView(this.camera, view)
        this.currentViewLabel = label
        this.nextViewLabel = null
        this.dispatchViewChangeNotification()
    }

    /* eslint-disable @typescript-eslint/no-unused-vars,no-unused-vars */
    setCurrentView(label: string, animate: boolean): boolean {
        const nextView = this.views.get(label)
        if (!nextView) {
          return false
        }
        this.nextViewLabel = label

        if (animate) {
            gvCameraManager()?.moveCameraToStaticView(nextView, true)
        } else {
            const screenSize = new THREE.Vector2(...this.scene?.getDimensions() || [])
            const scaledView = CameraViewFinder.scaleViewToScreenSize(nextView, screenSize)
            this.resetCameraToView(label, scaledView)
            if (this.viewerSettings?.featureFlags.cameraOrbitMode) {
                gvCameraManager()?.setCameraMode({ mode: `orbit` })
            }
        }
        return true
    }

    public override getTopDownViewLabel() {
        return [...this.views.keys()].find(label => ViewManager.isTopView(label))
    }

    getCurrentViewScene(): GeomBaseScene | undefined {
        if (this.scene) { 
            return this.scene
        }
        return undefined
    }

    getCurrentViewAssetManager(): AssetManager | undefined {
        if (this.assetManager) {
            return this.assetManager
        }
        return undefined
    }

    override renderToCanvas(canvas: HTMLCanvasElement, label: string): void {
        this.isRenderingThumbnail = true
        const currLabel = this.currentViewLabel

        const oldView = CameraViewFinder.getViewFromCamera(this.camera)

        // Change view and update visiblity of blocking items.
        this.setCurrentView(label, false)
        this.scene?.refreshViewBlockingItemsVisibility(true)

        this.renderEngine?.renderToCanvas(canvas)

        // Restore view and update visiblity of blocking items.
        this.resetCameraToView(currLabel, oldView)
        if (this.viewerSettings?.featureFlags.cameraOrbitMode) {
            gvCameraManager()?.setCameraMode({ mode: `orbit` })
        }
        this.scene?.refreshViewBlockingItemsVisibility(true)
        this.isRenderingThumbnail = false
    }

    override onCanvasResize(): void {
        const screenSize = this.renderEngine?.getThreeRenderer()?.getSize(new THREE.Vector2())
        if (!screenSize) {
            return
        }
        const currentViewDefaults = this.getCurrentViewDefaults()
        if (!currentViewDefaults) {
            return
        }
        const scaledView = CameraViewFinder.scaleViewToScreenSize(currentViewDefaults, screenSize)
        this.camera?.setIntrinsics(scaledView.intrinsics)
        gvCameraManager()?.onCanvasResize()
    }

    override onCameraEnterStaticView() {
        if (this.nextViewLabel) {
            this.currentViewLabel = this.nextViewLabel
            this.nextViewLabel = null
            this.dispatchViewChangeNotification()
        }
    }
}
