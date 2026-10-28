import { gvCurrentScene, gvCurrentCamera } from 'Renderer/foundation/geom_app'
import { Point2, Point2Pod, Point3, Vector2, Vector3 } from 'Renderer/geometry'
import { upperLeft3 } from 'Renderer/geometry/utilities'
import type { PlaneType } from 'Renderer/geomviewer/geom_types'
import * as pu from 'Renderer/positioning/positioning_utilities'
import type StackableSurfaceItem3D from 'Renderer/model/StackableSurfaceItem3D'

const segmentClosestPoint = (point: Point2Pod, p0: Point2, p1: Point2) => {
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y

  const l2 = dx * dx + dy * dy

  if (l2 === 0) {
    return {
      t: 0,
      point: p0.clone(),
    }
  }

  const t = Math.max(0, Math.min(1, ((point.x - p0.x) * dx + (point.y - p0.y) * dy) / l2))
  const result = p0.clone().plus(new Vector2(dx, dy).scale(t))
  return {
    t,
    point: result,
  }
}

export function computeClosestPointWorldSpace(screenPoint: Point2, surfaceId: string) {
  const surface = gvCurrentScene()?.getStackableSurfaceItem(surfaceId)
  if (!surface) {
    return undefined
  }

  const localPoints = surface.getSurfaceLocalPoints().map(point2D => new Point2(point2D[0], point2D[1]))
  const worldRot = upperLeft3(surface.getWorldTransform())
  const normal = new Vector3(worldRot[2][0], worldRot[2][1], worldRot[2][2])
  const worldPosition = surface.getWorldPosition()
  const d = -new Vector3(worldPosition.x, worldPosition.y, worldPosition.z).dot(normal)
  const surfacePlane: PlaneType = {
    id: -1,
    d,
    rot: worldRot,
    class: `stackable`,
  }
  const sampleResult = pu.samplePlane(screenPoint, surfacePlane)
  if (!sampleResult) {
    return undefined
  }

  let minDistanceSq = Infinity
  const localSamplePoint = surface.worldToLocal(sampleResult.position)
  const localSamplePoint2D = new Point2(localSamplePoint.x, localSamplePoint.y)
  const closestPoint: Point3 = new Point3(0, 0, 0)

  const pointsCount = localPoints.length
  for (let i = 0; i < pointsCount; i += 1) {
    const p0 = localPoints[i]
    const p1 = localPoints[(i + 1) % pointsCount]

    const segmentClosest = segmentClosestPoint(localSamplePoint2D, p0, p1)
    const distanceSq = localSamplePoint2D.distanceToSq(segmentClosest.point)
    if(distanceSq < minDistanceSq) {
      minDistanceSq = distanceSq
      closestPoint.set(segmentClosest.point.x, segmentClosest.point.y, 0.0)
    }
  }

  return {
    localPoint: closestPoint,
    distance: Math.sqrt(minDistanceSq),
  }
}

export function computeClosestSurfaceWorldSpace(point: Point2) {
  const scene = gvCurrentScene()
  if (!scene) {
    return undefined
  }

  const isVisibleOrStaticSurface = (surface: StackableSurfaceItem3D) => 
    !surface.getParent() || surface.getParent()?.getObject()?.visible

  const allSurfacesIds = [...scene.getAllStackableSurfaces().values()]
    .filter(surface => isVisibleOrStaticSurface(surface))
    .map(surface => surface.getId())

  const closestPoint = {
    localPoint: new Point3(0.0, 0.0, 0.0),
    distance: Infinity,
    surfaceId: '',
}

  allSurfacesIds.forEach((surfaceId) => {
    const currClosest = computeClosestPointWorldSpace(point, surfaceId)
    if(currClosest && currClosest.distance < closestPoint.distance) {
      closestPoint.distance = currClosest.distance
      closestPoint.localPoint.copy(currClosest.localPoint)
      closestPoint.surfaceId = surfaceId
    }
  })

  if (closestPoint.distance === Infinity) {
    return undefined
  }
  return closestPoint
}

export function computeClosestPointScreenSpace(point: Point2, surfaceId: string) {
  const camera = gvCurrentCamera()
  const surface = gvCurrentScene()?.getStackableSurfaceItem(surfaceId)
  if (!surface || !camera) {
    return undefined
  }

  const worldPoints = surface.getSurfaceWorldPoints()
  const withProjections = worldPoints.map((worldPoint) => {
    const projected = camera.worldToScreenFloat(worldPoint)
    return { worldPoint, projected }
  })

  let minDistanceSq = Infinity
  let closestPoint3D: Point3 = new Point3(0, 0, 0)

  const pointsCount = withProjections.length
  for (let i = 0; i < pointsCount; i += 1) {
    const p0 = withProjections[i]
    const p1 = withProjections[(i + 1) % pointsCount]

    const currClosest = segmentClosestPoint(point, p0.projected, p1.projected)
    const distanceSq = point.distanceToSq(currClosest.point)
    if(distanceSq < minDistanceSq) {
      minDistanceSq = distanceSq
      const segment = p1.worldPoint.clone().minus(p0.worldPoint)
      closestPoint3D = p0.worldPoint.clone().plus(segment.scale(currClosest.t))
    }
  }

  if (minDistanceSq === Infinity) {
    return undefined
  }

  return {
    localPoint: surface.worldToLocal(closestPoint3D),
    distance: Math.sqrt(minDistanceSq),
  }
}