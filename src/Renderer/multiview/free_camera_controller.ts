/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import { gvCurrentCamera, gvGeomModel, gvRenderLibrary } from 'Renderer/foundation/geom_app'
import { EPSILON, EPSILON_SQRD, Vector3 } from 'Renderer/geometry'
import { UserCameraController } from 'Renderer/multiview/user_camera_controller'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import { ElasticValue } from 'Renderer/multiview/elastic_value'
import type { CameraManagerSettings } from 'Renderer/multiview/camera_types'

const moveForwardKey = `KeyW`
const moveBackwardKey = `KeyS`
const moveLeftKey = `KeyA`
const moveRightKey = `KeyD`
const moveUpKey = `KeyQ`
const moveDownKey = `KeyE`

type MoveKeyCode = (typeof moveForwardKey)
  | (typeof moveBackwardKey)
  | (typeof moveLeftKey)
  | (typeof moveRightKey)
  | (typeof moveUpKey)
  | (typeof moveDownKey)

type MoveMap = {
  [key in MoveKeyCode]: boolean
}

const DEFAULT_CAMERA_FOCAL_LENGTH = 1222
const FOCUS_LENGTH_CONTROL_STIFFNESS = 0.1
const MOVEMENT_CONTROL_STIFFNESS = 0.1
const FOCUS_LENGTH_CONTROL_BOUNDS = { min: 0.2, max: 5.0 }
// Keyboard movement max speed, meters per second.
const MOVEMENT_MAX_SPEED = 3.0
// Scale coefficient to convert pointer liner move to camera orientation change.
const POINTER_MOVE_TO_CAMERA_ROTATE_SCALE = 0.002
// Scale coefficient to convert mouse wheel move to camera focus length change.
const MOUSE_WHEEL_SCALE = 3.0

const workspace = {
  euler: new THREE.Euler(0, 0, 0, 'YXZ')
}

export class FreeCameraController extends UserCameraController {
  private readonly moveSpeed = MOVEMENT_MAX_SPEED
  private readonly rotateScale = POINTER_MOVE_TO_CAMERA_ROTATE_SCALE
  private readonly wheelScale = MOUSE_WHEEL_SCALE

  private focalLengthControl: ElasticValue
  private zMoveControl = new ElasticValue(-1, 1, MOVEMENT_CONTROL_STIFFNESS)
  private xMoveControl = new ElasticValue(-1, 1, MOVEMENT_CONTROL_STIFFNESS)
  private yMoveControl = new ElasticValue(-1, 1, MOVEMENT_CONTROL_STIFFNESS)

  private localMoveVector: Vector3 = new Vector3(0, 0, 0)
  private controlsLocked = false
  private moveMap: MoveMap = {
    [moveForwardKey]: false,
    [moveBackwardKey]: false,
    [moveLeftKey]: false,
    [moveRightKey]: false,
    [moveUpKey]: false,
    [moveDownKey]: false,
  }

  constructor (camera: GeomCamera, settings: CameraManagerSettings) {
    super(camera, settings)
    let startFocalLength = DEFAULT_CAMERA_FOCAL_LENGTH
    const intrinsics = this.camera.getIntrinsics()
    if (intrinsics) {
      startFocalLength = intrinsics.focalLengthX
    }
    this.focalLengthControl = new ElasticValue(startFocalLength * FOCUS_LENGTH_CONTROL_BOUNDS.min,
      startFocalLength * FOCUS_LENGTH_CONTROL_BOUNDS.max, FOCUS_LENGTH_CONTROL_STIFFNESS)
    this.focalLengthControl.forceValue(startFocalLength)
  }

  public override stop(): void {
    if (this.controlsLocked) {
      this.unlockControls()
    }
  }

