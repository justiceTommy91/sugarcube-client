/* eslint-disable i18next/no-literal-string */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as THREE from 'three'

import { gvCurrentScene, gvGeomModel, gvViewManager } from 'Renderer/foundation/geom_app'
import { Point3, Point2, Vector3, DEG_TO_RAD, Vector2, EPSILON, Point3Pod, toPoint3 } from 'Renderer/geometry'
import { UserCameraController } from 'Renderer/multiview/user_camera_controller'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import { ElasticValue } from 'Renderer/multiview/elastic_value'
import {
  rayCastToPlane,
  getFloorPolygonCentroid,
  getFloorPlane,
  segment2DIntersectFloorEdge,
  isPointInsideFloorPolygon,
  closestPointOnFloorEdge,
  getCeilingPlane,
} from 'Renderer/positioning/positioning_utilities'
import { Ray } from 'Renderer/positioning/positioning_types'
import type { PlaneType } from 'Renderer/geomviewer/geom_types'
import { easeOutExpo } from 'Renderer/utils/math_utils'
import { getRelXY } from 'Renderer/inputhandler/input_utils'
import { RenderItem3D } from 'Renderer/model/RenderItem3D'
import { GrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_VIEWER_STATE_UPDATE } from 'Renderer/geomviewer/geom_constants'
import { ViewerStateUpdateNotification } from 'Renderer/geomviewer/geom_notifications'
import type { CameraManagerSettings } from 'Renderer/multiview/camera_types'
import  { getBrowserScrollScale } from 'utils/browser'

const ORBIT_CONTROL_STIFFNESS = 0.2
const CONTROL_PIXEL_TO_ORBIT_ANGLE = 0.004167 // Radians per pixel.

const PAN_CONTROL_STIFFNESS = 0.2
const MIN_PAN_CONTROL_SCALE = 0.004167
const MAX_PAN_CONTROL_SCALE = 0.0125

const MOUSE_WHEEL_SCALE = 0.025
const WHEEL_CONTROL_STIFFNESS = 0.1
const MOUSE_DELTA_CAP = 10.0

const MIN_POSSIBLE_THETA = 0.0 * DEG_TO_RAD
const MAX_POSSIBLE_THETA = 89.9 * DEG_TO_RAD
const DEFAULT_MIN_FOCAL_LEN = 1500

const MIN_POSSIBLE_R = 0.01
const MAX_POSSIBLE_R = 25.0

const MIDDLE_BUTTON = 1
const RIGHT_BUTTON = 2

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

export class OrbitCameraController extends UserCameraController {
  private isDragRotating = false
  private isDragPanning = false
  private wasMoving = false

  private enableWheelDolly = false
  private enableLeftButtonPanning = false

  private xRotateControl = new ElasticValue(-Infinity, Infinity, ORBIT_CONTROL_STIFFNESS, 0.1)
  private yRotateControl = new ElasticValue(-Infinity, Infinity, ORBIT_CONTROL_STIFFNESS, 0.1)
  private rotateControlPosition = new Point2(0, 0)

  private xPanControl = new ElasticValue(-Infinity, Infinity, PAN_CONTROL_STIFFNESS, 0.1)
  private yPanControl = new ElasticValue(-Infinity, Infinity, PAN_CONTROL_STIFFNESS, 0.1)
  private panControlPosition = new Point2(0, 0)

  private wheelControl = new ElasticValue(MIN_POSSIBLE_R, MAX_POSSIBLE_R, WHEEL_CONTROL_STIFFNESS)
  private centerItem: RenderItem3D | null = null
  private orbitCenter = new Point3(0, 0, 0)
  private orbitAxisQuat = new THREE.Quaternion()
  private orbitAxisQuatInv = new THREE.Quaternion()

  private theta = 0
  private phi = 0
  private startingR = 0 // Radius value when controller started, used for relative changes.
  private startingFocalLength = 0 // Focal length value when controller started, used for relative changes.
  private r = 0

  private minR = MIN_POSSIBLE_R
  private maxR = MAX_POSSIBLE_R
  private minTheta = MIN_POSSIBLE_THETA
  private maxTheta = MAX_POSSIBLE_THETA

