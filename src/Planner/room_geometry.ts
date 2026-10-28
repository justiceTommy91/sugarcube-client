import * as THREE from 'three'

import { PlaneType, Matrix4x4, SurfaceClass } from 'Renderer/geomviewer/geom_types'
import type { PolygonType } from 'Renderer/assets/Types'
import { constructPlaneFromTransform, transformPolygonVerticesToWorldSpace } from 'Renderer/geometry/PolygonUtils'
import { EPSILON } from 'Renderer/geometry'

import type { RayCastResult } from 'Planner/planner_types'
import { OBJECT_TYPE_WALL, OBJECT_TYPE_WALL_ELEMENT } from './api_constants'

export function buildPlaneFromTransform(matrix: THREE.Matrix4, id: number, surfaceClass: SurfaceClass) {
  const x = matrix.elements[12]
  const y = matrix.elements[13]
  const z = matrix.elements[14]

  // Extract basis from the matrix, see THREE.Matrix4.extractBasis().
  const matrix4x4: Matrix4x4 = [
    [matrix.elements[0 * 4 + 0], matrix.elements[0 * 4 + 1], matrix.elements[0 * 4 + 2], 0],
    [matrix.elements[1 * 4 + 0], matrix.elements[1 * 4 + 1], matrix.elements[1 * 4 + 2], 0],
    [matrix.elements[2 * 4 + 0], matrix.elements[2 * 4 + 1], matrix.elements[2 * 4 + 2], 0],
    [x, y, z, 1],
  ]

  return constructPlaneFromTransform(matrix4x4, id, surfaceClass)
}

export function buildPolygonFromMesh(mesh: THREE.Mesh, id: number, surfaceClass: SurfaceClass) {
    const m = mesh.matrixWorld
    const plane = buildPlaneFromTransform(m, +id, surfaceClass)
    const posAttirbute = mesh.geometry.getAttribute(`position`)
    const vertices: [number, number][] = []
    for (let i = 0; i < posAttirbute.count; i += 1) {
      vertices.push([posAttirbute.getX(i), posAttirbute.getY(i)])
    }
    const indices = mesh.geometry.index
      ? Array.from(mesh.geometry.index.array)
      : []

    const transform: Matrix4x4 = [
      [m.elements[0], m.elements[4], m.elements[8], m.elements[12]],
      [m.elements[1], m.elements[5], m.elements[9], m.elements[13]],
      [m.elements[2], m.elements[6], m.elements[10], m.elements[14]],
      [m.elements[3], m.elements[7], m.elements[11], m.elements[15]],
    ]
    const result: PolygonType = {
      id: +id,
      class: surfaceClass,
      style: `polygon`,
      transform,
      parameters: {
          indices,
          vertices,
      },
      plane,
    }
    result.parameters.transformedVertices = transformPolygonVerticesToWorldSpace(result)
    return result
  }

export function planeToWorld3(plane: PlaneType, pos: THREE.Vector3) {
  const p = [pos.x, pos.y, pos.z]

  const d = plane.d
  const xAxis = plane.rot[0]
  const yAxis = plane.rot[1]
  const zAxis = plane.rot[2]

  const p0 = [-d * zAxis[0], -d * zAxis[1], -d * zAxis[2]]
  return new THREE.Vector3 (
      p0[0] + xAxis[0] * p[0] + yAxis[0] * p[1] + zAxis[0] * p[2],
      p0[1] + xAxis[1] * p[0] + yAxis[1] * p[1] + zAxis[1] * p[2],
      p0[2] + xAxis[2] * p[0] + yAxis[2] * p[1] + zAxis[2] * p[2],
  )
}

export function planeToWorld(plane: PlaneType, pos: THREE.Vector2) {
  return planeToWorld3(plane, new THREE.Vector3(pos.x, pos.y, 0))
}

