/**
 * Utility functions for the 3D model.
 */
import * as Sentry from '@sentry/react'
import { Point2 } from 'Renderer/geometry/Point2';
import { Point3 } from 'Renderer/geometry/Point3';
import { getPolyExtents, isPointInsidePolygon2D, sqrdDistFromPointToPolygon } from 'Renderer/geometry/PolygonUtils';
import * as THREE from 'three'
import {
    AXIS_X,
    AXIS_Y,
    AXIS_Z,
} from 'Renderer/constants'
import StackableSurfaceItem3D from "Renderer/model/StackableSurfaceItem3D";
import { gvCurrentCamera } from "Renderer/foundation/geom_app";
import { closestAxisAlignedAngle } from "Renderer/geometry/utilities";

// StackablePolygon describe a 2D polygon for a surface upon which items can be stacked.
export type StackablePolygon = {
    vertices: [number, number][]; // 2D polygon vertices in local space.
    worldToLocal: (q: THREE.Vector3) => THREE.Vector3;
    localToWorld: (q: THREE.Vector3) => THREE.Vector3;
}

export type Axis = typeof AXIS_X | typeof AXIS_Y  | typeof AXIS_Z

// Helper function to iterate over vertices as Point2.
export function* vertex2DIterator(vertices: [number, number][]): Generator<Point2> {
    const len = vertices.length;
    for (let i = 0; i < len; i += 1) {
        yield new Point2(vertices[i][0], vertices[i][1]);
    }
}

// the same as THREE.Object3D.traverse, but allowing to stop traversing on some child objects
// visitor function is expected to return boolean: true to continue traversing, and false to stop.
export function stoppableTraverse(object: THREE.Object3D,
    visitor: (object: THREE.Object3D) => boolean): void {
    const continueTraverse = visitor(object)
    if (continueTraverse) {
        const children = object.children
        for (let i = 0, l = children.length; i < l; i += 1) {
            stoppableTraverse(children[i], visitor)
        }
    }
}

export function isGlbRoot(object: THREE.Object3D): boolean {
    return !!object?.userData?.glbUrl
}

function getMirroredAttribute(attribute: THREE.BufferAttribute, axis: Axis): THREE.BufferAttribute {
    const count = attribute.count

    const itemSize = attribute.itemSize
    const normalized = attribute.normalized

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const newArray = new attribute.array.constructor(count * itemSize)
    const newAttribute = new THREE.BufferAttribute(newArray, itemSize, normalized)

    for (let i = 0; i < count; i += 1) {
        if (itemSize >= 3) {
            newAttribute.setX(i, (axis === AXIS_X ? -1.0 : 1.0) * attribute.getX(i))
            newAttribute.setY(i, (axis === AXIS_Y ? -1.0 : 1.0) * attribute.getY(i))
            newAttribute.setZ(i, (axis === AXIS_Z ? -1.0 : 1.0) * attribute.getZ(i))
        }
        // tangent's bitangent sign:
        if (itemSize === 4) {
            newAttribute.setW(i, -1.0 * attribute.getW(i))
        }
    }

    return newAttribute
}