  private autoFocalLength = true
  private minFocalLength = DEFAULT_MIN_FOCAL_LEN
  private orbitInitialized = false

  constructor (camera: GeomCamera, settings: CameraManagerSettings, centerItem?: RenderItem3D) {
    super(camera, settings)
    if (centerItem) {
      this.centerItem = centerItem
    }
    this.applySettings(settings)
  }

  public override applySettings(settings: CameraManagerSettings) {
    this.minTheta = settings.orbitMinElevationDeg !== undefined
      ? settings.orbitMinElevationDeg * DEG_TO_RAD
      : MIN_POSSIBLE_THETA
    this.minTheta = clamp(this.minTheta, MIN_POSSIBLE_THETA, this.minTheta)
    this.maxTheta = settings.orbitMaxElevationDeg !== undefined
      ? settings.orbitMaxElevationDeg * DEG_TO_RAD
      : MAX_POSSIBLE_THETA
    this.maxTheta = clamp(this.maxTheta, this.maxTheta, MAX_POSSIBLE_THETA)
    this.enableWheelDolly = settings.orbitWheelDolly !== undefined
      ? settings.orbitWheelDolly
      : false
    if (this.isActive) {
      this.updateCamera()
    }
  }

  public setLeftButtonPanningEnabled(enable: boolean) {
    this.enableLeftButtonPanning = enable
  }

  public override start(): void {
    super.start()
    this.orbitInitialized = false
    if (this.tryInitializeOrbit()) {
      OrbitCameraController.sendStartNotification()
    }
  }

  private tryInitializeOrbit(): boolean {
    const threeCamera = this.camera.getThreeCamera()
    if (!threeCamera) {
      return false
    }
    threeCamera.up.set(0.0, 1.0, 0.0)

    const centroid = this.centerItem ? this.centerItem.getWorldPosition() : getFloorPolygonCentroid()
    if (!centroid) {
      return false
    }
    const orbitCenter = OrbitCameraController.computeOrbitCenter(this.camera, centroid)
    if (orbitCenter) {
      this.orbitCenter.copy(orbitCenter)
    }
    this.resetPolarPosition()
    this.orbitInitialized = true
    return true
  }

  private resetPolarPosition() {
    const threeCamera = this.camera.getThreeCamera()
    if (!threeCamera) {
      return
    }
    const floorPlane = getFloorPlane()
    if (floorPlane) {
      const orbitAxis = new THREE.Vector3(floorPlane.rot[2][0], floorPlane.rot[2][1], floorPlane.rot[2][2])
      threeCamera.up.set(orbitAxis.x, orbitAxis.y, orbitAxis.z)
      const yUp   = new THREE.Vector3(0, 1, 0)
      this.orbitAxisQuat.setFromUnitVectors(yUp, orbitAxis)
      this.orbitAxisQuatInv = this.orbitAxisQuat.clone().invert()
    }
    const orbitalPosition = this.camera.getLocation().minus(this.orbitCenter)
    const localOrbitPosition = new Vector3(orbitalPosition.dx, orbitalPosition.dy, orbitalPosition.dz)
        .applyQuaternion(this.orbitAxisQuatInv)
    this.r = localOrbitPosition.len()

    let viewResizeScale = 1
    const currentFocalLength = this.camera.getIntrinsics()?.focalLengthX || 1
    const currentDefaultFocalLength = gvViewManager()?.getCurrentViewDefaults()?.intrinsics.focalLengthX || 1
    if (currentFocalLength && currentDefaultFocalLength) {
      viewResizeScale = currentFocalLength / currentDefaultFocalLength
    }

    this.minR = MIN_POSSIBLE_R * viewResizeScale
    this.maxR = Math.max(this.r, 
      (OrbitCameraController.computeMaxRForScene(this.camera) || MAX_POSSIBLE_R) * viewResizeScale)
    if (this.centerItem) {
      const bboxSize = this.centerItem.getBbox().getSize(new THREE.Vector3())
      // Distance from floor point (item's position) to one of its top corners.
      const maxDistance = Math.sqrt((bboxSize.x * 0.5) ** 2 + (bboxSize.z * 0.5) ** 2 + bboxSize.y ** 2)
      const margin = 0.25
      this.minR = Math.max(maxDistance + margin, MIN_POSSIBLE_R)
    }
    this.wheelControl.setLimts(this.minR, this.maxR)

    this.startingR = this.r
    this.startingFocalLength = currentFocalLength
    this.minFocalLength = DEFAULT_MIN_FOCAL_LEN * viewResizeScale
    if (this.r > 0.0) {
      this.theta = Math.asin(localOrbitPosition.dy / this.r)
      const horizProjectionLen = new Vector2(localOrbitPosition.dx, localOrbitPosition.dz).len()
      if (horizProjectionLen > 0.01) {
        this.phi = Math.atan2(localOrbitPosition.dz, localOrbitPosition.dx)
      } else {
        // Camera looks down vertically.
        const cameraUpVector = new Vector3(threeCamera.matrixWorld.elements[4],
          threeCamera.matrixWorld.elements[5], threeCamera.matrixWorld.elements[6])
        const camUpLocal = cameraUpVector.applyQuaternion(this.orbitAxisQuatInv)
        this.phi = Math.atan2(-camUpLocal.dz, -camUpLocal.dx)
      }
      this.wheelControl.forceValue(this.r)
    }
  }

