import { QuaternionPod, Point3Pod } from 'Renderer/geometry'

// Geomagical camera intrinsics.
export type CameraIntrinsics = {
  // X focal length in pixels, i.e. <focal length> / <pixel width>.
  focalLengthX: number;
  // Y focal length in pixels, i.e. <focal length> / <pixel height>.
  focalLengthY: number;
  // X principal point in pixels from top left corner of the image.
  principalPointX: number;
  // Y principal point in pixels from top left corner of the image.
  principalPointY: number;
  // image width in pixels.
  imageWidth: number;
  // image height in pixels.
  imageHeight: number;
}

export type CameraExtrinsics = {
  // World position of the camera object.
  position: Point3Pod;
  // World rotation of the camera object.
  rotation: QuaternionPod;
}

export type CameraView = {
  position: Point3Pod
  rotation: QuaternionPod
  intrinsics: CameraIntrinsics
  near: number
  far: number
}

export type CameraManagerSettings = {
  orbitMinElevationDeg?: number
  orbitMaxElevationDeg?: number
  orbitWheelDolly?: boolean
}