import * as THREE from 'three'
import { Point2 } from 'Renderer/geometry/Point2'
import { Point3 } from 'Renderer/geometry/Point3'
import { Vector2 } from 'Renderer/geometry/Vector2'
import { Vector3 } from 'Renderer/geometry/Vector3'
import type { Matrix3x3 } from 'Renderer/geomviewer/geom_types'

export const toPoint2 = (v: THREE.Vector2) => new Point2(v.x, v.y)
export const toPoint3 = (v: THREE.Vector3) => new Point3(v.x, v.y, v.z)
export const toVector2 = (v: THREE.Vector2) => new Vector2(v.x, v.y)
export const toVector3 = (v: THREE.Vector3) => new Vector3(v.x, v.y, v.z)
export const toMat3x3 = (mat: THREE.Matrix4): Matrix3x3 => {
  const els = mat.elements
  return [
    [els[0], els[1], els[2]],
    [els[4], els[5], els[6]],
    [els[8], els[9], els[10]],
  ]
}