export function worldToPlane(plane: PlaneType, pos: THREE.Vector3) {
  const d = plane.d

  const xAxis = plane.rot[0]
  const yAxis = plane.rot[1]
  const zAxis = plane.rot[2]

  const p0 = [-d * zAxis[0], -d * zAxis[1], -d * zAxis[2]]

  const p = [pos.x - p0[0], pos.y - p0[1], pos.z - p0[2]]

  const px = p[0] * xAxis[0] + p[1] * xAxis[1] + p[2] * xAxis[2]
  const py = p[0] * yAxis[0] + p[1] * yAxis[1] + p[2] * yAxis[2]
  const pz = p[0] * zAxis[0] + p[1] * zAxis[1] + p[2] * zAxis[2]

  return new THREE.Vector3(px, py, pz)
}

export function rayCastToPlane(ray: THREE.Ray, plane: PlaneType, bidirectional = true): THREE.Vector3 | undefined {
  const norm = plane.rot[2]
  const denominator = norm[0] * ray.direction.x + norm[1] * ray.direction.y + norm[2] * ray.direction.z
  if (Math.abs(denominator) < EPSILON) {
    return undefined
  }
  const originDotNormal = norm[0] * ray.origin.x + norm[1] * ray.origin.y + norm[2] * ray.origin.z
  const t = - (originDotNormal + plane.d) / denominator
  if (!bidirectional && t < 0.0) {
    return undefined
  }
  return ray.at(t, new THREE.Vector3())
}

export function clampPointVertically(point: THREE.Vector3, floorPlane: PlaneType,
  ceilingPlane: PlaneType): THREE.Vector3 | undefined {
  const rayUp = new THREE.Ray(point, new THREE.Vector3(0, 1, 0))
  const rayDown = new THREE.Ray(point, new THREE.Vector3(0, -1, 0))

  const floorIntersection = rayCastToPlane(rayDown, floorPlane, false)
  const ceilingIntersection = rayCastToPlane(rayUp, ceilingPlane, false)

  if (floorIntersection && ceilingIntersection) {
    return point.clone()
  }
  if (ceilingIntersection) {
    return rayCastToPlane(rayUp, floorPlane)
  }
  if (floorIntersection) {
    return rayCastToPlane(rayDown, ceilingPlane)
  }
  return point.clone()
}

export function projectPointOnPlane(point: THREE.Vector3, plane: PlaneType) {
  const normal = new THREE.Vector3(plane.rot[2][0], plane.rot[2][1], plane.rot[2][2])
  const dist = normal.dot(point) + plane.d
  return point.clone().addScaledVector(normal, -dist)
}

// Compute given object's bounding box aligned along given transform matrix.
export function computeLocalBoundingBox(object: THREE.Object3D,
  transform: THREE.Matrix4 = new THREE.Matrix4().identity()) {
  const ret = new THREE.Box3()
  const tmpVector = new THREE.Vector3()
  if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
    const positionAttr = object.geometry?.attributes?.position
    if (positionAttr) {
      for (let i = 0, l = positionAttr.count; i < l; i += 1) {
        tmpVector.fromBufferAttribute(positionAttr, i).applyMatrix4(transform)
        ret.expandByPoint(tmpVector)
      }
    }
  }
  const children = object.children
  for (let i = 0, l = children.length; i < l; i += 1) {
    const child = children[i]
    if (child.visible) {
      ret.union(computeLocalBoundingBox(child, new THREE.Matrix4().multiplyMatrices(transform, child.matrix)))
    }
  }
  return ret
}

export function objectsRaycast(ray: THREE.Ray, objects: THREE.Object3D[], minDistance?: number): RayCastResult[] {
    const raycaster = new THREE.Raycaster(ray.origin, ray.direction)
    const minDist = minDistance || 0.1
    const surfaceIntersections = raycaster.intersectObjects(objects, true)
      .filter(intersection => !!intersection && !!intersection.object.userData.class &&
        intersection.distance > minDist)
    const results = surfaceIntersections.map((intersection) => {
      const { wallId, wallElementId } = intersection.object.userData
      const id = wallId || wallElementId
      let objectType = intersection.object.userData.class
      if (wallId) {
        objectType = OBJECT_TYPE_WALL
      } else if (wallElementId) {
        objectType = OBJECT_TYPE_WALL_ELEMENT
      }
      return {
        objectType,
        id,
        worldPosition: intersection.point,
        distance: intersection.distance,
      }
    })
    return results
  }