  public onCanvasResize() {
    const currentIntrinsics = this.camera.getIntrinsics()
    const currentViewDefaults = gvViewManager()?.getCurrentViewDefaults()
    if (!currentIntrinsics || !currentViewDefaults) {
      return false
    }
    const currentFocalLength = currentIntrinsics.focalLengthX
    const viewDefaultFocalLength = currentViewDefaults.intrinsics.focalLengthX
    const viewResizeScale = currentFocalLength / viewDefaultFocalLength

    const initialCameraPosition = toPoint3(currentViewDefaults.position)
    const orbitalPosition = initialCameraPosition.minus(this.orbitCenter)
    const localOrbitPosition = new Vector3(orbitalPosition.dx, orbitalPosition.dy, orbitalPosition.dz)
        .applyQuaternion(this.orbitAxisQuatInv)
    const initialR = localOrbitPosition.len()

    this.startingFocalLength = viewDefaultFocalLength * viewResizeScale
    this.minFocalLength = DEFAULT_MIN_FOCAL_LEN * viewResizeScale
    this.maxR = Math.max(initialR, (OrbitCameraController.computeMaxRForScene(this.camera)
      || MAX_POSSIBLE_R) * viewResizeScale)

    this.wheelControl.setLimts(this.minR, this.maxR)
    this.wheelControl.forceValue(this.r)

    this.updateCamera()
    return true
  }

  // eslint-disable-next-line class-methods-use-this
  public override stop() {
    super.stop()
    if (this.wasMoving) {
      this.onStopMoving()
    }
    OrbitCameraController.sendStopNotification()
  }

  public getDollyState() {
    return {
      min: this.minR,
      max: this.maxR,
      current: this.r,
    }
  }

  public onPointerMove(event: PointerEvent): boolean {
    const isMoving = this.isDragRotating || this.isDragPanning
    if (this.isDragRotating) {
      this.xRotateControl.setTargetValue(event.clientX)
      this.yRotateControl.setTargetValue(event.clientY)
    }
    if (this.isDragPanning) {
      this.xPanControl.setTargetValue(event.clientX)
      this.yPanControl.setTargetValue(event.clientY)
    }
    if (isMoving && !this.wasMoving) {
      this.onStartMoving()
    }
    return isMoving
  }

  public onPointerOver(event: PointerEvent): boolean {
    if (!this.isDragRotating && !this.isDragPanning) {
      return false
    }
    return true
  }

