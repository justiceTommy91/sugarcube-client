/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
import { CameraController } from 'Renderer/multiview/camera_controller'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import type { CameraManagerSettings } from 'Renderer/multiview/camera_types'

/**
 * UserCameraController is a base class for camera controllers that use UserInput to control the camera.
 */
export class UserCameraController implements CameraController {
  protected camera: GeomCamera
  protected isActive = false

  constructor (camera: GeomCamera, settings: CameraManagerSettings) {
    this.camera = camera
    this.applySettings(settings)
  }

  applySettings(settings: CameraManagerSettings) {}

  isFinished(): boolean {
    // A user controller never finishes by itself.
    return false
  }

  start(): void {
    this.isActive = true
  }

  stop(): void {
    this.isActive = false
  }

  tick(dt: number): void {}
}