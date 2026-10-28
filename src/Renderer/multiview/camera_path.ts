import * as THREE from 'three'

import type { CameraView } from 'Renderer/multiview//camera_types'
import { Point2, Point3, Vector3 } from 'Renderer/geometry'
import type { Ray } from 'Renderer/positioning/positioning_types'
import * as pu from 'Renderer/positioning/positioning_utilities'
import { gvCurrentScene } from 'Renderer/foundation/geom_app'
import { closestPointsOnTwoLines } from 'Renderer/geometry/utilities'
import { CircularVectorKeyframeTrack } from './utils/circular_keyframe_track'

const workspace = {
  pt21: new Point2(0, 0),
  pt22: new Point2(0, 0),
  pt3: new Point3(0, 0, 0),
  v3: new Vector3(0, 0, 0),
}

export class CameraPath {
  private tracks: THREE.KeyframeTrack[] = []
  private duration: number

  constructor(tracks: THREE.KeyframeTrack[], duration: number) {
    this.tracks = tracks
    this.duration = duration
  }

  public getTracks() {
    return this.tracks
  }

  public getDuration() {
    return this.duration
  }

  public static computePath(from: CameraView, to: CameraView, 
    orbitPt: THREE.Vector3 | null = null, 
    maxTime = 1.5): CameraPath | undefined {

    const speed = 1 // Meters per second.
    const distance = workspace.pt3.set(from.position.x, from.position.y, from.position.z).distanceTo(to.position)
    const timeSecs = Math.max(1, Math.min(distance / speed, maxTime))

    // Use linear path if rotation doesn't change, use circular otherwise
    const fromPos = [from.position.x, from.position.y, from.position.z]
    const toPos = [to.position.x, to.position.y, to.position.z]
    const cosRotation = Math.cos(
      new THREE.Quaternion().set(from.rotation.x, from.rotation.y, from.rotation.z, from.rotation.w).angleTo(
        new THREE.Quaternion().set(to.rotation.x, to.rotation.y, to.rotation.z, to.rotation.w)))
    let positionTrack
    if (cosRotation > 0.9) {
      positionTrack = new THREE.VectorKeyframeTrack(`.position`, [0, timeSecs],
        [...fromPos, ...toPos], THREE.InterpolateLinear)
    } else {
      let center = orbitPt?.clone()
      const fromPosVec = new THREE.Vector3(...fromPos)
      const toPosVec = new THREE.Vector3(...toPos)

      if (!center) { 
        // Find intersection line for current and target camera line of sight
        const [center1, center2] = CameraPath.getViewsDirectionsIntersection(from, to)
        if (cosRotation < -0.9) {
          center = new THREE.Vector3().lerpVectors(fromPosVec, toPosVec, 0.5)
        } else if (fromPosVec.distanceTo(center1) < toPosVec.distanceTo(center2)) {
          center = center1
        } else {
          center = center2
        }

        // if center is outside the room, just linearly interpolate between from and to.
        const scene = gvCurrentScene()
        if (!scene?.getSceneBoundingBox()?.containsPoint(center)) {
          center = new THREE.Vector3().lerpVectors(fromPosVec, toPosVec, 0.5)
        }
      }

      const planePolygons = gvCurrentScene()?.getPolygonData()?.plane_polygons
      const floor = planePolygons?.find(poly => poly.class === 'floor')
      const worldUp = new THREE.Vector3(...(floor?.plane?.rot[2] || [0, 1, 0]))

      // Only use a circular track when the center point is approximately the same 
      // distance from both cameras or flipping to the other side of the focused pt.
      const fromDist = fromPosVec.distanceTo(center)
      const toDist = toPosVec.distanceTo(center)
      const ratio = fromDist / (fromDist + toDist)
      const distThreshold = 0.35
      if (ratio > distThreshold && ratio < 1.0 - distThreshold || cosRotation < 0) {
        positionTrack = new CircularVectorKeyframeTrack(`.position`, [0, timeSecs],
          [...fromPos, ...toPos], center, worldUp, THREE.InterpolateLinear)
      } else { 
        positionTrack = new THREE.VectorKeyframeTrack(`.position`, [0, timeSecs],
          [...fromPos, ...toPos], THREE.InterpolateLinear)
      }
    }

    const fromTarget = CameraPath.getViewTarget(from)
    const toTarget = CameraPath.getViewTarget(to)
    const targetTrack = new THREE.VectorKeyframeTrack(`.target`, [0, timeSecs],
      [fromTarget.position.x, fromTarget.position.y, fromTarget.position.z,
        toTarget.position.x, toTarget.position.y, toTarget.position.z], THREE.InterpolateLinear)

    const upTrack = new THREE.VectorKeyframeTrack(`.up`, [0, timeSecs],
      [fromTarget.up.dx, fromTarget.up.dy, fromTarget.up.dz,
        toTarget.up.dx, toTarget.up.dy, toTarget.up.dz], THREE.InterpolateLinear)

    // Assuming for now that focal length is always uniform along X and Y.
    const focalLengthTrack = new THREE.NumberKeyframeTrack(`.focalLength`, [0, timeSecs],
      [from.intrinsics.focalLengthX, to.intrinsics.focalLengthX])
    const principalPointXTrack = new THREE.NumberKeyframeTrack(`.principalPointX`, [0, timeSecs],
      [from.intrinsics.principalPointX, to.intrinsics.principalPointX])
    const principalPointYTrack = new THREE.NumberKeyframeTrack(`.principalPointY`, [0, timeSecs],
      [from.intrinsics.principalPointY, to.intrinsics.principalPointY])
    const imageWidthTrack = new THREE.NumberKeyframeTrack(`.imageWidth`, [0, timeSecs],
      [from.intrinsics.imageWidth, to.intrinsics.imageWidth])
    const imageHeightTrack = new THREE.NumberKeyframeTrack(`.imageHeight`, [0, timeSecs],
      [from.intrinsics.imageHeight, to.intrinsics.imageHeight])
    const nearTrack = new THREE.NumberKeyframeTrack(`.near`, [0, timeSecs], [from.near, to.near])
    const farTrack = new THREE.NumberKeyframeTrack(`.far`, [0, timeSecs], [from.far, to.far])

    return new CameraPath([positionTrack, focalLengthTrack,
      principalPointXTrack, principalPointYTrack, imageWidthTrack, imageHeightTrack, 
      upTrack, targetTrack, nearTrack, farTrack], timeSecs)
  }