  public onPointerDown(event: PointerEvent): boolean {
    const scene = gvCurrentScene()
    if (!scene) {
      return false
    }

    const startPanning = this.enableLeftButtonPanning ||
      (event.button === MIDDLE_BUTTON || event.button === RIGHT_BUTTON)
    if (startPanning) {
      this.isDragPanning = true
      this.xPanControl.forceValue(event.clientX)
      this.yPanControl.forceValue(event.clientY)
      this.panControlPosition.set(event.clientX, event.clientY)
    } else {
      // If there's an object under cursor, let input handler handle it.
      const relXY = getRelXY(event)
      const id = scene.getRenderItemIDAtPoint(relXY[0], relXY[1])
      if (!id) {
        this.isDragRotating = true
        this.xRotateControl.forceValue(event.clientX)
        this.yRotateControl.forceValue(event.clientY)
        this.rotateControlPosition.set(event.clientX, event.clientY)
      }
    }

    // Returning false here to allow input handler to properly handle potential de-selection, etc.
    return false
  }

  public onPointerUp(event: PointerEvent): boolean {
    this.isDragRotating = false
    this.isDragPanning = false
    return false
  }

  public onWheelMove(event: WheelEvent): boolean {  
    const browserScrollScale = getBrowserScrollScale()

    if (!this.enableWheelDolly) {
      return false
    }

    const scale = browserScrollScale * (event.ctrlKey ? 10 * MOUSE_WHEEL_SCALE : MOUSE_WHEEL_SCALE)

    // Mouse delta reported by browsers may differ greatly when scrolling using trackpad and mouse wheel.
    // A single wheel rotation "click" may report deltaY in multiplies of 100, while scrolling using trackpad
    // reports deltas less that 10. Parameters here are tuned for trackpad scrolling with soft cap applying to prevent
    // large jumps from the mouse wheel.
    const delta = event.deltaY * scale
    const capped = MOUSE_DELTA_CAP * delta / (MOUSE_DELTA_CAP + Math.abs(delta))

    this.moveCameraDolly(capped)
    return true
  }

  public moveCameraDollyRelative(factor: number) {
    if (Math.abs(factor) < EPSILON) {
      return
    }
    const newTarget = this.startingR / factor
    this.setCameraDollyDistance(newTarget)
  }

  public setCameraDollyDistance(value: number) {
    this.wheelControl.setTargetValue(value)
    if (!this.wasMoving) {
      this.onStartMoving()
    }
  }

  private moveCameraDolly(amount: number) {
    const currentValue = this.wheelControl.getCurrentValue()
    const newTarget = currentValue + amount
    this.setCameraDollyDistance(newTarget)
  }

  // Prevent the event be passed to the input handler when camera is being moved by mouse.
  public onPointerLeave(): boolean {
    return this.isDragRotating || this.isDragPanning
  }

  private onStartMoving() {
    this.wasMoving = true
    OrbitCameraController.notifyStartMoving(this.isDragRotating)
  }

  private onStopMoving() {
    this.wasMoving = false
    this.notifyStopMoving()
  }

