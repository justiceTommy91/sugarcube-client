/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import type { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import { CameraSequence } from 'Renderer/multiview/camera_sequence'
import type { CameraView, CameraManagerSettings } from 'Renderer/multiview/camera_types'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import type { CameraMode, CameraModeParameters, CameraState, ViewerSettings } from 'Renderer/geomviewer/geom_types'
import { CameraPath } from 'Renderer/multiview/camera_path'
import type { CameraController } from 'Renderer/multiview/camera_controller'
import { PathCameraController } from 'Renderer/multiview/path_camera_controller'
import { FreeCameraController } from 'Renderer/multiview/free_camera_controller'
import { OrbitCameraController } from 'Renderer/multiview/orbit_camera_controller'

import { GrandCentral } from 'Renderer/GrandCentral'
import { gvCurrentCamera, gvCurrentScene, gvGeomModel, gvViewManager } from 'Renderer/foundation/geom_app'
import { CameraViewFinder } from 'Renderer/multiview/camera_view_finder'
import { NOTIFY_VIEWER_STATE_UPDATE, NOTIFY_SCENE_ITEM_UPDATE } from 'Renderer/geomviewer/geom_constants'
import { ViewerStateUpdateNotification, UiEventPayload } from 'Renderer/geomviewer/geom_notifications'
import { NotificationInfo } from 'Renderer/NotificationDispatcher'
import { easeInQuad, easeOutCubic } from 'Renderer/utils/math_utils'
import { NOTIFY_FURNITURE_ITEM_MOVE_END } from 'Renderer/constants'
import { EPSILON, Point3 } from 'Renderer/geometry'
import type { RenderItem3D } from 'Renderer/model/RenderItem3D'

/**
 * Camera manager class provides top level interface and is the "entry point" to work with camera(s) in the application.
 * Internally it manages all necessary low level machinery to support it: camera path computing, camera states
 * transition/sequencing, etc.
 */
export class CameraManager {
  private orbitModeAllowed = false

  // Camera animations, and/or transitions may contain multiple consecutive camera movements/controllers.
  private currentSequence: CameraSequence | null = null
  private currentMode: CameraMode = `default`
  private settings: CameraManagerSettings

  private baseFocalLengthX = 0; 
  private baseFocalLengthY = 0;

  private focusedItem: RenderItem3D | null = null
  private focusedItemLastPosition: Point3 | null = null
  private focusedPt: THREE.Vector3 | null = null

  private isInLegacyRoom = false

  constructor(debugSettings: DebugSettings, viewerSettings: ViewerSettings, isInLegacyRoom: boolean) {
    this.onFurnitureItemMoveFinish = this.onFurnitureItemMoveFinish.bind(this)
    this.onSceneItemUpdate = this.onSceneItemUpdate.bind(this)
    this.onOrbitMoveStart = this.onOrbitMoveStart.bind(this)
    GrandCentral.getDispatcher().addObserver(NOTIFY_FURNITURE_ITEM_MOVE_END, this.onFurnitureItemMoveFinish)
    GrandCentral.getDispatcher().addObserver(NOTIFY_SCENE_ITEM_UPDATE, this.onSceneItemUpdate)
    GrandCentral.getDispatcher().addObserver(NOTIFY_VIEWER_STATE_UPDATE, this.onOrbitMoveStart)

    this.isInLegacyRoom = isInLegacyRoom
    this.orbitModeAllowed = !!viewerSettings.featureFlags.cameraOrbitMode && !this.isInLegacyRoom
    this.onCameraEnterStaticView = this.onCameraEnterStaticView.bind(this)
    this.onCameraExitStaticView = this.onCameraExitStaticView.bind(this)
    this.onCameraApplyFocusMode = this.onCameraApplyFocusMode.bind(this)
    this.settings = {
      orbitMinElevationDeg: debugSettings.orbitCameraMinElevation,
      orbitMaxElevationDeg: debugSettings.orbitCameraMaxElevation,
      orbitWheelDolly: debugSettings.orbitCameraMouseWheelDolly,
    }
  }

  public applySettings(debugSettings: DebugSettings) {
    this.settings = {
      orbitMinElevationDeg: debugSettings.orbitCameraMinElevation,
      orbitMaxElevationDeg: debugSettings.orbitCameraMaxElevation,
      orbitWheelDolly: debugSettings.orbitCameraMouseWheelDolly,
    }
    if (this.currentSequence) {
      this.currentSequence.applySettings(this.settings)
    }
  }

  public cleanup() {
    GrandCentral.getDispatcher().removeObserver(this.onFurnitureItemMoveFinish)
    GrandCentral.getDispatcher().removeObserver(this.onSceneItemUpdate)
    GrandCentral.getDispatcher().removeObserver(this.onOrbitMoveStart)
    if (this.currentSequence) {
      this.currentSequence.stop()
      this.currentSequence = null
    }
  }

  public moveCameraToStaticView(view: CameraView, scaleToScreenSize = false) {
    const camera = this.getCurrentCamera()
    if (!camera) {
      return
    }
    const currentView = CameraViewFinder.getViewFromCamera(camera)

    const screenSize = new THREE.Vector2(...gvCurrentScene()?.getDimensions() || [])
    const targetView = scaleToScreenSize ? CameraViewFinder.scaleViewToScreenSize(view, screenSize) : view
    const path = CameraPath.computePath(currentView, targetView, this.focusedPt, 2.0)
    if (!path || !path.getDuration()) {
      return
    }

    let easeFunction = easeOutCubic
    if (this.focusedPt) { 
      // if we have an orbit point, we are in focused mode and want to ease-in 
      // instead of ease-out. This gives the illusion we are slowly stepping away 
      // from the focused item.
      easeFunction = easeInQuad
    }

    this.currentMode = `default`
    this.setSequence(new CameraSequence([
      new PathCameraController(camera, this.settings, path, easeFunction)
    ], (didFinish: boolean) => {
      if (didFinish) {
        this.baseFocalLengthX = targetView.intrinsics.focalLengthX
        this.baseFocalLengthY = targetView.intrinsics.focalLengthY
        gvGeomModel()?.setRendererIsDirty()
        this.onCameraEnterStaticView()

        if (this.orbitModeAllowed) {
          if (this.isInLegacyRoom) {
            // Multiscene view manager always switches cameras in a promise,
            // and here they're not switched yet.
            queueMicrotask(() => this.setCameraMode({ mode: `orbit` }))
          }
          this.setCameraMode({ mode: `orbit` })
        }
      }
    }))
    this.onCameraExitStaticView()
  }

  public getCameraState(): CameraState {
    const currentControler = this.currentSequence?.getCurrentController()
    if (this.currentMode === 'orbit' || (currentControler instanceof OrbitCameraController)) {
      let minDollyDistance = 0.0
      let maxDollyDistance = 0.0
      let currentDollyDistance = 0.0
      if (currentControler instanceof OrbitCameraController) {
        const dollyState = currentControler.getDollyState()
        minDollyDistance = dollyState.min
        maxDollyDistance = dollyState.max
        currentDollyDistance = dollyState.current
      }
      return {
        mode: `orbit`,
        minDollyDistance,
        maxDollyDistance,
        currentDollyDistance,
        orbitModeAllowed: this.orbitModeAllowed,
      }
    }
    return {
      mode: this.currentMode,
      orbitModeAllowed: this.orbitModeAllowed,
    }
  }

  public isCameraStatic(): boolean {
    return this.currentSequence === null
  }

  public isFocused(item: RenderItem3D | null): boolean {
    return item === this.focusedItem
  }

  public clearFocusedItem(item: RenderItem3D | null) {
    if (this.focusedItem === item) {
      this.focusedItem = null
      this.focusedItemLastPosition = null
      this.focusedPt = null
      return true
    }
    return false
  }

  public setCameraMode(parammeters: CameraModeParameters): boolean {
    let switched = false
    switch(parammeters.mode) {
      case 'default':
        if (this.currentMode !== 'default') {
          this.moveToCurrentStaticView()
          switched = true
        }
        break
      case 'focused':
        if (parammeters.itemId) {
          this.focusOnItem(parammeters.itemId)
          switched = true
        }
        break
      case 'free':
        if (this.currentMode !== 'free') {
          this.startFreeView()
          switched = true
        }
        break
      case 'orbit':
        if (this.currentMode !== 'orbit') {
          this.startOrbitView()
          switched = true
        }
        break
      default:
        break
    }
    if (parammeters.mode !== 'focused') {
      this.clearFocusedItem(this.focusedItem)
    }
    if (switched) {
      this.currentMode = parammeters.mode
    }
    return switched
  }

  public setOrbitModeAllowed(allowed: boolean) {
    this.orbitModeAllowed = allowed
  }

  public setCameraDollyDistance(value: number) {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler instanceof OrbitCameraController) {
      currentControler.setCameraDollyDistance(value)
    }
  }

  public setLeftButtonPanningEnabled(enable: boolean) {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler instanceof OrbitCameraController) {
      currentControler.setLeftButtonPanningEnabled(enable)
    }
  }

  public zoom(factor: number) {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler instanceof OrbitCameraController) {
      currentControler.moveCameraDollyRelative(factor)
    } else {
      const view = gvViewManager()?.getCurrentViewDefaults()
      const camera = this.getCurrentCamera()
      if (camera && view) {
        this.baseFocalLengthX = this.baseFocalLengthX > 0 ? this.baseFocalLengthX : view.intrinsics.focalLengthX
        this.baseFocalLengthY = this.baseFocalLengthY > 0 ? this.baseFocalLengthY : view.intrinsics.focalLengthY
        const fx = this.baseFocalLengthX * factor
        const fy = this.baseFocalLengthY * factor
        const intrinsics = { ...view.intrinsics, focalLengthX: fx, focalLengthY: fy }
        camera.setIntrinsics(intrinsics)
        if (this.currentMode === `default`) {
          this.onCameraEnterStaticView()
        }
      }
    }
  }

  private focusOnItem(itemId: string) {
    const camera = this.getCurrentCamera()
    const renderItem = gvCurrentScene()?.getRenderItem(itemId)
    if (!camera || !renderItem) {
      this.clearFocusedItem(this.focusedItem)
      return
    }

    this.focusedItem = renderItem
    this.focusedItemLastPosition = new Point3(0.0, 0.0, 0.0).copy(this.focusedItem.getPosAbsolute())

    // Keep the current view when we already have a focused item. This helps to 
    // avoid big camera jumps when we focus on a new item.
    const targetView = CameraViewFinder.getFocusedViewOnItem(renderItem, camera, 
      this.focusedPt !== null, true)
    const pos = renderItem.getWorldPosition()
    this.focusedPt = new THREE.Vector3(pos.x, pos.y, pos.z)
    this.approachRenderItem(targetView, renderItem)
  }

  // Follow the currently focused item after it was moved, maintaining the relative view.
  private refocusOnCurrentItem() {
    const camera = this.getCurrentCamera()
    if (!this.focusedItem || !camera || !this.focusedItemLastPosition) {
      return
    }
    const currentView = CameraViewFinder.getViewFromCamera(camera)
    const itemPosition = this.focusedItem.getPosAbsolute()
    const positionDiff = this.focusedItemLastPosition.clone().minus(itemPosition)
    const targetView = { ...currentView }
    targetView.position.x -= positionDiff.dx
    targetView.position.y -= positionDiff.dy
    targetView.position.z -= positionDiff.dz
    this.approachRenderItem(targetView, this.focusedItem)
  }

  private approachRenderItem(targetView: CameraView, renderItem: RenderItem3D) {
    const camera = this.getCurrentCamera()
    if (!camera) {
      return
    }

    const currentView = CameraViewFinder.getViewFromCamera(camera)
    const path = CameraPath.computePath(currentView, targetView, this.focusedPt, 2.0)
    if (!path || !path.getDuration()) {
      return
    }
    this.baseFocalLengthX = targetView.intrinsics.focalLengthX
    this.baseFocalLengthY = targetView.intrinsics.focalLengthY
    const controllers: CameraController[] = [
      new PathCameraController(camera, this.settings, path),
    ]
    if (this.orbitModeAllowed) {
      controllers.push(new OrbitCameraController(camera, this.settings, renderItem))
    }
    const sequence = new CameraSequence(controllers, undefined, [() => {
      gvGeomModel()?.setRendererIsDirty()
      this.onCameraApplyFocusMode()
    }])
    this.setSequence(sequence)
    this.onCameraExitStaticView()
  }

  private startFreeView() {
    const camera = this.getCurrentCamera()
    if (!camera) {
      return
    }

    this.setSequence(new CameraSequence([
      new FreeCameraController(camera, this.settings)
    ]))
    this.onCameraExitStaticView()
  }

  private startOrbitView() {
    const camera = this.getCurrentCamera()
    if (!camera) {
      return
    }
    this.setSequence(new CameraSequence([
      new OrbitCameraController(camera, this.settings)
    ]))
  }

  // Return from a special camera mode (free camera, focused view, etc) back to the current static view.
  private moveToCurrentStaticView() {
    const view = gvViewManager()?.getCurrentViewDefaults()
    if (!view) {
      return
    }
    this.moveCameraToStaticView(view, true)
  }

  private setSequence(sequence: CameraSequence) {
    if (this.currentSequence) {
      this.currentSequence.stop()
      this.currentSequence = null
    }
    this.currentSequence = sequence
    this.currentSequence.start()
  }

  public onPointerMove(event: PointerEvent): boolean {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler?.onPointerMove) {
      return currentControler.onPointerMove(event)
    }
    return false
  }

  public onPointerDown(event: PointerEvent): boolean {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler?.onPointerDown) {
      return currentControler.onPointerDown(event)
    }
    return false
  }

  public onPointerUp(event: PointerEvent): boolean {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler?.onPointerUp) {
      return currentControler.onPointerUp(event)
    }
    return false
  }

  public onPointerLeave(): boolean {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler?.onPointerLeave) {
      return currentControler.onPointerLeave()
    }
    return false
  }

  public onPointerOver(event: PointerEvent): boolean {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler?.onPointerOver) {
      return currentControler.onPointerOver(event)
    }
    return false
  }

  public onWheelMove(event: WheelEvent): boolean {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler?.onWheelMove) {
      return currentControler.onWheelMove(event)
    }
    return false
  }

  public onKeyDown(event: KeyboardEvent): boolean {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler?.onKeyDown) {
      return currentControler.onKeyDown(event)
    }
    return false
  }

  public onKeyUp(event: KeyboardEvent): boolean {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler?.onKeyUp) {
      return currentControler.onKeyUp(event)
    }
    return false
  }

  public onCanvasResize(): boolean {
    const currentControler = this.currentSequence?.getCurrentController()
    if (currentControler?.onCanvasResize) {
      return currentControler.onCanvasResize()
    }
    return false
  }

  private getCurrentCamera(): GeomCamera | undefined {
    // Placeholder for now. In multi camera setup, this method should return the camera that currently
    // renders to screen.
    return gvCurrentCamera()
  }

  private onCameraEnterStaticView() {
    this.currentSequence = null
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: { stateInfo: `CameraEnterStaticView` }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification)
  }

  private onCameraExitStaticView() {
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: { stateInfo: `CameraExitStaticView` }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification)
  }

  private onCameraApplyFocusMode() {
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: { stateInfo: `FocusTransitionFinished` }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification)
  }

  private onSceneItemUpdate(info: NotificationInfo) {
    // Scene item updates happen too often, we're interested only
    // in those when a stackable has changed a surface.
    if (info.what === NOTIFY_SCENE_ITEM_UPDATE && info.payload) {
      const payload = info.payload as UiEventPayload
      if (payload.stateInfo !== 'EndPlacementModeWithItem') {
        return
      }
    }
    this.onFurnitureItemMoveFinish()
  }

  private onFurnitureItemMoveFinish() {
    if (!this.focusedItem || !this.focusedItemLastPosition || this.currentMode !== 'focused') {
      return
    }
    const newPosition = this.focusedItem.getWorldPosition()
    const distanceSqTreshold = EPSILON
    if(this.focusedItemLastPosition.distanceToSq(newPosition) > distanceSqTreshold) {
      this.refocusOnCurrentItem()
      this.focusedItemLastPosition.copy(newPosition)
    }
  }

  private onOrbitMoveStart(info: NotificationInfo) {
    const state = info as ViewerStateUpdateNotification
    const startedPanning = state.payload.stateInfo === 'OrbitMoveStart' && state.payload.movement === 'pan'
    if (startedPanning && this.currentMode === 'focused') {
      this.currentMode = `default`
      this.clearFocusedItem(this.focusedItem)
    }
  }
}
