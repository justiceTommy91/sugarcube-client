/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import { easeInOutCubic, easeOutCubic } from 'Renderer/utils/math_utils'
import { AnimatedCameraController } from 'Renderer/multiview/animated_camera_controller'
import { GeomCamera } from 'Renderer/multiview/geom_camera'
import type { CameraPath } from 'Renderer/multiview/camera_path'
import { gvGeomModel } from 'Renderer/foundation/geom_app'
import type { CameraManagerSettings } from 'Renderer/multiview/camera_types'

export class PathCameraController extends AnimatedCameraController {
  private path: CameraPath
  private clipAction: THREE.AnimationAction | null = null
  private animationMixer: THREE.AnimationMixer | null = null
  private elapsed = 0
  private easeFunc = easeOutCubic

  constructor(camera: GeomCamera, settings: CameraManagerSettings, path: CameraPath, easeFunc = easeOutCubic) {
    super(camera, settings)
    this.path = path
    this.easeFunc = easeFunc
  }

  start(): void {
    const threeCamera = this.camera.getThreeCameraProxy()
    if (!threeCamera) {
      return
    }

    const clip = new THREE.AnimationClip(`PathCameraController`, -1, this.path.getTracks())
    this.animationMixer = new THREE.AnimationMixer(threeCamera)
    this.clipAction = this.animationMixer.clipAction(clip)
    this.clipAction.clampWhenFinished = true
    this.clipAction.setLoop(THREE.LoopOnce, -1).play()
  }

  public stop(): void {
    if (!this.clipAction) {
      return
    }
    // Calling ClipAction.stop() will reset the animation to initial state,
    // i.e. returning the camera to initial position/rotation.
    this.clipAction.paused = true
  }

  tick(dt: number): void {
    if (this.isFinished()) {
      return
    }
    const t1 = this.easeFunc(this.elapsed / this.path.getDuration()) * this.path.getDuration()
    this.elapsed += dt
    const t2 = this.easeFunc(this.elapsed / this.path.getDuration()) * this.path.getDuration()
    const dtWithEasing = Math.max(t2 - t1, 0.001)

    this.animationMixer?.update(dtWithEasing)
    this.camera.getThreeCamera()?.syncPathAnimationFrame()
    gvGeomModel()?.setRendererIsDirty()
  }

  public override isFinished(): boolean {
    const isRunning = this.clipAction?.isRunning() || false
    return !isRunning
  }
}