  public override tick(dt: number): void {
    this.xRotateControl.update(dt)
    this.yRotateControl.update(dt)
    this.xPanControl.update(dt)
    this.yPanControl.update(dt)
    this.wheelControl.update(dt)

    const currRotateX = this.xRotateControl.getCurrentValue()
    const currRotateY = this.yRotateControl.getCurrentValue()
    const dRotateControlX = currRotateX - this.rotateControlPosition.x
    const dRotateControlY = currRotateY - this.rotateControlPosition.y
    this.rotateControlPosition.set(currRotateX, currRotateY)

    const currPanX = this.xPanControl.getCurrentValue()
    const currPanY = this.yPanControl.getCurrentValue()
    const dPanControlX = currPanX - this.panControlPosition.x
    const dPanControlY = currPanY - this.panControlPosition.y
    this.panControlPosition.set(currPanX, currPanY)

    const dR = this.wheelControl.getCurrentValue() - this.r
    if (dRotateControlX === 0.0 && dRotateControlY === 0.0 &&
      dPanControlX === 0.0 && dPanControlY === 0.0 &&
      dR === 0.0) {
      if (this.wasMoving) {
        this.onStopMoving()
      }
      return
    }

    this.phi += dRotateControlX * CONTROL_PIXEL_TO_ORBIT_ANGLE
    this.theta += OrbitCameraController.applyLimitsDamping(this.theta, (dRotateControlY * CONTROL_PIXEL_TO_ORBIT_ANGLE),
      this.minTheta, this.maxTheta, easeOutExpo)

      const floorPlane = getFloorPlane()
      if (floorPlane && (dPanControlX !== 0.0 || dPanControlY !== 0.0)) {
        const panningScale = MIN_PAN_CONTROL_SCALE +
          (this.r / MAX_POSSIBLE_R) * (MAX_PAN_CONTROL_SCALE - MIN_PAN_CONTROL_SCALE)

        const cameraViewDir = this.camera.getUnitViewDir()
        const floorNormal = new Vector3(floorPlane.rot[2][0], floorPlane.rot[2][1], floorPlane.rot[2][2])
        const projectionOntoNormal = cameraViewDir.clone().projectOn(floorNormal)
        const cameraViewDirOnFloor = cameraViewDir.clone().minus(projectionOntoNormal).normalize()

        const forwardMovement = cameraViewDirOnFloor.clone().scale(dPanControlY * panningScale)
        const sideDirection = new Vector3(cameraViewDirOnFloor.dz, cameraViewDirOnFloor.dy, -cameraViewDirOnFloor.dx)
        const sideMovement = sideDirection.clone().scale(dPanControlX * panningScale)

        const totalMovement = forwardMovement.clone().plus(sideMovement)
        const p1 = this.orbitCenter
        const p2 = this.orbitCenter.clone().plus(totalMovement)
        const inside1 = isPointInsideFloorPolygon(p1)
        const inside2 = isPointInsideFloorPolygon(p2)
        if (!inside1) {
          // Somehow we ended outside the room.
          const closesPoint = closestPointOnFloorEdge(p2)
          if (closesPoint) {
            totalMovement.set(0.0, 0.0, 0.0)
            this.orbitCenter.set(closesPoint.x, this.orbitCenter.y, closesPoint.z)
          }
        } else if (inside1 && !inside2) {
          // Intersecting floor edge from inside, cancel the portion of the movement normal to the wall.
          const intersect = segment2DIntersectFloorEdge(p1, p2)
          if (intersect && intersect.point && intersect.normal) {
            const proj = totalMovement.clone().projectOn(intersect.normal)
            totalMovement.minus(proj)
          }
        }

        // As we approach the floor edge, totalMovement becomes gradually smaller,
        // eventually allowing tunneling through. Also, we can still intersect the floor
        // edge, when we're moving along the wall right in a corner, need double check it here.
        const newCenter = this.orbitCenter.clone().plus(totalMovement)
        if (totalMovement.len() > EPSILON && isPointInsideFloorPolygon(newCenter)) {
          this.orbitCenter.copy(newCenter)
        }
      }

    this.r += dR
    this.updateCamera()
  }

  private updateCamera() {
    if (!this.orbitInitialized) {
      if (this.tryInitializeOrbit()) {
        OrbitCameraController.sendStartNotification()
      } else {
        return
      }
    }
    if (!this.orbitCenter) {
      return
    }
    this.theta = clamp(this.theta, this.minTheta, this.maxTheta)
    this.r = clamp(this.r, this.minR, this.maxR)
    const intrinsics = this.camera.getIntrinsics()
    if (intrinsics && this.startingR > 0.0) {
      const radiusRatio = this.r / this.startingR
      const focalLength = this.autoFocalLength 
        ? Math.min(this.minFocalLength + radiusRatio * (this.startingFocalLength - this.minFocalLength),
          this.startingFocalLength)
        : this.startingFocalLength
      intrinsics.focalLengthX = focalLength
      intrinsics.focalLengthY = focalLength
      this.camera.setIntrinsics(intrinsics)
    }

    const localX = this.r * Math.cos(this.theta) * Math.cos(this.phi)
    const localY = this.r * Math.sin(this.theta)
    const localZ = this.r * Math.cos(this.theta) * Math.sin(this.phi)
    const worldOrbitalPos = new Vector3(localX, localY, localZ).applyQuaternion(this.orbitAxisQuat)

    this.camera.setLocation(this.orbitCenter.clone().plus(worldOrbitalPos))
    const threeCamera = this.camera.getThreeCamera()
    if (threeCamera) {
      threeCamera.lookAt(this.orbitCenter.x, this.orbitCenter.y, this.orbitCenter.z)
      threeCamera.updateMatrixWorld()
    }
    gvGeomModel()?.setRendererIsDirty()
  }

