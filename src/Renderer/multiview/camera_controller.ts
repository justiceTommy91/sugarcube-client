import type { CameraManagerSettings } from 'Renderer/multiview/camera_types'

export interface CameraController {
  applySettings(settings: CameraManagerSettings): void
  isFinished(): boolean
  start(): void
  stop(): void
  tick(dtSeconds: number): void

  // User control methods must return true if event is handled, otherwise it will be passed to InputHandler.
  onPointerMove?(event: PointerEvent): boolean
  onPointerDown?(event: PointerEvent): boolean
  onPointerUp?(event: PointerEvent): boolean
  onPointerLeave?(): boolean
  onPointerOver?(event: PointerEvent): boolean
  onWheelMove?(even: WheelEvent): boolean
  onKeyDown?(event: KeyboardEvent): boolean
  onKeyUp?(event: KeyboardEvent): boolean
  onCanvasResize?(): boolean
}