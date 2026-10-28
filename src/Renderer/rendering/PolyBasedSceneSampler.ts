/* eslint-disable class-methods-use-this */
import { PointSampleResult, type SceneSampler } from 'Renderer/rendering/SceneSampler'
import { ScenePlanesSampler } from 'Renderer/rendering/PlanesSampler'
import type { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'
import { gvCameraManager, gvCurrentCamera } from 'Renderer/foundation/geom_app'
import { Point2, Point2Pod } from 'Renderer/geometry/Point2'
import { Point3, Point3Pod } from 'Renderer/geometry/Point3'
import { Vector3Pod } from 'Renderer/geometry/Vector3'
import type { SurfaceClass, PlaneType } from 'Renderer/geomviewer/geom_types'
import { polygonRayCast, isPointInsidePolygon2D } from 'Renderer/geometry/PolygonUtils'
import type { PolygonType } from 'Renderer/assets/Types'
import { copyMatrix4, getInverted, transpose4 } from 'Renderer/geometry/utilities'
import { vertex2DIterator } from 'Renderer/utils/modelUtils'

const workspace = {
  pt2: new Point2(0, 0),
  pt3: new Point3(0, 0, 0),
}

export class PolyBasedSceneSampler extends ScenePlanesSampler<GeomBaseScene> implements SceneSampler {
  protected is2DPointInsideVisibleArea(pixelsPoint: Point2Pod, surfaceId: number): boolean {
    const [relX, relY] = this.scene.toRelativeCoords(pixelsPoint.x, pixelsPoint.y)
    // Excluding the <opening> from the sampling sets them as non-occluders. Sampler finds the closest polygon so this
    // makes the wall behind an opening the valid result in the case an opening occludes the wall. 
    const result = this.sampleAllPolygons(workspace.pt2.set(relX, relY), `opening`)
    return result ? (result.plane.id === surfaceId) : false
  }

  protected applyBaseboardYOffset(pixelsPoint: Point2Pod): Point2Pod | null {
    return pixelsPoint
  }

  sampleRelativePoint(relativePoint: Point2Pod): PointSampleResult | null {
    return this.sampleAllPolygons(relativePoint)
  }

  sampleFloor(relativePoint: Point2Pod): PointSampleResult | null {
    const polygons = this.scene.getPolygonData()?.plane_polygons
    if (!Array.isArray(polygons)) {
      return null
    }
    const surfaceId = polygons.find(poly => poly.class === 'floor')?.id
    if (surfaceId === undefined) {
      return null
    }
    return this.sampleSinglePolygon(relativePoint, surfaceId)
  }

  sampleWalls(relativePoint: Point2Pod): PointSampleResult | null {
    const polygons = this.scene.getPolygonData()?.plane_polygons
      .filter((poly) => poly.class === 'wall')
    if (!Array.isArray(polygons)) {
      return null
    }
    return this.samplePolygons(relativePoint, polygons)
  }

  sampleSurfaceClass(relativePoint: Point2Pod, ignore?: SurfaceClass): SurfaceClass | null {
    const sampleResult = this.sampleAllPolygons(relativePoint, ignore)
    return sampleResult ? sampleResult.plane.class : null
  }

  rawRaycastSample(origin: Point3Pod, direction: Vector3Pod): PointSampleResult[] {
    const polygons = this.scene.getPolygonData()?.plane_polygons
    if (!Array.isArray(polygons)) {
      return []
    }
    return polygons
      .map((polygon, idx) => {
        const intersect = polygonRayCast(polygon, origin, direction)
        return intersect ? {
          position: intersect.point,
          plane: polygons[idx].plane
        } : null
      })
      .filter((result): result is PointSampleResult => !!result)
  }

  private sampleAllPolygons(relativePoint: Point2Pod, ignore?: SurfaceClass): PointSampleResult | null {
    const polygons = ignore ? 
      this.scene.getPolygonData()?.plane_polygons.filter(pol => pol.class !== ignore) :
      this.scene.getPolygonData()?.plane_polygons
    if (!Array.isArray(polygons)) {
      return null
    }

    return this.samplePolygons(relativePoint, polygons)
  }

  private samplePolygons(relativePoint: Point2Pod, polygons: PolygonType[]): PointSampleResult | null {
    const camera = gvCurrentCamera()
    if (!camera) {
      return null
    }

    const isStaticCamera = gvCameraManager()?.isCameraStatic() || false
    const rayOrigin = camera.getLocation()
    const rayDirection = camera.getUnitRayDirThruScreenPoint(relativePoint.x, relativePoint.y)
    let resultPoint: Point3 | null = null
    let resultPolyIdx = -1
    let smallestDist = Infinity
    // Assuming that scene's polygon data contains well formed list of triangles.
    for (let polyIdx = 0; polyIdx < polygons.length; polyIdx += 1) {
      const polygon = polygons[polyIdx]
      const intersect = polygonRayCast(polygon, rayOrigin, rayDirection)
      if (intersect &&
        intersect.distanceFromOrigin < smallestDist &&
        !(isStaticCamera && polygon.ignoreInStaticView)) {
        smallestDist = intersect.distanceFromOrigin
        resultPoint = intersect.point
        resultPolyIdx = polyIdx
      }
    }

    return resultPoint ? {
      position: resultPoint,
      plane: polygons[resultPolyIdx].plane,
    } : null
  }

  private sampleSinglePolygon(relativePoint: Point2Pod, surfaceId: number): PointSampleResult | null {
    const polygons = this.scene.getPolygonData()?.plane_polygons
    if (!Array.isArray(polygons)) {
      return null
    }
    const polygon = polygons.find(poly => poly.id === surfaceId)
    if (!polygon) {
      return null
    }
    const camera = gvCurrentCamera()
    if (!camera) {
      return null
    }
    const rayOrigin = camera.getLocation()
    const rayDirection = camera.getUnitRayDirThruScreenPoint(relativePoint.x, relativePoint.y)
    const intersect = polygonRayCast(polygon, rayOrigin, rayDirection)
    return intersect ? {
      position: intersect.point,
      plane: polygon.plane,
    } : null
  }

  // Is given 3D point lay within 2D polygon.
  // Assuming here that the point is already projected onto the polygon's plane.
  override is3DWallPointValid(worldPoint: Point3Pod, plane: PlaneType): boolean {
    const polygons = this.scene.getPolygonData()?.plane_polygons
    if (!Array.isArray(polygons)) {
      return false
    }
    const isStaticCamera = gvCameraManager()?.isCameraStatic() || false
    const polygon = polygons.find(poly => poly.plane.id === plane.id)
    if (!polygon || (isStaticCamera && polygon.ignoreInStaticView)) {
      return false
    }
    const transform = copyMatrix4(polygon.transform)
    transpose4(transform)
    const localPoint = workspace.pt3
      .set(worldPoint.x, worldPoint.y, worldPoint.z)
      .mulMat4(getInverted(transform))
    const iterator = vertex2DIterator(polygon.parameters.vertices)
    return isPointInsidePolygon2D(workspace.pt2.set(localPoint.x, localPoint.y), iterator)
  }
}