  private static computeOrbitCenter(camera: GeomCamera, floorCenter: Point3Pod): Point3 | undefined {
    // Construct a vertical plane, which passes through the floor centroid point,
    // and such as its line of intersection with floor is parallel to the screen.
    // In case if camera is close to a top-down view, use a plane, parallel to the floor,
    // at some arbitrary height (e.g. the height of human eye).
    const floorPlane = getFloorPlane()
    const ceilingPlane = getCeilingPlane()
    if (!floorPlane || !ceilingPlane) {
      return undefined
    }
    // Camera view direction projected on the floor plane.
    const cameraViewDir = camera.getUnitViewDir()
    const floorNormal = new Vector3(floorPlane.rot[2][0], floorPlane.rot[2][1], floorPlane.rot[2][2])
    const viewDirDotNormal = cameraViewDir.clone().dot(floorNormal)
    let plane: PlaneType | undefined

    // Projection of camera view direction on the floor plane:
    const cameraViewDirOnFloor = cameraViewDir.clone().minus(floorNormal.clone().scale(viewDirDotNormal))
    const planeNormal = cameraViewDirOnFloor.clone().negate().normalize()
    const planeD = -new Vector3(floorCenter.x, floorCenter.y, floorCenter.z).dot(planeNormal)
    const planeYAxis = floorNormal.clone()
    const planeXAxis = planeYAxis.clone().cross(planeNormal)
    plane = {
      id: -1,
      d: planeD,
      rot: [
        [planeXAxis.dx, planeXAxis.dy, planeXAxis.dz],
        [planeYAxis.dx, planeYAxis.dy, planeYAxis.dz],
        [planeNormal.dx, planeNormal.dy, planeNormal.dz],
      ],
      class: `wall`,
    }

    const cameraPosition = camera.getLocation()
    const ray: Ray = {
      origin: cameraPosition,
      dir: cameraViewDir,
    }
    let intersection = rayCastToPlane(ray, plane)
    const insideTheRoom = intersection &&
      intersection.y > -floorPlane.d &&
      intersection.y < ceilingPlane.d
    if (!insideTheRoom) {
      // Camera view is almost orthogonal to the floor.
      const humanEyeHeight = 1.5
      plane = {
        id: -1,
        d: floorPlane.d - humanEyeHeight,
        rot: [...floorPlane.rot],
        class: `floor`,
      }
      intersection = rayCastToPlane(ray, plane)
    }
    return intersection || undefined
  }

  private static computeMaxRForScene(camera: GeomCamera): number | undefined {
    const sceneRadius =  gvCurrentScene()?.getSceneBoundingBox()?.getBoundingSphere(new THREE.Sphere).radius
    const cameraFar = camera.getThreeCamera()?.far
    if (sceneRadius === undefined || cameraFar === undefined) {
      return undefined
    }
    const margin = 0.5 // meters.
    return cameraFar - 2 * sceneRadius - margin
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

  private static notifyStartMoving(isRotating: boolean) {
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: {
        stateInfo: `OrbitMoveStart`,
        movement: isRotating ? `rotate` : `pan`,
      }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification)
  }

  private notifyStopMoving() {
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: {
        stateInfo: `OrbitMoveEnd`,
      }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification)

    // Smarta needs this notifcation to update its tracked camera transform.
    const viewCHnageNotification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: {
        stateInfo: `ViewChangeEnd`,
        source: `OrbitMode`,
        camera: this.camera,
      }
    }
    GrandCentral.getDispatcher().dispatchNotification(viewCHnageNotification)
  }

  public static sendStartNotification() {
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: { stateInfo: `OrbitModeBegin` }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification)
  }

  private static sendStopNotification() {
    const notification: ViewerStateUpdateNotification = {
      what: NOTIFY_VIEWER_STATE_UPDATE,
      payload: { stateInfo: `OrbitModeEnd` }
    }
    GrandCentral.getDispatcher().dispatchNotification(notification)
  }
}