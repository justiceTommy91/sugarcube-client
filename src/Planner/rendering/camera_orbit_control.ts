import * as THREE from 'three'

import type { PlannerViewer } from 'Planner/planner_viewer'
import type { Camera } from 'Planner/rendering/camera'
import type { CameraView, Room } from 'Planner/room'
import { rayCastToPlane } from 'Planner/room_geometry'
import {
  ORBIT_CAMERA_STATE_ENABLED,
  ORBIT_CAMERA_STATE_DISABLED,
  ORBIT_CAMERA_STATE_DRAGGING,
  ORBIT_CAMERA_STATE_CHANGED,
} from 'Planner/planner_constants'

import { DEG_TO_RAD } from 'Renderer/geometry'
import { ElasticValue } from 'Renderer/multiview/elastic_value'
import type { PlaneType } from 'Renderer/geomviewer'
import { easeOutExpo } from 'Renderer/utils/math_utils'

const CONTROL_STIFFNESS = 0.2
const CONTROL_PIXEL_TO_ANGLE = 0.004167 // Radians / pixel.

const MIN_THETA = 0.0 * DEG_TO_RAD
const MAX_THETA = 90.0 * DEG_TO_RAD

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

export class CameraOrbitControl {
  private viewer: PlannerViewer
  private camera: Camera
  private room: Room
  private lastAnimateTime = -1
  private animationFrameHandle: number | null = null
  private isDragging = false
  private isEnabled = false
  private xControl = new ElasticValue(-Infinity, Infinity, CONTROL_STIFFNESS, 0.1)
  private yControl = new ElasticValue(-Infinity, Infinity, CONTROL_STIFFNESS, 0.1)
  private controlPosition = new THREE.Vector2(0, 0)
  private orbitCenter = new THREE.Vector3()
  private theta = 0
  private phi = 0
  private r = 0
  private minTheta = MIN_THETA
  private maxTheta = MAX_THETA

  constructor(camera: Camera, parentViewer: PlannerViewer, room: Room) {
    this.viewer = parentViewer
    this.camera = camera
    this.room = room
    this.animate = this.animate.bind(this)
    this.animate(0.0)
  }

  public shutDown() {
    if (this.animationFrameHandle) {
      cancelAnimationFrame(this.animationFrameHandle)
    }
  }

  public enable(shouldBeEnabled: boolean) {
    if (this.isEnabled === shouldBeEnabled) {
      return
    }
    this.isEnabled = shouldBeEnabled
    if (this.isEnabled) {
      this.reset()
      this.viewer.dispatchEvent({
        type: ORBIT_CAMERA_STATE_CHANGED,
        state: ORBIT_CAMERA_STATE_ENABLED,
      })
    } else {
      this.viewer.dispatchEvent({
        type: ORBIT_CAMERA_STATE_CHANGED,
        state: ORBIT_CAMERA_STATE_DISABLED,
      })
    }
  }

  public getIsEnabled() {
    return this.isEnabled
  }

  public onPointerMove(event: PointerEvent): boolean {
    if (!this.isEnabled || !this.isDragging) {
      return false
    }
    this.xControl.setTargetValue(event.clientX)
    this.yControl.setTargetValue(event.clientY)
    return true
  }

  public onPointerDown(event: PointerEvent): boolean {
    if (!this.isEnabled) {
      return false
    }
    this.startDrag(event.clientX, event.clientY)
    return true
  }

  public onPointerUp(): boolean {
    if (this.isDragging) {
      this.stopDrag()
      return true
    }
    return false
  }

  // Given a pre-computed camera view, create a new view that will look at the room
  // from the same distance, looking at the same center, but from the current relative orbital position.
  public applyCurrentAnglesToView(staticView: CameraView) {
    const ret: CameraView = {
      name: staticView.name,
      position: staticView.position.clone(),
      quaternion: staticView.quaternion.clone(),
      up: staticView.up.clone(),
      fov: staticView.fov,
    }

    const viewDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(staticView.quaternion)
    const newOrbitCenter = this.computeOrbitCenter(staticView.position, viewDirection)
    if (!newOrbitCenter) {
      return ret
    }
    const newR = staticView.position.clone().sub(newOrbitCenter).length()
    if (newR <= 0.0) {
      return ret
    }

    const x = newR * Math.cos(this.theta) * Math.cos(this.phi)
    const y = newR * Math.sin(this.theta)
    const z = newR * Math.cos(this.theta) * Math.sin(this.phi)

    const threeCamera = this.camera.getRenderCamera()
    ret.position = newOrbitCenter.clone().add(new THREE.Vector3(x, y, z))
    ret.quaternion.copy(threeCamera.quaternion)
    ret.up.copy(threeCamera.up)
    return ret
  }

  private reset() {
    const threeCamera = this.camera.getRenderCamera()
    threeCamera.up.set(0.0, 1.0, 0.0)

    this.xControl.forceValue(0.0)
    this.yControl.forceValue(0.0)
    this.controlPosition.set(0.0, 0.0)

    const cameraPostion = threeCamera.position
    const cameraViewDir = threeCamera.getWorldDirection(new THREE.Vector3())
    const orbitCenter = this.computeOrbitCenter(cameraPostion, cameraViewDir)
    if (orbitCenter) {
      this.orbitCenter.copy(orbitCenter)
    }
    const orbitalPosition = threeCamera.position.clone().sub(this.orbitCenter)
    this.r = orbitalPosition.length()
    if (this.r > 0.0) {
      this.theta = Math.asin(orbitalPosition.y / this.r)
      const horizProjectionLen = new THREE.Vector2(orbitalPosition.x, orbitalPosition.z).length()
      if (horizProjectionLen > 0.01) {
        this.phi = Math.atan2(orbitalPosition.z, orbitalPosition.x)
      } else {
        // Camera looks down vertically.
        const cameraWorldUpX = threeCamera.matrixWorld.elements[4]
        const cameraWorldUpZ = threeCamera.matrixWorld.elements[6]
        this.phi = Math.atan2(-cameraWorldUpZ, -cameraWorldUpX)
      }
      this.minTheta = MIN_THETA
      this.maxTheta = MAX_THETA
    }
  }

