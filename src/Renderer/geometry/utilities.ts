import type { PointXYZ, Quat4D, Matrix3x3, Matrix4x4 } from 'Renderer/geomviewer/geom_types'
import { EPSILON } from "./config"

// Return a new matrix, m = m1 * m2
export function multiplyMatrices3x3(m1: Matrix3x3, m2: Matrix3x3): Matrix3x3 {
  const res00 = m1[0][0] * m2[0][0] + m1[1][0] * m2[0][1] + m1[2][0] * m2[0][2]
  const res01 = m1[0][0] * m2[1][0] + m1[1][0] * m2[1][1] + m1[2][0] * m2[1][2]
  const res02 = m1[0][0] * m2[2][0] + m1[1][0] * m2[2][1] + m1[2][0] * m2[2][2]

  const res10 = m1[0][1] * m2[0][0] + m1[1][1] * m2[0][1] + m1[2][1] * m2[0][2]
  const res11 = m1[0][1] * m2[1][0] + m1[1][1] * m2[1][1] + m1[2][1] * m2[1][2]
  const res12 = m1[0][1] * m2[2][0] + m1[1][1] * m2[2][1] + m1[2][1] * m2[2][2]

  const res20 = m1[0][2] * m2[0][0] + m1[1][2] * m2[0][1] + m1[2][2] * m2[0][2]
  const res21 = m1[0][2] * m2[1][0] + m1[1][2] * m2[1][1] + m1[2][2] * m2[1][2]
  const res22 = m1[0][2] * m2[2][0] + m1[1][2] * m2[2][1] + m1[2][2] * m2[2][2]

  return [
    [res00, res10, res20],
    [res01, res11, res21],
    [res02, res12, res22],
  ]
}

// Return a new matrix, m = m1 * m2
export function multiplyMatrices4x4(m1: Matrix4x4, m2: Matrix4x4): Matrix4x4 {
  const res00 = m1[0][0] * m2[0][0] + m1[1][0] * m2[0][1] + m1[2][0] * m2[0][2] + m1[3][0] * m2[0][3]
  const res01 = m1[0][0] * m2[1][0] + m1[1][0] * m2[1][1] + m1[2][0] * m2[1][2] + m1[3][0] * m2[1][3]
  const res02 = m1[0][0] * m2[2][0] + m1[1][0] * m2[2][1] + m1[2][0] * m2[2][2] + m1[3][0] * m2[2][3]
  const res03 = m1[0][0] * m2[3][0] + m1[1][0] * m2[3][1] + m1[2][0] * m2[3][2] + m1[3][0] * m2[3][3]

  const res10 = m1[0][1] * m2[0][0] + m1[1][1] * m2[0][1] + m1[2][1] * m2[0][2] + m1[3][1] * m2[0][3]
  const res11 = m1[0][1] * m2[1][0] + m1[1][1] * m2[1][1] + m1[2][1] * m2[1][2] + m1[3][1] * m2[1][3]
  const res12 = m1[0][1] * m2[2][0] + m1[1][1] * m2[2][1] + m1[2][1] * m2[2][2] + m1[3][1] * m2[2][3]
  const res13 = m1[0][1] * m2[3][0] + m1[1][1] * m2[3][1] + m1[2][1] * m2[3][2] + m1[3][1] * m2[3][3]

  const res20 = m1[0][2] * m2[0][0] + m1[1][2] * m2[0][1] + m1[2][2] * m2[0][2] + m1[3][2] * m2[0][3]
  const res21 = m1[0][2] * m2[1][0] + m1[1][2] * m2[1][1] + m1[2][2] * m2[1][2] + m1[3][2] * m2[1][3]
  const res22 = m1[0][2] * m2[2][0] + m1[1][2] * m2[2][1] + m1[2][2] * m2[2][2] + m1[3][2] * m2[2][3]
  const res23 = m1[0][2] * m2[3][0] + m1[1][2] * m2[3][1] + m1[2][2] * m2[3][2] + m1[3][2] * m2[3][3]

  const res30 = m1[0][3] * m2[0][0] + m1[1][3] * m2[0][1] + m1[2][3] * m2[0][2] + m1[3][3] * m2[0][3]
  const res31 = m1[0][3] * m2[1][0] + m1[1][3] * m2[1][1] + m1[2][3] * m2[1][2] + m1[3][3] * m2[1][3]
  const res32 = m1[0][3] * m2[2][0] + m1[1][3] * m2[2][1] + m1[2][3] * m2[2][2] + m1[3][3] * m2[2][3]
  const res33 = m1[0][3] * m2[3][0] + m1[1][3] * m2[3][1] + m1[2][3] * m2[3][2] + m1[3][3] * m2[3][3]

  return [
    [res00, res10, res20, res30],
    [res01, res11, res21, res31],
    [res02, res12, res22, res32],
    [res03, res13, res23, res33],
  ]
}