function getMirroredGeometry(geometry: THREE.BufferGeometry, axis: Axis): THREE.BufferGeometry | null {
    if (!geometry) {
        return null
    }

    const newGeometry = geometry.clone()

    // currently, all our glbs have only attributes of type THREE.BufferAttribute
    const positions = newGeometry.getAttribute('position') as THREE.BufferAttribute
    if (positions) {
        if (positions.isBufferAttribute) {
            newGeometry.attributes.position = getMirroredAttribute(positions, axis)
        } else {
            Sentry.captureException(
                new Error(`Attempting to mirror a mesh with non-THREE.BufferAttribute position attribute.`))
        }
    }

    const normals = newGeometry.getAttribute('normal') as THREE.BufferAttribute
    if (normals) {
        if (normals.isBufferAttribute) {
            newGeometry.attributes.normal = getMirroredAttribute(normals, axis)
        } else {
            Sentry.captureException(
                new Error(`Attempting to mirror a mesh with non-THREE.BufferAttribute normal attribute.`))
        }
    }

    const tangents = newGeometry.getAttribute('tangent') as THREE.BufferAttribute
    if (tangents) {
        if (tangents.isBufferAttribute) {
            newGeometry.attributes.tangent = getMirroredAttribute(tangents, axis)
        } else {
            Sentry.captureException(
                new Error(`Attempting to mirror a mesh with non-THREE.BufferAttribute tangent attribute.`))
        }
    }

    // fix triangles "sides"
    const index = geometry.getIndex()
    const newIndices = []
    if (index) {
        for (let i = 0; i < index.count; i += 3) {
            newIndices.push(index.getX(i + 1))
            newIndices.push(index.getX(i + 0))
            newIndices.push(index.getX(i + 2))
        }
        newGeometry.setIndex(newIndices)
    }

    return newGeometry
}

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
    return ('isMesh' in object) && !!object.isMesh
}

/* eslint-disable no-param-reassign */
export function mirrorModel(root: THREE.Object3D, axis : Axis) {
    if (!root) {
        return
    }

    stoppableTraverse(root, (obj) => {
        if (isMesh(obj)) {
            const mirroredGeometry = getMirroredGeometry(obj.geometry, axis)
            if (mirroredGeometry) {
                obj.geometry.dispose()
                obj.geometry = mirroredGeometry
            }
        }
        obj.position.set(
            axis === AXIS_X ? -obj.position.x : obj.position.x,
            axis === AXIS_Y ? -obj.position.y : obj.position.y,
            axis === AXIS_Z ? -obj.position.z : obj.position.z
        )
        obj.updateMatrixWorld()
        // Bounding sphere is needed for correct frustum culling.
        if (isMesh(obj)) {
          obj.geometry.computeBoundingSphere()
        }
        return true
    })
}

function getStackingPolyFromSurface(stackableSurfaceItem: StackableSurfaceItem3D): StackablePolygon | null {
  const ssurfParams = stackableSurfaceItem.getPlane()
  const planeType = ssurfParams.parameters.type;
  if ( planeType === 'polygon' || planeType === 'circle') {
    const vertices = ssurfParams.parameters?.vertices;
    const sceneObject = stackableSurfaceItem.getObject();
    if (vertices && vertices.length > 0 && sceneObject) {
      return {
          vertices,
          worldToLocal: (q: THREE.Vector3): THREE.Vector3 => sceneObject.worldToLocal(q),
          localToWorld: (q: THREE.Vector3): THREE.Vector3 => sceneObject.localToWorld(q),
      };
    }
  }

  return null
}

// Gets the local normalized coordinates from a <worldPos3d> and a StackableSurfaceItem <fromSurf>.
//  [-1, 1]           [1, 1]
//      ________________
//     |                |
//     |                |
//     |                |
//     |        x       |
//     |      [0, 0]    |
//     |                |
//     |________________|
//
//  [-1, -1 ]         [1, -1]
export function getNormalizedPos(worldPos3d: THREE.Vector3, fromSurf: StackableSurfaceItem3D) {
  const fromPoly = getStackingPolyFromSurface(fromSurf)
  if (fromPoly) {
    const localPos3d = fromSurf.getObject()?.worldToLocal(worldPos3d)
    if (localPos3d) {
      const localPos2d = new Point2(0, 0).set(localPos3d.x, localPos3d.y);
      const fromPolyExtents = getPolyExtents(fromPoly.vertices)
      const normX = localPos2d.x / fromPolyExtents.x
      const normY = localPos2d.y / fromPolyExtents.y
    
      return new Point2 (normX, normY)
    }
  }

  return null
}

