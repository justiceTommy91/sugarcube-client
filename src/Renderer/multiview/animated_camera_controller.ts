/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
import { CameraController } from 'Renderer/multiview/camera_controller'
import type { GeomCamera } from 'Renderer/multiview/geom_camera'
import type { CameraManagerSettings } from 'Renderer/multiview/camera_types'

/**
 * AnimatedCameraController is a base class for controllers that
 * programmatically control the camera, e.g. using THREE.AnimationClip or other means.
 */
export class AnimatedCameraController implements CameraController {
  protected camera: GeomCamera

  constructor (camera: GeomCamera, settings: CameraManagerSettings) {
    this.camera = camera
    this.applySettings(settings)
  }

  // When CameraController event handlers return "true" input event is considered handled
  // and we stop there, otherwise it is passed further to InputHandler.
  // We don't want to invoke InputHandler for AnimatedCameraController's pointer events
  // so we return "true" for these here.
  public onPointerMove(event: PointerEvent): boolean { return true }
  public onPointerDown(event: PointerEvent): boolean { return true }
  public onPointerUp(event: PointerEvent): boolean { return true }
  public onPointerLeave(): boolean { return true }
  public onPointerOver(event: PointerEvent): boolean { return true }

  applySettings(settings: CameraManagerSettings) {}

  isFinished(): boolean {
    return false
  }

  start(): void {
  }

  stop(): void {
  }

  tick(dt: number): void {
  }
}