export function makeRotationX(angleRadians: number): Matrix3x3 {
  const c = Math.cos(angleRadians)
  const s = Math.sin(angleRadians)
  return [
    [1,  0,  0],
    [0,  c,  s],
    [0, -s,  c],
  ]
}

export function makeRotationY(angleRadians: number): Matrix3x3 {
  const c = Math.cos(angleRadians)
  const s = Math.sin(angleRadians)

  return [
    [c,  0, -s],
    [0,  1,  0],
    [s,  0,  c],
  ]
}

export function makeRotationZ(angleRadians: number): Matrix3x3 {
  const c = Math.cos(angleRadians)
  const s = Math.sin(angleRadians)

  return [
    [ c,  s,  0],
    [-s,  c,  0],
    [ 0,  0,  1],
  ]
}

export function createIdentity3(): Matrix3x3 {
  return[
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
}

export function createIdentity4(): Matrix4x4 {
  return[
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ]
}

export function fromThreeMatrix4(threeMatrix: THREE.Matrix4): Matrix4x4 {
  const els = threeMatrix.elements
  return [
    [els[0], els[1], els[2], els[3]],
    [els[4], els[5], els[6], els[7]],
    [els[8], els[9], els[10], els[11]],
    [els[12], els[13], els[14], els[15]],
  ]
}

export function copyMatrix3(m: Matrix3x3): Matrix3x3 {
  return [
    [...m[0]],
    [...m[1]],
    [...m[2]],
  ]
}

export function copyMatrix4(m: Matrix4x4): Matrix4x4 {
  return [
    [...m[0]],
    [...m[1]],
    [...m[2]],
    [...m[3]],
  ]
}

export function transpose4(m: Matrix4x4) {
  let tmp = 0
  const swap = (i: number, j: number) => {
    tmp = m[i][j]; m[i][j] = m[j][i]; m[j][i] = tmp;
  }
  swap(1, 0)
  swap(2, 0)
  swap(3, 0)
  swap(2, 1)
  swap(3, 1)
  swap(3, 2)
}

export function transpose3(m: Matrix3x3) {
  let tmp = 0
  const swap = (i: number, j: number) => {
    tmp = m[i][j]; m[i][j] = m[j][i]; m[j][i] = tmp;
  }
  swap(1, 0)
  swap(2, 0)
  swap(2, 1)
}

export function extractPosition(m: Matrix4x4): PointXYZ {
  return { x: m[3][0], y: m[3][1], z: m[3][2] }
}

export function upperLeft3(m: Matrix4x4, out?: Matrix3x3): Matrix3x3 {
  const outMat: Matrix3x3 = out || [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
  outMat[0][0] = m[0][0]; outMat[0][1] = m[0][1]; outMat[0][2] = m[0][2];
  outMat[1][0] = m[1][0]; outMat[1][1] = m[1][1]; outMat[1][2] = m[1][2];
  outMat[2][0] = m[2][0]; outMat[2][1] = m[2][1]; outMat[2][2] = m[2][2];
  return outMat
}

export function extractQuaternionFromMat3(m: Matrix3x3): Quat4D {
  const m11 = m[0][0]; const  m12 = m[1][0]; const  m13 = m[2][0];
  const m21 = m[0][1]; const m22 = m[1][1]; const m23 = m[2][1];
  const m31 = m[0][2]; const m32 = m[1][2]; const m33 = m[2][2];

  const trace = m11 + m22 + m33
  let x = 0
  let y = 0
  let z = 0
  let w = 1
  if ( trace > 0 ) {
    const s = 0.5 / Math.sqrt(trace + 1.0)
    w = 0.25 / s
    x = (m32 - m23) * s
    y = (m13 - m31) * s
    z = (m21 - m12) * s
  } else if (m11 > m22 && m11 > m33) {
    const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33)
    w = (m32 - m23) / s
    x = 0.25 * s
    y = (m12 + m21) / s
    z = (m13 + m31) / s
  } else if (m22 > m33) {
    const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33)
    w = (m13 - m31) / s
    x = (m12 + m21) / s
    y = 0.25 * s;
    z = (m23 + m32) / s
  } else {
    const s = 2.0 * Math.sqrt( 1.0 + m33 - m11 - m22 )
    w = (m21 - m12) / s
    x = (m13 + m31) / s
    y = (m23 + m32) / s
    z = 0.25 * s
  }
  return [x, y, z, w]
}

