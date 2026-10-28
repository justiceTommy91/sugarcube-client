/* eslint-disable class-methods-use-this */

import type { CameraController } from 'Renderer/multiview/camera_controller'
import type { CameraManagerSettings } from 'Renderer/multiview/camera_types'

export type OnSequenceStopCallback = (didFinish: boolean) => void
export type OnControllerSwitchCallback = () => void

export class CameraSequence {
  private controllers: CameraController[]
  private onStopCallback: OnSequenceStopCallback | null = null
  private onContollersSwitch: (OnControllerSwitchCallback | null) [] = []

  private animationHandle: number | null = null
  private currentControllerIdx: number
  private lastAnimateTime = -1

  constructor(
    controllers: CameraController[],
    onStopCallback?: OnSequenceStopCallback,
    onContollersSwitch?: (OnControllerSwitchCallback | null) [],
  ) {
    this.controllers = [...controllers]
    this.currentControllerIdx = -1
    this.animate = this.animate.bind(this)
    if (onStopCallback) {
      this.onStopCallback = onStopCallback
    }
    if (onContollersSwitch) {
      this.onContollersSwitch = onContollersSwitch
    }
  }

  public start(): void {
    this.animationHandle = requestAnimationFrame(this.animate)
    this.switchToNextController()
  }

  public stop(didFinish = false): void {
    if (this.animationHandle !== null) {
      cancelAnimationFrame(this.animationHandle)
    }
    const currentControler = this.getCurrentController()
    if (currentControler) {
      currentControler.stop()
    }
    if (this.onStopCallback) {
      this.onStopCallback(didFinish)
    }
  }

  public applySettings(settings: CameraManagerSettings) {
    this.controllers.forEach(controller => controller.applySettings(settings))
  }

  public getControllers() {
    return this.controllers
  }

  public getCurrentController(): CameraController | null {
    if (this.currentControllerIdx >= 0 && this.currentControllerIdx < this.controllers.length) {
      return this.controllers[this.currentControllerIdx]
    }
    return null
  }

  private switchToNextController() {
    let currentControler = this.getCurrentController()
    if (currentControler) {
      currentControler.stop()
      this.onContollersSwitch[this.currentControllerIdx]?.()
    }
    this.currentControllerIdx += 1
    if (this.currentControllerIdx >= this.controllers.length) {
      this.currentControllerIdx = -1
    }
    currentControler = this.getCurrentController()
    if (currentControler) {
      currentControler.start()
    }
  }

  private animate(timeMs: number) {
    if (this.lastAnimateTime < 0) {
      this.lastAnimateTime = timeMs
    }
    const dtSeconds = (timeMs - this.lastAnimateTime) * 0.001
    this.lastAnimateTime = timeMs

    const currentControler = this.getCurrentController()
    if (!currentControler) {
      this.stop(true)
      return
    }
    if (!currentControler.isFinished()) {
      currentControler.tick(dtSeconds)
    } else {
      this.switchToNextController()
    }
    this.animationHandle = requestAnimationFrame(this.animate)
  }
}
