import {
  LinearInterpolant,
  VectorKeyframeTrack,
  Vector3, Quaternion,
  Matrix4,
} from "three"

// Position represented as quat and distance from origin.
type Polar = {
  rotation: Quaternion
  distance: number
}

// Converts vector position into its polar representation.
function convertPositionToPolar(center: Vector3, up: Vector3, position: Vector3): Polar {
  // Get position relative to center
  const relativePosition = position.clone().sub(center)

  // Compute the rotation and distance
  const distance = relativePosition.length()
  const lookAt = new Matrix4().lookAt(relativePosition.normalize(), new Vector3(), up)
  const rotation = new Quaternion().setFromRotationMatrix(lookAt)
  return { rotation, distance };  
}

// Converts polar position back into its vector representation.
function convertPolarToPosition(center: Vector3, polar: Polar): Vector3 {
  return new Vector3(0, 0, 1).applyQuaternion(polar.rotation)
    .normalize().multiplyScalar(polar.distance).add(center)
}

function lerp(a: number, b: number, alpha: number) {
  return a + alpha * (b - a)
}

class CircularInterpolant extends LinearInterpolant {
  private center: Vector3
  private up: Vector3
  private initialPolarPos: Polar
  private targetPolarPos: Polar

  constructor(
    parameterPositions: Float32Array,
    sampleValues: Float32Array,
    centerPoint: Vector3,
    upWorld: Vector3,
    sampleSize: number,
    resultBuffer?: Float32Array,
  ) {
    super(parameterPositions, sampleValues, sampleSize, resultBuffer)
    this.center = centerPoint
    this.up = upWorld

    // Decompose initial position into polar coordinates
    const initialPos = new Vector3(...sampleValues.slice(0, 3))
    this.initialPolarPos = convertPositionToPolar(centerPoint, upWorld, initialPos)

    // Decompose target position into polar coordinates
    const targetPos = new Vector3(...sampleValues.slice(-3))
    this.targetPolarPos = convertPositionToPolar(centerPoint, upWorld, targetPos)
  }

  // eslint-disable-next-line no-underscore-dangle
  override interpolate_(i1: number, t0: number, t: number, t1: number) {
    const weight = ( t - t0 ) / ( t1 - t0 )
    const rotation = this.initialPolarPos.rotation.clone().slerp(this.targetPolarPos.rotation, weight)
    const distance = lerp(this.initialPolarPos.distance, this.targetPolarPos.distance, weight)
    const position = convertPolarToPosition(this.center, { rotation, distance })
    this.resultBuffer[0] = position.x
    this.resultBuffer[1] = position.y
    this.resultBuffer[2] = position.z
    return this.resultBuffer    
  }
}

// Extending THREE.KeyFrameTrack's straight line interpolation 
// with a custom circular path interpolation.
export class CircularVectorKeyframeTrack extends VectorKeyframeTrack {
  private center: Vector3
  private up: Vector3

  constructor(
    name: string,
    times: number[],
    values: number[],
    center: Vector3,
    up: Vector3,
    interpolation?: THREE.InterpolationModes,
  ) {
    super(name, times, values, interpolation)
    this.center = center
    this.up = up
  }

  override InterpolantFactoryMethodLinear(result: Float32Array) {
    return new CircularInterpolant(
      this.times,
      this.values,
      this.center,
      this.up,
      this.getValueSize(),
      result
    )
  }
}
  