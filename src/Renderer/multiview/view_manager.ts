import { AssetManager } from "Renderer/assets/AssetManager"
import type { AssetsList } from "Renderer/assets/AssetsList"
import type { AssetSelectorOptions, AssetSelectorDeviceConfig } from 'Renderer/assets/Types'
import * as constants from 'Renderer/constants'
import { GrandCentral } from 'Renderer/GrandCentral'
import type { InitializationFailureCallback } from 'Renderer/rendering/rendering_types'
import type { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import type { ViewerSettings } from 'Renderer/geomviewer/geom_types'
import type { GeomBaseScene } from "Renderer/rendering/GeomBaseScene"
import { NOTIFY_VIEWER_STATE_UPDATE } from 'Renderer/geomviewer/geom_constants'
import { NotificationInfo, ViewerStateUpdateNotification } from "Renderer/geomviewer/geom_notifications"
import { BaseRenderEngine } from "Renderer/rendering/BaseRenderEngine"
import type { CameraView } from 'Renderer/multiview/camera_types'
import { GeomCamera } from 'Renderer/multiview/geom_camera'
import { LegacyRoomFreeCameraAdapter } from 'Renderer/multiview/legacy_room_mesh'
import { DebugRenderingManager } from "Renderer/rendering/DebugRenderingManager"

//    The ViewManager holds everything that is necessary to show a particular view
// on the canvas. That includes all the cameras, assets, scenes, etc. These items
// are accessed using a view label, a string. All items that make a particular view
// are accessed with the same label.
//    ViewManager also keeps track of the canonical view, namely the view in which
// the renderer allows editing of the scene. The canonical is tracked from the
// corresponding canonical camera.
//
export abstract class ViewManager {
  protected animateCameraInLegacyRooms = false

  protected canonicalViewLabel = `mainView`

  protected currentViewLabel: string;

  protected nextViewLabel: string | null = null;

  protected assetsList: AssetsList | null = null

  protected renderEngine: BaseRenderEngine<GeomBaseScene> | null = null

  protected options: AssetSelectorOptions | null = null

  protected deviceConfig: AssetSelectorDeviceConfig | null = null

  protected onInitializationFailure: InitializationFailureCallback | null = null

  protected viewerSettings: ViewerSettings | null = null

  protected debugSettings: DebugSettings | null = null

  protected maxTextureSize: number | null = null

  protected legacyRoomFreeCameraAdapter: LegacyRoomFreeCameraAdapter | null = null

  protected isRenderingThumbnail = false

  protected debugRenderingManager: DebugRenderingManager

  constructor() {
    this.currentViewLabel = this.canonicalViewLabel
    this.onCameraStateChange = this.onCameraStateChange.bind(this)
    this.debugRenderingManager = new DebugRenderingManager()
  }

  initialize(renderEngine: BaseRenderEngine<GeomBaseScene>, assetsList: AssetsList, options: AssetSelectorOptions,
    deviceConfig: AssetSelectorDeviceConfig, onInitializationFailure: InitializationFailureCallback,
    settings: ViewerSettings, debugSettings: DebugSettings, maxTextureSize: number) {

    this.renderEngine = renderEngine
    this.assetsList = assetsList
    this.options = options
    this.deviceConfig = deviceConfig
    this.onInitializationFailure = onInitializationFailure
    this.viewerSettings = settings
    this.debugSettings = debugSettings
    this.maxTextureSize = maxTextureSize

    GrandCentral.getDispatcher().addObserver(NOTIFY_VIEWER_STATE_UPDATE, this.onCameraStateChange)

    const camerasCount = this.assetsList.getCamerasCount()
    for (let i = 0; i < camerasCount; i += 1) {
      const geomIntrinsics = this.assetsList.getCameraIntrinsics(i)
      const geomExtrinsics = this.assetsList.getCameraExtrinsics(i)
      if (geomIntrinsics && geomExtrinsics) {
        const camera = new GeomCamera(i)
        camera.init(geomIntrinsics)
        camera.setLocation(geomExtrinsics.position)
        camera.setRotation(geomExtrinsics.rotation)

        // Add/set per view wall color pin markers to the camera.
        camera.setMarkers(this.assetsList.getCameraMarkers(i))

        const viewName = i === 0 ? this.canonicalViewLabel : `view-${i}`
        this.addView(viewName, camera)
      }
    }
  }

  protected createAssetManager(cameraIndex: number) {
    if (!this.assetsList || !this.options || !this.deviceConfig || !this.onInitializationFailure) {
      return undefined
    }
    const assetManager = new AssetManager(
      this.assetsList,
      cameraIndex,
      this.options,
      this.deviceConfig,
      GrandCentral.getDispatcher(),
      this.onInitializationFailure,
    )
    assetManager.setEquirectAlternateUrl(constants.ALTERNATE_ENV_MAP_URL)
    return assetManager
  }

  cleanup() {
    if (this.legacyRoomFreeCameraAdapter) {
      this.legacyRoomFreeCameraAdapter.cleanup()
      this.legacyRoomFreeCameraAdapter = null
    }

    this.renderEngine = null

    GrandCentral.getDispatcher().removeObserver(this.onCameraStateChange)
  }

  // Add a view to the view manager, under the given label. If the view camera is
  // canonical, the label is taken as a canonical view label. If there is already
  // a view under the same label, the call fails and returns false.
  abstract addView(label: string, camera: GeomCamera): boolean

  // Set the current view to the one with the given label. Returns false if the
  // view label is not valid.
  abstract setCurrentView(label: string, animate: boolean): boolean
  abstract getCameraView(label: string): CameraView | undefined

  abstract renderToCanvas(canvas: HTMLCanvasElement, label: string): void
  abstract isMultiview(): boolean 

  // Set the current view to the canonical view. Returns false if there is no
  // defined canonical view.
  setCanonicalView(): boolean {
    return this.setCurrentView(this.canonicalViewLabel, true);
  }

  // Returns whether the current view is canonical.
  isCurrentViewCanonical(): boolean {
    return !!this.currentViewLabel && (this.currentViewLabel === this.canonicalViewLabel);
  }

  // Returns the camera for the current view or undefined if not view has been set.
  abstract getCurrentViewCamera(): GeomCamera | undefined

  abstract getCurrentViewDefaults(): CameraView | undefined

  abstract getCanonicalViewDefaults(): CameraView | undefined

  abstract getTopDownViewLabel(): string | undefined

  getRenderEngine() {
    return this.renderEngine
  }

  getCurrentView() {
    return this.currentViewLabel
  }

  // TODO: Don't use this setter! This is a hacky workaround for problem
  // that will soon be fixed; hence this setter will be removed.
  setCurrentViewLabel(label: string) {
    this.currentViewLabel = label
  }

  abstract getAllViewLabels(): string[]

  getCanonicalViewLabel(): string {
    return this.canonicalViewLabel;
  }

  // Currently using the view numbering to determine since they're constant.
  // Views are numbered as 4, 5, 6 that translates to top, dollhouse 1, 2 views.
  public getIsDollhouseView(): boolean {
    return ViewManager.isDollhouse(this.nextViewLabel || this.currentViewLabel)
  }

  public static isDollhouse(viewLabel: string): boolean {
    return ['5', '6'].some(v => viewLabel.includes(v))
  }

  public getIsTopView(): boolean {
    return ViewManager.isTopView(this.nextViewLabel || this.currentViewLabel)
  }

  public static isTopView(viewLabel: string): boolean {
    return ['4'].some(v => (viewLabel).includes(v))
  }

  // Returns the scene for the current view or undefined if not view has been set.
  abstract getCurrentViewScene(): GeomBaseScene | undefined

  // Returns the assetManager for the current view or undefined if view has not been set.
  abstract getCurrentViewAssetManager(): AssetManager | undefined

  protected updateDebugSettings(debugSettings: DebugSettings): void {
    this.debugSettings = debugSettings
  }

  // Returns a copy of the current settings objects
  public getCurrentSettings() {
    return { 
      debugSettings: this.debugSettings ? { ...this.debugSettings } : undefined,
      viewerSettings: this.viewerSettings ? { ...this.viewerSettings } : undefined
    }
  }

  public getDebugRenderer() {
    return this.debugRenderingManager
  }

  abstract onCanvasResize(): void 

  private onCameraStateChange(info: NotificationInfo) {
    const state = info as ViewerStateUpdateNotification
    if (state.payload.stateInfo === 'CameraExitStaticView') {
      this.onCameraExitStaticView()
    } else if (state.payload.stateInfo === 'CameraEnterStaticView') {
      this.onCameraEnterStaticView()
    }
  }

  /* eslint-disable class-methods-use-this */
  protected onCameraExitStaticView(): void {
  }

  /* eslint-disable class-methods-use-this */
  protected onCameraEnterStaticView(): void {
  }

  protected dispatchViewChangeNotification() {
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: {
        stateInfo: `ViewChangeEnd`,
        camera: this.getCurrentViewCamera(),
        source: `ViewManager`,
        isRenderingThumbnail: this.isRenderingThumbnail,
      }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification)
  }
}
