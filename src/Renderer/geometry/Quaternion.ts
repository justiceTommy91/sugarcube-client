// A plain-old-data quaternion type for compatibility with ThreeJS.
export type QuaternionPod = {
  x: number
  y: number
  z: number
  w: number
}

export function toQuat4(xyzw: number[]): QuaternionPod {
  return {
    x: xyzw[0],
    y: xyzw[1],
    z: xyzw[2],
    w: xyzw[3],
  }
}