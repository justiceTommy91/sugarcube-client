/* eslint-disable class-methods-use-this */
import { type PlanesSampler, PointSampleResult } from 'Renderer/rendering/SceneSampler'
import { ItemsSampler } from 'Renderer/rendering/ItemsSampler'
import type { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'
import type { PlaneType } from 'Renderer/geomviewer/geom_types'
import { gvCurrentCamera } from 'Renderer/foundation/geom_app'
import { EPSILON, Point2, Point2Pod, Point3, Point3Pod, Vector3, Vector3Pod } from 'Renderer/geometry'

const workSpace = {
  point2: new Point2(0, 0),
  point3: new Point3(0, 0, 0),
}

export abstract class ScenePlanesSampler<T extends GeomBaseScene> extends ItemsSampler<T> implements PlanesSampler {
  samplePlane(relativePoint: Point2Pod, plane: PlaneType): PointSampleResult | null {
    const camera = gvCurrentCamera()
    if (!camera) {
      return null
    }

    const origin = camera.getLocation()
    const cameraRayDirection: Vector3 = camera.getUnitRayDirThruScreenPoint(relativePoint.x, relativePoint.y)
    return this.rawPlaneRaycastSample(origin, cameraRayDirection, plane)
  }

  // Get ray intersection with the given plane.
  rawPlaneRaycastSample(origin: Point3Pod, direction: Vector3Pod, plane: PlaneType): PointSampleResult | null {
    const planeD = plane.d
    const planeNormal = plane.rot[2]

    const planeNormalDotRayDirection = planeNormal[0] * direction.dx + planeNormal[1] * direction.dy
      + planeNormal[2] * direction.dz

    // Camera ray is parallel to the surface, never intersects.
    if (Math.abs(planeNormalDotRayDirection) < EPSILON) {
      return null
    }

    const originDotPlaneNormal = origin.x * planeNormal[0] + origin.y * planeNormal[1] + origin.z * planeNormal[2]
    const rayDistance = -(originDotPlaneNormal + planeD) / planeNormalDotRayDirection

    // The plane is either behind the camera, or is facing away.
    if (rayDistance < 0.0) {
      return null
    }

    const position = new Point3 (
      origin.x + rayDistance * direction.dx,
      origin.y + rayDistance * direction.dy,
      origin.z + rayDistance * direction.dz,
    )

    return {
      position,
      plane,
    }
  }

  is3DWallPointVisible(point: Point3Pod, plane: PlaneType, applyBaseboardYOffset = false): boolean {
    const camera = gvCurrentCamera()
    if (!camera) {
      return false
    }

    let pixelsPoint = camera.worldToScreenInt(workSpace.point3.set(point.x, point.y, point.z))
    let isValid = this.is2DPointInsideVisibleArea(pixelsPoint, plane.id)
    // Normal segmentation masks are often incorrect and have wall baseboards segmented as "floor". This check attempts
    // to correct it by checking the pixel BASEBOARD_WORLD_HEIGHT_OFFSET pixels higher
    // than the pixel that is passed to the function,
    if (!isValid && applyBaseboardYOffset) {
      // plane.rot[1] is the Y world direction of the plane normalized.  
      workSpace.point3.set(plane.rot[1][0], plane.rot[1][1], plane.rot[1][2]) 
      const liftedPoint =  this.applyBaseboardYOffset(pixelsPoint, point, workSpace.point3)
      pixelsPoint = liftedPoint ? workSpace.point2.set(liftedPoint.x, liftedPoint.y) : pixelsPoint
      isValid = this.is2DPointInsideVisibleArea(pixelsPoint, plane.id)
    }

    return isValid
  }

  abstract is3DWallPointValid(point: Point3Pod, plane: PlaneType, applyBaseboardYOffset?: boolean): boolean

  protected abstract is2DPointInsideVisibleArea(pixelsPoint: Point2Pod, surfaceId: number): boolean
  protected abstract applyBaseboardYOffset(pixelPoint: Point2Pod, point: Point3Pod,
    yWorldDir: Point3Pod): Point2Pod | null
}