  private animate(timeMs: number) {
    this.animationFrameHandle = requestAnimationFrame(this.animate)
    if (this.lastAnimateTime < 0) {
      this.lastAnimateTime = timeMs
    }
    const dtSeconds = (timeMs - this.lastAnimateTime) * 0.001
    this.lastAnimateTime = timeMs

    this.tick(dtSeconds)
  }

  private tick(dtSeconds: number) {
    if (!this.isEnabled) {
      return
    }
    this.xControl.update(dtSeconds)
    this.yControl.update(dtSeconds)

    const currX = this.xControl.getCurrentValue()
    const currY = this.yControl.getCurrentValue()
    const dControlX = currX - this.controlPosition.x
    const dControlY = currY - this.controlPosition.y
    this.controlPosition.set(currX, currY)

    if (dControlX === 0.0 && dControlY === 0.0) {
      return
    }

    const threeCamera = this.camera.getRenderCamera()
    this.phi += dControlX * CONTROL_PIXEL_TO_ANGLE
    this.theta += CameraOrbitControl.applyLimitsDamping(this.theta, (dControlY * CONTROL_PIXEL_TO_ANGLE),
      this.minTheta, this.maxTheta, easeOutExpo)
    this.theta = clamp(this.theta, this.minTheta, this.maxTheta)

    const x = this.r * Math.cos(this.theta) * Math.cos(this.phi)
    const y = this.r * Math.sin(this.theta)
    const z = this.r * Math.cos(this.theta) * Math.sin(this.phi)

    threeCamera.position.copy(this.orbitCenter.clone().add(new THREE.Vector3(x, y, z)))
    threeCamera.lookAt(this.orbitCenter.x, this.orbitCenter.y, this.orbitCenter.z)
    this.camera.updateMatrices()
  }

  private computeOrbitCenter(cameraPostion: THREE.Vector3,
    cameraViewDirection: THREE.Vector3): THREE.Vector3 | undefined {
    // Construct a vertical plane, which passes through the floor centroid point,
    // and such as its line of intersection with floor is parallel to the screen.
    const centroid = this.room?.getRoomMesh()?.getFloorCentroid()
    const floorPlane = this.room?.getFloorPlane()
    const ceilingPlane = this.room?.getCeilingPlane()
    if (!centroid || !floorPlane || !ceilingPlane) {
      return undefined
    }

    // Camera view direction projected on the floor plane.
    const floorNormal = new THREE.Vector3(floorPlane.rot[2][0], floorPlane.rot[2][1], floorPlane.rot[2][2])
    const cameraViewDirOnFloor = cameraViewDirection.clone()
      .sub(floorNormal.clone().multiplyScalar(cameraViewDirection.clone().dot(floorNormal)))
    const planeNormal = cameraViewDirOnFloor.clone().negate().normalize()
    const planeD = -new THREE.Vector3(centroid.x, centroid.y, centroid.z).dot(planeNormal)
    const planeYAxis = floorNormal.clone()
    const planeXAxis = planeYAxis.clone().cross(planeNormal)

    let plane: PlaneType = {
      id: -1,
      d: planeD,
      rot: [
        [planeXAxis.x, planeXAxis.y, planeXAxis.z],
        [planeYAxis.x, planeYAxis.y, planeYAxis.z],
        [planeNormal.x, planeNormal.y, planeNormal.z],
      ],
      class: `wall`,
    }
    const ray = new THREE.Ray(cameraPostion, cameraViewDirection)
    let intersection = rayCastToPlane(ray, plane)
    // This can happen when looking at a steep angle (close to top-down, off-center, etc.).
    // try a plane parallel to the floor instead.
    if (!intersection || intersection.y < floorPlane.d || intersection.y > ceilingPlane.d) {
      const humanEyeHeight = 1.5
      plane = {
        id: -1,
        d: -(floorPlane.d + humanEyeHeight),
        rot: floorPlane.rot,
        class: `floor`,
      }
      intersection = rayCastToPlane(ray, plane)
    }
    return intersection || undefined
  }

  private static applyLimitsDamping(value: number, delta: number, min: number, max: number,
    easingFunc: (s: number) => number) {
    const totalRange = max - min
    const limit = 0.5
    // Assuming that value is always within min, max)
    const left = delta > 0 ? max - value : value - min
    const s = left / totalRange
    const adjustedDelta = delta * (s > limit ? 1.0 : easingFunc(s))
    return adjustedDelta
  }

  private startDrag(clientX: number, clientY: number) {
    this.isDragging = true
    this.xControl.forceValue(clientX)
    this.yControl.forceValue(clientY)
    this.controlPosition.set(clientX, clientY)
    this.viewer.dispatchEvent({
      type: ORBIT_CAMERA_STATE_CHANGED,
      state: ORBIT_CAMERA_STATE_DRAGGING,
    })
  }

  private stopDrag() {
    this.isDragging = false
    this.viewer.dispatchEvent({
      type: ORBIT_CAMERA_STATE_CHANGED,
      state: ORBIT_CAMERA_STATE_ENABLED,
    })
  }
}