export function extractQuaternionFromMat4(m: Matrix4x4): Quat4D {
  return extractQuaternionFromMat3(upperLeft3(m))
}

export function getInverted(m: Matrix4x4, out?: Matrix4x4): Matrix4x4 {
  const ret: Matrix4x4 = out || [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

  // Passed m and out might be the same array, cache values.
  const n11 = m[0][0]; const n21 = m[0][1]; const n31 = m[0][2]; const n41 = m[0][3];
  const n12 = m[1][0]; const n22 = m[1][1]; const n32 = m[1][2]; const n42 = m[1][3];
  const n13 = m[2][0]; const n23 = m[2][1]; const n33 = m[2][2]; const n43 = m[2][3];
  const n14 = m[3][0]; const n24 = m[3][1]; const n34 = m[3][2]; const n44 = m[3][3];

  const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44
  const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44
  const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44
  const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34

  const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14
  if (det === 0) {
    return ret
  }
  const detInv = 1 / det

  ret[0][0] = t11 * detInv
  ret[0][1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 +
    n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv
  ret[0][2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 -
    n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv
  ret[0][3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 +
    n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv

  ret[1][0] = t12 * detInv
  ret[1][1] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 -
    n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv
  ret[1][2] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 +
    n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv
  ret[1][3] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 -
    n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv

  ret[2][0] = t13 * detInv
  ret[2][1] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 +
    n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv
  ret[2][2] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 -
    n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv
  ret[2][3] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 +
    n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv

  ret[3][0] = t14 * detInv
  ret[3][1] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 -
    n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv
  ret[3][2] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 +
    n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv
  ret[3][3] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 -
    n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv

  return ret
}

/**
* Gets the transformation matrix from a position, quaterion and scale. 
* @param {Quat4D} quaternion
* @returns {Matrix4x4} The transformation 4x4 matrix.
*/
export function composeTransform(position: PointXYZ, quaternion: Quat4D, scale: PointXYZ): Matrix4x4 {
  const [qX, qY, qZ, qW] = quaternion

  const x = qX; const y = qY; const z = qZ; const w = qW
  const x2 = x + x; const	y2 = y + y; const z2 = z + z
  const xx = x * x2; const xy = x * y2; const xz = x * z2
  const yy = y * y2; const yz = y * z2; const zz = z * z2
  const wx = w * x2; const wy = w * y2; const wz = w * z2
  // Scale.
  const sx = scale.x; const sy = scale.y; const sz = scale.z

  const n11 = (1 - (yy + zz)) * sx
  const n21 = (xy + wz) * sx
  const n31 = (xz - wy) * sx
  const n41 = 0

  const n12 = (xy - wz) * sy
  const n22 = (1 - (xx + zz)) * sy
  const n32 = (yz + wx) * sy
  const n42 = 0

  const n13 = (xz + wy) * sz
  const n23 = (yz - wx) * sz
  const n33 = (1 - (xx + yy)) * sz
  const n43 = 0

  // Position.
  const n14 = position.x
  const n24 = position.y
  const n34 = position.z
  const n44 = 1

  return [
    [n11, n21, n31, n41],
    [n12, n22, n32, n42],
    [n13, n23, n33, n43],
    [n14, n24, n34, n44],
  ]
}

/**
 * Gets the rotation from a quaternion in a Matrix3x3 format.
 * @param quaternion 
 * @returns Rotation Matrix3x3.
 */
export function getRotationMatrixFromQuaternion(quaternion: Quat4D): Matrix3x3 {
  // For position 0, 0, 0 and scale 1, 1, 1, transformation matrix is a rotation matrix. 
  const transform = composeTransform({ x:0, y:0, z:0 }, quaternion,  { x:1, y:1, z:1 })
  return upperLeft3(transform)
}

/**
 * Gets the rotation around the Y-axis from a quaternion. We call this heading.
 * @param quaternion 
 * @returns Rotation respect the Y axis.
 */
export function getHeadingFromQuaternion(quaternion: Quat4D) {
  const qY = quaternion[1]
  const qW = quaternion[3]
  return 2 * Math.atan2(qY, qW)
}

/** Inverse of getHeadingFromQuaternion. */
export function yAxisRotationQuat(angle: number): Quat4D {
  return [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)]
}

/** Euler degrees (XYZ) to quaternion. */
export function degreesToQuat(deg: PointXYZ): Quat4D {
  const toRad = Math.PI / 180
  const cx = Math.cos(deg.x * toRad * 0.5)
  const sx = Math.sin(deg.x * toRad * 0.5)
  const cy = Math.cos(deg.y * toRad * 0.5)
  const sy = Math.sin(deg.y * toRad * 0.5)
  const cz = Math.cos(deg.z * toRad * 0.5)
  const sz = Math.sin(deg.z * toRad * 0.5)

  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ]
}

/**
 * Returns the nearest axis-aligned angle (0, π/2, π, 3π/2) to a given angle.
 * @param angle Angle in radians.
 * @returns Nearest axis-aligned angle in radians.
 */
export function closestAxisAlignedAngle(angle: number): number {
  const validAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]
  const differences = validAngles.map(a => Math.abs(Math.PI - Math.abs(Math.abs(angle - a) - Math.PI)))
  return validAngles[differences.indexOf(Math.min(...differences))]
}

/**
 * Returns two points which are the closest to each other on given two lines.
 * source: https://gamedev.stackexchange.com/questions/9738/points-on-lines-where-the-two-lines-are-the-closest-together
 * @param point1 Starting point of the first line.
 * @param direction1 Direction of the first line.
 * @param point2 Starting point of the second line.
 * @param direction2 Direction of the second line.
 * @returns [closestPoint1, closestPoint2] first on the first line, second on the second line.
 */
export function closestPointsOnTwoLines(
  point1: PointXYZ,
  direction1: PointXYZ,
  point2: PointXYZ,
  direction2: PointXYZ,
) {
  const a = direction1.x * direction1.x + direction1.y * direction1.y + direction1.z * direction1.z
  const b = direction1.x * direction2.x + direction1.y * direction2.y + direction1.z * direction2.z
  const e = direction2.x * direction2.x + direction2.y * direction2.y + direction2.z * direction2.z
  const d = a * e - b * b

  const r = { x: point1.x - point2.x, y: point1.y - point2.y, z: point1.z - point2.z }
  const c = direction1.x * r.x + direction1.y * r.y + direction1.z * r.z
  const f = direction2.x * r.x + direction2.y * r.y + direction2.z * r.z

  const s = (b * f - c * e) / d
  const t = (a * f - b * c) / d

  return [
    { x: point1.x + direction1.x * s, y: point1.y + direction1.y * s, z: point1.z + direction1.z * s },
    { x: point2.x + direction2.x * t, y: point2.y + direction2.y * t, z: point2.z + direction2.z * t },
  ]  
}

export function createMatrix4Elements(position: PointXYZ, rotation: Quat4D): number[] {
  const matrix: Matrix4x4 = composeTransform(position, rotation, { x: 1, y: 1, z: 1 })
  transpose4(matrix)
  return matrix.flat()
}

// ---------------------------------------------------------------------------
// Plane helpers
// ---------------------------------------------------------------------------

/** Origin point on a plane. */
export function planeOrigin(d: number, normal: number[]): PointXYZ {
  return { x: -d * normal[0], y: -d * normal[1], z: -d * normal[2] }
}

/** UV to world-space point on a plane. */
export function uvToWorld(p0: PointXYZ, u: number, xAxis: number[], v: number, yAxis: number[]): PointXYZ {
  return {
    x: p0.x + u * xAxis[0] + v * yAxis[0],
    y: p0.y + u * xAxis[1] + v * yAxis[1],
    z: p0.z + u * xAxis[2] + v * yAxis[2],
  }
}

/** Signed distance from point to plane. */
export function signedDistToPlane(point: PointXYZ, normal: number[], d: number): number {
  return point.x * normal[0] + point.y * normal[1] + point.z * normal[2] + d
}

/** Dot product of number[3] with PointXYZ. */
export function dot3(a: number[], b: PointXYZ): number {
  return a[0] * b.x + a[1] * b.y + a[2] * b.z
}

export function getHasPointChanged(point1: PointXYZ, point2: PointXYZ) {
  const hasChangedX = Math.abs(point1.x - point2.x) > EPSILON
  const hasChangedY = Math.abs(point1.y - point2.y) > EPSILON
  const hasChangedZ = Math.abs(point1.z - point2.z) > EPSILON

  return hasChangedX || hasChangedY || hasChangedZ
}
