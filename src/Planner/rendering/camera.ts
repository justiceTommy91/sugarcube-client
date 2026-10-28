/* eslint-disable max-classes-per-file */
import * as THREE from 'three'

import { EVENT_CAMERA_TRANSFORM_UPDATED, PlannerEventMap } from 'Planner/planner_constants'

class PlannerPerspectiveCamera extends THREE.PerspectiveCamera {
  public lookAtTarget: THREE.Vector3 = new THREE.Vector3()

  public syncPathAnimationFrame() {
    this.lookAt(this.lookAtTarget)
  }
}

export class Camera extends THREE.EventDispatcher<PlannerEventMap> {
  private aspect: number
  private renderCamera: PlannerPerspectiveCamera
  private isDirty = true

  constructor(width: number, height: number) {
    super()

    this.aspect = width / height
    this.renderCamera = new PlannerPerspectiveCamera(60.0, this.aspect, 1.0, 100.0)
    this.renderCamera.layers.enableAll()
  }

  public getRenderCamera() {
    return this.renderCamera
  }

  public getIsDirty() {
    return this.isDirty
  }

  public setIsDirty(isDirty: boolean) {
    this.isDirty = isDirty
  }

  public updateMatrices() {
    this.renderCamera.updateProjectionMatrix()
    this.renderCamera.updateMatrixWorld()
    this.setIsDirty(true)

    this.dispatchEvent({ type: EVENT_CAMERA_TRANSFORM_UPDATED })
  }

  public syncPathAnimationFrame() {
    this.renderCamera.syncPathAnimationFrame()
    this.updateMatrices()
  }

  public getPosition() {
    return this.renderCamera.position
  }

  public getScreenPointRay(relativeCoords: [number, number]) {
    const ndcX = 2.0 * relativeCoords[0] - 1.0
    const ndcY = -1.0 * (2.0 * relativeCoords[1] - 1.0)
    const ray = new THREE.Ray()
    ray.origin.setFromMatrixPosition(this.renderCamera.matrixWorld)
    ray.direction.set(ndcX, ndcY, 0.5 ).unproject(this.renderCamera).sub(ray.origin).normalize()
    return ray
  }

  public worldToScreenRelative(worldPoint: [number, number, number]) {
    const screenPoint = new THREE.Vector3().fromArray(worldPoint).project(this.renderCamera)
    const relX = (screenPoint.x + 1) / 2
    const relY = (1 - screenPoint.y) / 2
    return new THREE.Vector2(relX, relY)
  }

  public getIntrinsics(width: number, height: number) {
    const fovRadians = (this.renderCamera.fov * Math.PI) / 180
    const focalLengthY = (height / 2) / Math.tan(fovRadians / 2)
    const focalLengthX = focalLengthY
    const principalPointX = width / 2
    const principalPointY = height / 2
    return {
        focalLengthX,
        focalLengthY,
        principalPointX,
        principalPointY,
        imageWidth: width,
        imageHeight: height,
    }
  }
}