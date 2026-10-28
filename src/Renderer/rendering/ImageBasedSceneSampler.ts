import { type SceneSampler, PointSampleResult } from 'Renderer/rendering/SceneSampler'
import { ScenePlanesSampler } from 'Renderer/rendering/PlanesSampler'
import { gvCurrentCamera } from 'Renderer/foundation/geom_app'
import { Point2, Point2Pod } from 'Renderer/geometry/Point2'
import { Point3, Point3Pod } from 'Renderer/geometry/Point3'
import { Vector3Pod } from 'Renderer/geometry/Vector3'
import {
  BASEBOARD_WORLD_HEIGHT_OFFSET,
} from 'Renderer/positioning/positioning_constants'
import type { MaskBasedScene } from 'Renderer/rendering/MaskBasedScene'
import type { PlaneType } from 'Renderer/geomviewer/geom_types'

export class ImageBasedSceneSampler extends ScenePlanesSampler<MaskBasedScene> implements SceneSampler {
  // A transient Point2 instance to be used wherever a temporary point2 is needed.
  private workspace = {
    point2: new Point2(0, 0),
    point3: new Point3(0, 0, 0)
  } 

  sampleRelativePoint(relativePoint: Point2Pod): PointSampleResult | null {
    const [pixelsX, pixelsY] = this.scene.toPixelCoords(relativePoint.x, relativePoint.y)
    const plane = this.getPlaneFromSegmentation(this.workspace.point2.set(pixelsX, pixelsY))
    if (!plane) {
      return null
    }
    return this.samplePlane(relativePoint, plane)
  }

  sampleFloor(relativePoint: Point2Pod): PointSampleResult | null {
    const planes = this.scene.getPlaneData()?.planeData
    if (!planes) {
      return null
    }
    const floorPlane = planes.find(plane => plane.class === 'floor')
    if (!floorPlane) {
      return null
    }
    return this.samplePlane(relativePoint, floorPlane)
  }

  sampleWalls(relativePoint: Point2Pod): PointSampleResult | null {
    const planes = this.scene.getPlaneData()?.planeData
    if (!planes) {
      return null
    }
    const wallPlanes = planes.filter(plane => plane.class === 'wall')
    if (!wallPlanes || wallPlanes.length === 0) {
      return null
    }
    const camera = gvCurrentCamera()
    const threeCamera = camera?.getThreeCamera()
    if (!threeCamera) {
      return null
    }
    let minDistSq = Infinity
    let result = null
    wallPlanes.forEach((plane) => {
      const planeResult = this.samplePlane(relativePoint, plane)
      if (planeResult && this.is3DWallPointVisible(planeResult.position, planeResult.plane, true)) {
        const dx = planeResult.position.x - threeCamera.position.x
        const dy = planeResult.position.y - threeCamera.position.y
        const dz = planeResult.position.z - threeCamera.position.z
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq < minDistSq) {
          minDistSq = distSq
          result = planeResult
        }
      }
    })
    return result
  }

  sampleSurfaceClass(relativePoint: Point2Pod) {
    const result = this.sampleRelativePoint(relativePoint)
    if (!result) {
      return null
    }
    return result.plane.class
  }

  private getPlaneFromSegmentation(pixelPoint: Point2Pod) {
    const segmentationData = this.scene.getWallsMask()?.data
    if (!segmentationData) {
      return null
    }
    const [width] = this.scene.getDimensions()
    const pixelsIndex = 4 * (pixelPoint.y * width + pixelPoint.x) + 2
    const planeSegmentationId = segmentationData[pixelsIndex] - 1
    const planes = this.scene.getPlaneData()?.planeData
    if (!planes) {
      return null
    }
    return planes[planeSegmentationId]
  }

  protected is2DPointInsideVisibleArea(pixelsPoint: Point2Pod, surfaceId: number): boolean {
    return this.getPlaneFromSegmentation(pixelsPoint)?.id === surfaceId
  }

  // eslint-disable-next-line class-methods-use-this
  protected applyBaseboardYOffset(pixelPoint: Point2, worldPoint: Point3, yWorldDir: Point3): Point2 | null {
    const camera = gvCurrentCamera()
    if (!camera) {
      return null
    }
    const liftedPoint =  this.workspace.point3.set(
      worldPoint.x + yWorldDir.x * BASEBOARD_WORLD_HEIGHT_OFFSET,
      worldPoint.y + yWorldDir.y * BASEBOARD_WORLD_HEIGHT_OFFSET,
      worldPoint.z + yWorldDir.z * BASEBOARD_WORLD_HEIGHT_OFFSET
    )

    return camera.worldToScreenFloat(liftedPoint, pixelPoint)
  }

  rawRaycastSample(origin: Point3Pod, direction: Vector3Pod): PointSampleResult[] {
    const planes = this.scene.getPlaneData()?.planeData
    if (!planes) {
      return []
    }
    const results = planes
      .map((plane) => this.rawPlaneRaycastSample(origin, direction, plane))
      .filter((result): result is PointSampleResult => !!result)
    return results
  }

  override is3DWallPointValid(point: Point3, plane: PlaneType, applyBaseboardYOffset = false): boolean {
    return this.is3DWallPointVisible(point, plane, applyBaseboardYOffset)
  }
}