  private static getViewTarget(view: CameraView) {
    const viewRay: Ray = {
      origin: view.position,
      dir: workspace.v3.set(0, 0, -1).applyQuaternion(view.rotation)
    }
    let fromTarget = pu.castRayToAllSurfaces(viewRay)
    // In some rooms (e.g. L-shaped room builder ones, etc) the top-down view is located in a position that is not
    // exactly above the floor point, but casting the ray against infinite plane will still work.
    if (!fromTarget) {
      fromTarget = pu.castRayToFloorPlane(viewRay)
    }
    let position = fromTarget?.point
    if (!position) {
      position = workspace.pt3.copy(viewRay.origin).plus(viewRay.dir).clone()
    }
    const up = workspace.v3.set(0, 1, 0).applyQuaternion(view.rotation).clone()
    return { position, up }
  }

  // Using two camera views, computes the points on each line of sight where
  // the lines are closes to each other.
  // Returns two points, first on the first line, second on the second line.
  private static getViewsDirectionsIntersection(from: CameraView, to: CameraView) {
    const viewForward = new THREE.Vector3(0, 0, -1)
    const rot1 = new THREE.Quaternion().set(from.rotation.x, from.rotation.y, from.rotation.z, from.rotation.w)
    const rot2 = new THREE.Quaternion().set(to.rotation.x, to.rotation.y, to.rotation.z, to.rotation.w)
    const direction1 = viewForward.clone().applyQuaternion(rot1).normalize()
    const direction2 = viewForward.clone().applyQuaternion(rot2).normalize()
    const [center1, center2] = closestPointsOnTwoLines(from.position, direction1, to.position, direction2)
    
    return [
      new THREE.Vector3(center1.x, center1.y, center1.z),
      new THREE.Vector3(center2.x, center2.y, center2.z),
    ]
  }
}
