import * as THREE from 'three'

import type { Planner } from 'Planner/planner'
import type { PlannerViewer } from 'Planner/planner_viewer'
import { Room, CameraView } from 'Planner/room'
import { Camera } from 'Planner/rendering/camera'
import { CameraAnimation } from 'Planner/rendering/camera_animation'
import { CameraOrbitControl } from 'Planner/rendering/camera_orbit_control'
import type { CameraViewName } from 'Planner/api_types'
import { CAMERA_VIEW_DOLLHOUSE_1, CAMERA_VIEW_TOPDOWN } from 'Planner/api_constants'
import { generateCameraViews } from 'Planner/camera_views'
import { DEG_TO_RAD } from 'Renderer/geometry'

const applyViewToCamera = (view: CameraView, threeCamera: THREE.PerspectiveCamera) => {
  threeCamera.position.copy(view.position)
  threeCamera.quaternion.copy(view.quaternion)
  threeCamera.up.copy(view.up)
  threeCamera.fov = view.fov
}

export class CameraManager {
  private camera: Camera
  private cameraAnimation: CameraAnimation
  private cameraControl: CameraOrbitControl | null = null
  private currentViewName: CameraViewName = CAMERA_VIEW_TOPDOWN
  private cameraViews: Map<CameraViewName, CameraView> = new Map()
  private cameraOrbitControlsAllowed = false

  constructor(planner: Planner, width: number, height: number) {
    this.camera = new Camera(width, height)
    this.cameraAnimation = new CameraAnimation(this.camera)
  }

  public initWithRoom(parentViewer: PlannerViewer, room: Room) {
    this.cameraControl = new CameraOrbitControl(this.camera, parentViewer, room)
  }

  public shutDown() {
    this.cameraAnimation.shutDown()
  }

  public getCamera() {
    return this.camera
  }

  public onPointerMove(event: PointerEvent): boolean {
    const result = this.cameraControl?.onPointerMove(event) || false
    return result
  }

  public onPointerDown(event: PointerEvent): boolean {
    return this.cameraControl?.onPointerDown(event) || false
  }

  public onPointerUp(): boolean {
    const result = this.cameraControl?.onPointerUp() || false
    return result
  }

  public refreshCurrentCameraVew(room: Room, animated: boolean) {
    this.setCameraView(room, this.currentViewName, animated)
  }

  public setTopDownView(room: Room, animated: boolean) {
    this.setCameraView(room, CAMERA_VIEW_TOPDOWN, animated)
  }

  public setDollHouseView(room: Room, animated: boolean) {
    this.setCameraView(room, CAMERA_VIEW_DOLLHOUSE_1, animated)
  }

  public setCameraView(room: Room, viewName: CameraViewName, animated: boolean) {
    this.refreshCameraViews(room)
    let view = this.cameraViews.get(viewName)
    if (view && this.cameraControl) {
      if (this.cameraControl.getIsEnabled() && this.currentViewName === viewName) {
        view = this.cameraControl.applyCurrentAnglesToView(view)
      }
      this.currentViewName = viewName
      this.applyViewToMainCamera(view, animated, room)
    }
  }

  public getCameraView(viewName: CameraViewName) {
    return this.cameraViews.get(viewName)
  }

  public setIsOrbitControlsAllowed(enable: boolean) {
    this.cameraOrbitControlsAllowed = enable
    if (!this.cameraAnimation.isRunning()) {
      this.cameraControl?.enable(this.cameraOrbitControlsAllowed)
    }
  }

  public getIsOrbitControlsAllowed() {
    return this.cameraOrbitControlsAllowed
  }

  private applyViewToMainCamera(view: CameraView, animated: boolean, room?: Room, ) {
    const threeCamera = this.camera.getRenderCamera()
    const onSwitchEnd = () => this.cameraControl?.enable(this.getIsOrbitControlsAllowed())
    if (animated && !this.isViewCloseToCurrent(view)) {
      let lookAtFrom: THREE.Vector3 | undefined
      let lookAtTo: THREE.Vector3 | undefined
      if (room) {
        const defaultDistance = 10
        const rayFrom = new THREE.Ray()
        rayFrom.origin.setFromMatrixPosition(threeCamera.matrixWorld)
        rayFrom.direction = threeCamera.getWorldDirection(rayFrom.direction)
        lookAtFrom = room.sampleScene(rayFrom)?.worldPosition
        if (!lookAtFrom) {
          lookAtFrom = rayFrom.at(defaultDistance, new THREE.Vector3())
        }

        const rayTo = new THREE.Ray()
        rayTo.origin.copy(view.position)
        rayTo.direction.set(0, 0, -1).applyQuaternion(view.quaternion)
        lookAtTo = room.sampleScene(rayTo)?.worldPosition
        if (!lookAtTo) {
          lookAtTo = rayTo.at(defaultDistance, new THREE.Vector3())
        }
      }
      this.cameraControl?.enable(false)
      this.cameraAnimation.animateTo(view, lookAtFrom, lookAtTo, onSwitchEnd)
    } else {
      applyViewToCamera(view, threeCamera)
      this.camera.updateMatrices()
      onSwitchEnd()
    }
  }

  private refreshCameraViews(room: Room) {
    // Preserve top-down view orientation after it was generated initially:
    const topDownView = this.cameraViews.get(CAMERA_VIEW_TOPDOWN)
    const topDownUpVector = topDownView?.up.clone()
    const topDownQuternion = topDownView?.quaternion.clone()

    const views = generateCameraViews(room)
    views.forEach((view) => {
      if (view.name === CAMERA_VIEW_TOPDOWN) {
        if (topDownUpVector) {
          view.up.copy(topDownUpVector)
        }
        if (topDownQuternion) {
          view.quaternion.copy(topDownQuternion)
        }
      }
      this.cameraViews.set(view.name, view)
    })
  }

  // Estimate if animation is needed when switching from current camera position/orientation to the given view.
  private isViewCloseToCurrent(view: CameraView) {
    const threeCamera = this.camera.getRenderCamera()
    const positionDiff = threeCamera.position.distanceToSquared(view.position)
    const quaternionDiff = threeCamera.quaternion.angleTo(view.quaternion)
    const fovDiffDeg = Math.abs(threeCamera.fov - view.fov)
    const upDiff = Math.abs(1.0 - threeCamera.up.dot(view.up))

    const positionTolerance = 0.01
    const angleTolerance = DEG_TO_RAD * 1.0
    const fovTolerance = 1.0
    const upTolerance = 0.01
    return positionDiff < positionTolerance &&
      quaternionDiff < angleTolerance &&
      fovDiffDeg < fovTolerance &&
      upDiff < upTolerance
  }
}