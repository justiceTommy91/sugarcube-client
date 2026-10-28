import { AssetManager } from "Renderer/assets/AssetManager"
import type { AssetsList } from "Renderer/assets/AssetsList"
import type { AssetSelectorOptions, AssetSelectorDeviceConfig } from 'Renderer/assets/Types'
import type { InitializationFailureCallback } from 'Renderer/rendering/rendering_types'
import type { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import type { ViewerSettings } from 'Renderer/geomviewer/geom_types'
import type { GeomBaseScene } from "Renderer/rendering/GeomBaseScene"
import { gvCameraManager, gvGeomModel, gvStartupWarden } from 'Renderer/foundation/geom_app'
import { SCENE_BUILD_COMPLETE } from 'Renderer/StartupWarden'
import { createSceneBuilder } from 'Renderer/rendering/SceneBuilderFactory'
import { BaseRenderEngine } from "Renderer/rendering/BaseRenderEngine"
import { GeomCamera } from 'Renderer/multiview/geom_camera'
import { LegacyRoomFreeCameraAdapter } from 'Renderer/multiview/legacy_room_mesh'
import { ImageBasedScene } from "Renderer/rendering/ImageBasedScene"
import type { CameraView } from 'Renderer/multiview/camera_types'
import { CameraViewFinder } from 'Renderer/multiview/camera_view_finder'
import { ViewManager } from "./view_manager";

export interface ViewWithScene {
  camera: GeomCamera
  cameraDefaults: CameraView
  // While view's scene is building, this promise holds the future result.
  scenePromise?: Promise<GeomBaseScene | null>
  // When view's scene is done building, this property holds the result.
  // It's here for backward compatibility with the existing code that access scene synchronously.
  scene?: GeomBaseScene
  assetManager?: AssetManager
}


//    The ViewManager holds everything that is necessary to show a particular view
// on the canvas. That includes all the cameras, assets, scenes, etc. These items
// are accessed using a view label, a string. All items that make a particular view
// are accessed with the same label.
//    ViewManager also keeps track of the canonical view, namely the view in which
// the renderer allows editing of the scene. The canonical is tracked from the
// corresponding canonical camera.
//
export class MultiSceneViewManager extends ViewManager {

  private views: Map<string, ViewWithScene>

  private discardSecondaryViews = true

  constructor() {
    super()
    this.views = new Map<string, ViewWithScene>()
  }

  public override cleanup(): void {
    this.views.forEach((value, key) => {
      this.discardView(key)
    })

    this.views.clear()

    super.cleanup()
  }

  addView(label: string, camera: GeomCamera): boolean {
    if (this.views.has(label)) {
      return false;
    }

    const view = { camera, cameraDefaults: CameraViewFinder.getViewFromCamera(camera) } 
    this.views.set(label, view);
    return true;
  }

  getCameraView(label: string): CameraView | undefined {
    return this.views.get(label)?.cameraDefaults
  }

  isMultiview(): boolean {
    return this.views.size > 1
  }

  getCurrentViewDefaults(): CameraView | undefined {
    if (this.currentViewLabel) {
      return this.views.get(this.currentViewLabel)?.cameraDefaults
    }
    return undefined
  }

  getCanonicalViewDefaults(): CameraView | undefined {
    return this.views.get(this.canonicalViewLabel)?.cameraDefaults
  }

  getAllViewLabels(): string[] {
    return Array.from(this.views.keys())
  }

  override initialize(renderEngine: BaseRenderEngine<GeomBaseScene>, assetsList: AssetsList,
    options: AssetSelectorOptions, deviceConfig: AssetSelectorDeviceConfig,
    onInitializationFailure: InitializationFailureCallback, settings: ViewerSettings,
    debugSettings: DebugSettings, maxTextureSize: number) {
    super.initialize(renderEngine, assetsList, options, deviceConfig, onInitializationFailure,
      settings, debugSettings, maxTextureSize)

    this.setCurrentView(this.canonicalViewLabel, false)

    if (this.animateCameraInLegacyRooms) {
      this.initLegacyRoomsFreeCameraSupport()
    }
  }

  // Add a scene to the view manager, under the given label. If there isn't
  // a view under the same label, or the scene is already set, the call
  // fails and returns false.
  protected setViewScene(label: string, scene: GeomBaseScene): boolean {
    const view = this.views.get(label)
    if (!view || view?.scene) {
      return false;
    }

    view.scene = scene;
    return true;
  }

  // Returns the camera for the current view or undefined if not view has been set.
  getCurrentViewCamera(): GeomCamera | undefined {
    if (this.currentViewLabel) {
      return this.views.get(this.currentViewLabel)?.camera;
    }
    return undefined;
  }

  getCameraByIndex(index: number): GeomCamera | undefined {
    // Javascript's Map is unordered and preserves the order in which elements were inserted.
    return Array.from(this.views.values())[index]?.camera
  }

  // Set the current view to the one with the given label. Returns false if the
  // view label is not valid.
  setCurrentView(label: string, animate = true): boolean {
    const currentScene = this.getCurrentViewScene()
    if (currentScene && this.currentViewLabel === label) {
      return true
    }

    const nextView = this.views.get(label)
    if (!nextView) {
      return false
    }

    this.nextViewLabel = label

    if (!nextView.scenePromise) {
      nextView.scenePromise = this.initializeView(this.nextViewLabel)
    }
    const isLegacyRoom = true
    const animateInLegacyRoom = this.animateCameraInLegacyRooms && this.legacyRoomFreeCameraAdapter?.isBuildComplete()
    const isInOrbitMode = gvCameraManager()?.getCameraState().mode === `orbit`
    const performAnimation = animate && (animateInLegacyRoom || !isLegacyRoom || isInOrbitMode)
    CameraViewFinder.resetCameraToView(nextView.camera, nextView.cameraDefaults)
    if (performAnimation) {
      gvCameraManager()?.moveCameraToStaticView(nextView.cameraDefaults)
    } else {
      this.finishSwitchingView(label)
    }
    return true
  }

  public override getTopDownViewLabel() {
    return [...this.views.keys()].find(label => ViewManager.isTopView(label))
  }

  enableSecondaryViewDiscard(enable: boolean) {
    this.discardSecondaryViews = enable
    if (this.discardSecondaryViews) {
      this.views.forEach((view, label) => {
        if (label !== this.canonicalViewLabel &&
          label !== this.getCurrentView() &&
          label !== this.nextViewLabel) {
          this.discardView(label)
        }
      })
    }
  }

  // Returns the scene for the current view or undefined if not view has been set.
  getCurrentViewScene(): GeomBaseScene | undefined {
    if (this.currentViewLabel) {
      return this.views.get(this.currentViewLabel)?.scene;
    }

    return undefined;
  }

  // Returns the assetManager for the current view or undefined if view has not been set.
  getCurrentViewAssetManager(): AssetManager | undefined {
    if (this.currentViewLabel) {
      return this.views.get(this.currentViewLabel)?.assetManager;
    }

    return undefined;
  }

  override updateDebugSettings(debugSettings: DebugSettings) {
    super.updateDebugSettings(debugSettings)
    if (this.debugSettings?.discardSecondaryViews !== undefined) {
      this.enableSecondaryViewDiscard(this.debugSettings.discardSecondaryViews)
    }
    if (this.debugSettings?.animateViewChange !== undefined) {
      this.animateCameraInLegacyRooms = this.debugSettings.animateViewChange ||
        !!this.debugSettings.enableFocus
      if (this.animateCameraInLegacyRooms && !this.legacyRoomFreeCameraAdapter) {
        this.initLegacyRoomsFreeCameraSupport()
      }
    }
  }

  override onCanvasResize(): void {
    if (!this.renderEngine) {
      return
    }
    const screenSize = this.renderEngine.getScreenSize()
    this.views.forEach((view) => { view.scene?.onCanvasResize(screenSize) })
  }

  override onCameraExitStaticView() {
    const scene = this.getCurrentViewScene()
    if (scene instanceof ImageBasedScene) {
      this.assignLegacyRoomMesh(scene)
    }
  }

  override onCameraEnterStaticView() {
    if (!this.nextViewLabel) {
      return
    }

    const nextView = this.views.get(this.nextViewLabel)
    if (nextView) {
      this.finishSwitchingView(this.nextViewLabel)
    }
  }

  private initLegacyRoomsFreeCameraSupport() {
    if (!this.assetsList || !this.options || !this.deviceConfig) {
      return
    }
    const views = Array.from(this.views.values())
    this.legacyRoomFreeCameraAdapter = new LegacyRoomFreeCameraAdapter(views, this.assetsList,
      this.options, this.deviceConfig)
  }

  private assignLegacyRoomMesh(scene: ImageBasedScene) {
    if (!this.legacyRoomFreeCameraAdapter) {
      this.initLegacyRoomsFreeCameraSupport()
    }
    if (this.legacyRoomFreeCameraAdapter) {
      return this.legacyRoomFreeCameraAdapter.getWallsMesh().then((group) => {
        if (group) {
          scene.setTexturedPolygonsObj(group)
        }
      })
    }
    return Promise.resolve()
  }

  override renderToCanvas(canvas: HTMLCanvasElement, label: string): void {
    const oldLabel = this.currentViewLabel
    const oldView = this.views.get(oldLabel)
    const view = this.views.get(label)
    if (!view || !oldView) {
      return
    }

    this.isRenderingThumbnail = true

    if (!oldView.scenePromise) {
      oldView.scenePromise = this.initializeView(oldLabel)
    }

    if (!view.scenePromise) {
      view.scenePromise = this.initializeView(label)
    }

    Promise.all([oldView.scenePromise, view.scenePromise])
      .then(([oldScene, scene]) => {
        if (oldScene && scene) {
          this.setupSceneWithView(label, scene)
          this.renderEngine?.renderToCanvas(canvas)
          this.setupSceneWithView(oldLabel, oldScene)
        }
        this.isRenderingThumbnail = false
      })
  }

  private discardView(viewLabel: string) {
    const view = this.views.get(viewLabel)
    if (!view) {
      return
    }

    if (view.assetManager) {
      view.assetManager.shutdown()
      delete view.assetManager
    }
    if (view.scene) {
      view.scene.dispose()
      delete view.scene
    }

    view.scenePromise = undefined
  }

  private setupSceneWithView(viewLabel: string, scene: GeomBaseScene) {
    const view = this.views.get(viewLabel)
    if (!view) {
      return
    }

    const currentScene = this.getCurrentViewScene()
    const frontItems = currentScene?.extractRenderItems() || []
    const stackableSurfaces = currentScene?.extractStackableSurfaces() || new Map()

    if (this.discardSecondaryViews && !this.isCurrentViewCanonical()) {
      this.discardView(this.currentViewLabel)
    }
    this.currentViewLabel = viewLabel
    this.nextViewLabel = null

    if (this.renderEngine) {
      this.renderEngine.setScene(scene)
      this.renderEngine.setGeomCamera(view.camera)
      const wallColor = gvGeomModel()?.retrieveWallColor()
      scene.setWallColor(wallColor)

      scene.insertRenderItems(frontItems, this.isMultiview())
      scene.insertStackableSurfaces(stackableSurfaces)
      frontItems.filter(item => !item.isGhostItem()).forEach(item => item.onCurrentCameraChange())
      if (this.debugSettings) {
        this.renderEngine.changeDebugSettings(this.debugSettings)
      }
      this.debugRenderingManager.setScene(scene.getObjectsScene())
    }
  }

  protected finishSwitchingView(viewLabel: string): Promise<void> {
    const view = this.views.get(viewLabel)
    if (!view || !view.scenePromise) {
      return Promise.resolve()
    }
    return view.scenePromise.then((scene) => {
      if (viewLabel !== this.nextViewLabel) {
        return
      }
      if (scene) {
        this.setupSceneWithView(viewLabel, scene)
        if (scene instanceof ImageBasedScene && this.viewerSettings?.onOffOptions.enableDebugControls) {
          this.assignLegacyRoomMesh(scene)
        }
        gvStartupWarden()?.markStartupStage(SCENE_BUILD_COMPLETE)
      }
      this.dispatchViewChangeNotification()
    })
  }

  protected initializeView(viewLabel: string): Promise<GeomBaseScene|null> {
    const view = this.views.get(viewLabel)
    if (!view) {
      return Promise.resolve(null)
    }
    if (!this.renderEngine || !this.viewerSettings || !this.debugSettings ||
      this.maxTextureSize === null || !this.onInitializationFailure || !this.assetsList) {
      return Promise.resolve(null)
    }

    const cameraIndex = view.camera.getIndex()
    if (!view.assetManager) {
      view.assetManager = this.createAssetManager(cameraIndex) || undefined
      view.assetManager?.startDownload()
    }
    if (view.assetManager) {
      const sceneBuilder = createSceneBuilder(this.assetsList, this.viewerSettings, this.debugSettings,
        this.maxTextureSize, this.onInitializationFailure, cameraIndex)
      return sceneBuilder.buildScene(this.renderEngine, this.assetsList, view.assetManager,
        (scene) => { view.scene = scene })
    }
    return Promise.resolve(null)
  }
}