  public onPointerMove(event: PointerEvent): boolean {
    if (!this.controlsLocked) {
      return false
    }
    const camera = gvCurrentCamera()?.getThreeCamera()
    if (!camera) {
      return false
    }

    const movementX = event.movementX || 0
    const movementY = event.movementY || 0

    workspace.euler.setFromQuaternion(camera.quaternion)

    workspace.euler.y -= movementX * this.rotateScale
    workspace.euler.x -= movementY * this.rotateScale
    workspace.euler.x = Math.max(-Math.PI * 0.5, Math.min(Math.PI / 2.0, workspace.euler.x))

    camera.quaternion.setFromEuler(workspace.euler)
    camera.updateMatrixWorld()
    gvGeomModel()?.setRendererIsDirty()

    return true
  }

  public onPointerDown(event: PointerEvent): boolean {
    return false
  }

  public onPointerUp(event: PointerEvent): boolean {
    return false
  }

  public onWheelMove(event: WheelEvent): boolean {
    this.focalLengthControl.setTargetValue(this.focalLengthControl.getCurrentValue() - this.wheelScale * event.deltaY)
    return true
  }

  public onKeyDown(event: KeyboardEvent): boolean {
    const code = event.code
    if (code === 'ShiftLeft') {
      this.lockControls()
    }
    if (code in this.moveMap) {
      this.moveMap[code as MoveKeyCode] = true
      return true
    }
    return false
  }

  public onKeyUp(event: KeyboardEvent): boolean {
    const code = event.code
    if (code === 'ShiftLeft') {
      this.unlockControls()
    }
    if (code in this.moveMap) {
      this.moveMap[code as MoveKeyCode] = false
      return true
    }
    return false
  }

  tick(dt: number): void {
    this.updateMovement(dt)
    this.updateFocalLength()
  }

  private lockControls() {
    const renderer = gvRenderLibrary()?.renderer
    if (!renderer) {
      return
    }
    renderer.domElement.requestPointerLock()
    this.controlsLocked = true
  }

  private unlockControls() {
    const renderer = gvRenderLibrary()?.renderer
    if (!renderer) {
      return
    }
    renderer.domElement.ownerDocument.exitPointerLock()
    this.controlsLocked = false
  }

  private updateMovement(dt: number) {
    let xMove = 0
    let zMove = 0
    let yMove = 0
    if (this.moveMap[moveForwardKey]) { zMove -= 1 }
    if (this.moveMap[moveBackwardKey]) { zMove += 1 }
    if (this.moveMap[moveLeftKey]) { xMove -= 1 }
    if (this.moveMap[moveRightKey]) { xMove += 1 }
    if (this.moveMap[moveUpKey]) { yMove += 0.1 }
    if (this.moveMap[moveDownKey]) { yMove -= 0.1 }

    this.zMoveControl.setTargetValue(zMove)
    this.xMoveControl.setTargetValue(xMove)
    this.yMoveControl.setTargetValue(yMove)
    this.zMoveControl.update()
    this.xMoveControl.update()
    this.yMoveControl.update()

    this.localMoveVector.set(this.xMoveControl.getCurrentValue(), this.yMoveControl.getCurrentValue(),
      this.zMoveControl.getCurrentValue())
    if (this.localMoveVector.sqrdLen() < EPSILON_SQRD) {
      return
    }

    const worldVector = this.camera.directionLocalToWorld(this.localMoveVector).scale(this.moveSpeed * dt)
    const newPosition = this.camera.getLocation().plus(worldVector)
    this.camera.setLocation(newPosition)
  }

  private updateFocalLength() {
    this.focalLengthControl.update()

    const focusLength = this.focalLengthControl.getCurrentValue()
    const intrinsics = this.camera.getIntrinsics()
    if (intrinsics) {
      if (Math.abs(intrinsics.focalLengthX - focusLength) < EPSILON) {
        return 
      }
      intrinsics.focalLengthX = focusLength
      intrinsics.focalLengthY = focusLength
      this.camera.setIntrinsics(intrinsics)
      gvGeomModel()?.setRendererIsDirty()
    }
  }
}