function getLocalPosFromNormalized(normCoords: Point2, toPoly: StackablePolygon) {
  const toExtents = getPolyExtents(toPoly.vertices)
  // Find destination rel pos.
  let localPos2d = new Point2(normCoords.x * toExtents.x, normCoords.y * toExtents.y);
  // If source polygon is square or rectangular and <toPoly> is a circumference, incoming <normCoords> (e.g 1,1) can be
  // outside of <toPoly> bounds. If so, we set the target position to the closest point in <toPoly> perimeter. 
  if (!isPointInsidePolygon2D(localPos2d, vertex2DIterator(toPoly.vertices))) {
    localPos2d = sqrdDistFromPointToPolygon(localPos2d, vertex2DIterator(toPoly.vertices)).target
  }
  return new THREE.Vector3(localPos2d.x, localPos2d.y, 0)
}

// Given a stackable normalized position <normCoords> in the destination surface <toSurf>, 
// return its new position in world space. If the destination stacking polygon cannot be retrieved from <toSurf>
// the function returns null.
export function findNewStackablePosition(normCoords: Point2, toSurf: StackableSurfaceItem3D):
  THREE.Vector3 | null {
    const toPoly = getStackingPolyFromSurface(toSurf)
    if (toPoly) {
      return getLocalPosFromNormalized(normCoords, toPoly)  
    }

  return null
}

// Gets the default look at heading so that the item default orientation makes sense in any view.
export function getClosestAxisAlignedHeading(heading: number) {
  // When adding new items from the catalog to the floor, we interpret the
  // heading relative to current view. (ie 0 azimuth angle will face the camera)
  const camera = gvCurrentCamera()?.getThreeCamera()
  if (camera) {
    // Reorder starting from yaw.
    const rot = camera.rotation.clone().reorder('YZX')
    // Compensate for camera rotation.
    return closestAxisAlignedAngle(heading + rot.y)
  }

  return undefined
}

// Returns the passed bounding box corner points, in circular order, starting with
// ground surface points to ceiling surface points.
export function getBoundingCorners(itemBbox: THREE.Box3): Point3[] {
  const low = itemBbox.min
  const high = itemBbox.max

  // Lower
  const corner1 = new Point3(low.x, low.y, low.z)
  const corner2 = new Point3(high.x, low.y, low.z)
  const corner3 = new Point3(high.x, low.y, high.z)
  const corner4 = new Point3(low.x, low.y, high.z)

  // Higher
  const corner5 = new Point3(low.x, high.y, low.z)
  const corner6 = new Point3(high.x, high.y, low.z)
  const corner7 = new Point3(high.x, high.y, high.z)
  const corner8 = new Point3(low.x, high.y, high.z)

  return [
      corner1, corner2, corner3, corner4,
      corner5, corner6, corner7, corner8,
  ]
}

// Passed a list of circular ordered vertices of a flat polygon; returns the
// polygon's centroid point using Green’s and Shoelace's Theorems.
export function getPolygonCentroid(vertices: THREE.Vector3[]): THREE.Vector3 | undefined {
  const n = vertices.length
  if (n === 0) {
    return undefined
  }

  if (n < 3) {
    const sum = vertices.reduce((acc, v) => acc.add(v), new THREE.Vector3(0, 0, 0))
    return sum.divideScalar(n)
  }

  let area = 0
  let cx = 0
  let cy = 0

  for (let i = 0; i < n; i += 1) {
    const current = vertices[i]
    const next = vertices[(i + 1) % n]
    const cross = current.x * next.y - next.x * current.y
    area += cross
    cx += (current.x + next.x) * cross
    cy += (current.y + next.y) * cross
  }

  area /= 2
  if (area === 0) {
    const sum = vertices.reduce((acc, v) => {
      acc.x += v.x
      acc.y += v.y
      return acc
    }, { x: 0, y: 0 })
    return new THREE.Vector3(sum.x / n, sum.y / n, vertices[0].z)
  }

  cx /= (6 * area)
  cy /= (6 * area)

  return new THREE.Vector3(cx, cy, vertices[0].z)
}
