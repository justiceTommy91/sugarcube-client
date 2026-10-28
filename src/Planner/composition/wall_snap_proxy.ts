import * as THREE from 'three'

import * as WallSnap from 'Renderer/WallSnap'
import { worldToPlane } from 'Planner/room_geometry'
import { toMat3x3 } from 'Renderer/geometry/ThreeUtils'
import { extractQuaternionFromMat3, makeRotationY, multiplyMatrices3x3 } from 'Renderer/geometry/utilities'

import type { PlaneType } from 'Renderer/geomviewer/geom_types'
import type { WallSnapBody, WallSnapAdapter, WallSnapPose } from 'Renderer/positioning/positioning_system'
import { gvPositioningConext } from 'Renderer/positioning/positioning_context'

export class WallSnapProxy implements WallSnapAdapter {
  private renderObject: THREE.Object3D
  private wallsnapBody: WallSnapBody
  private heading: number

  constructor(renderObject: THREE.Object3D, floorPlane: PlaneType, size: THREE.Vector3) {
    this.renderObject = renderObject

    const worldQuaternion = this.renderObject.getWorldQuaternion(new THREE.Quaternion())
    this.heading = 2 * Math.atan2(worldQuaternion.y, worldQuaternion.w)
    this.wallsnapBody = this.createBody(floorPlane, size)
  }

  public get orientation() {
    return this.heading
  }

  public set orientation(value: number) {
    this.heading = value
  }

  get body(): WallSnapBody {
    return this.wallsnapBody
  }

  get position(): [number, number] | undefined {
    const camera = gvPositioningConext()?.getCamera()
    const worldPos = this.renderObject.getWorldPosition(new THREE.Vector3())
    const screenPos = camera?.worldToScreenFloat(worldPos)
    return [screenPos?.x || 0, screenPos?.y || 0]
  }

  // eslint-disable-next-line class-methods-use-this
  set position(screenPoint: [number, number] | undefined) {
    // noop
  }

  get pose(): WallSnapPose {
    const worldRot = toMat3x3(this.renderObject.matrixWorld.extractRotation(new THREE.Matrix4()))
    const worldPos = this.renderObject.getWorldPosition(new THREE.Vector3())
    return {
      rot: worldRot,
      pos: [worldPos.x, worldPos.y, worldPos.z],
    }
  }

  set pose(pose: WallSnapPose) {
    const headMat = makeRotationY(this.heading)
    const rotWithHeading = multiplyMatrices3x3([
      [...pose.rot[0]],
      [...pose.rot[2]],
      [-pose.rot[1][0], -pose.rot[1][1], -pose.rot[1][2]],
    ], headMat)
    const q = extractQuaternionFromMat3(rotWithHeading)
    const quaternion = new THREE.Quaternion(q[0], q[1], q[2], q[3])

    if (this.renderObject.parent) {
      const localPosition = this.renderObject.parent.worldToLocal(new THREE.Vector3(pose.pos[0], pose.pos[1],
        pose.pos[2]))
      this.renderObject.position.copy(localPosition)
      const parentWorldQuaternion = new THREE.Quaternion()
      this.renderObject.parent.getWorldQuaternion(parentWorldQuaternion)
      const localQuaternion = parentWorldQuaternion.invert().multiply(quaternion)
      this.renderObject.quaternion.copy(localQuaternion)
    } else {
      this.renderObject.position.set(pose.pos[0], pose.pos[1], pose.pos[2])
      this.renderObject.quaternion.copy(quaternion)
    }
  }

  private createBody(floorPlane: PlaneType, size: THREE.Vector3) {
    const body = WallSnap.initBody(this, size.x, size.z)
    this.renderObject.updateMatrixWorld()
    const worldPosition = this.renderObject.getWorldPosition(new THREE.Vector3())
    const floorPos = worldToPlane(floorPlane, worldPosition)
    body.pos = [floorPos.x, floorPos.y, floorPos.z]

    return body
  }

  public pushOut() {
    return WallSnap.pushOut(this)
  }
}