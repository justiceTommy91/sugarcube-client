import * as THREE from 'three'

import { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'

import { GpuMemoryStats } from 'Renderer/geomviewer/geom_stats'
import { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import { ViewerSettings } from 'Renderer/geomviewer/geom_types'
import { ThumbnailGenerationResult, RenderCallback } from 'Renderer/rendering/rendering_types'
import TimeMetric from 'utils/timeMetric'

export interface RenderEngine<T extends GeomBaseScene> {
  isValid: () => boolean

  getThreeRenderer: () => THREE.WebGLRenderer | null

  getCamera: () => THREE.PerspectiveCamera

  getHasRendered: () => boolean

  initSize: (width: number, height: number) => void,

  getScreenSize: () => THREE.Vector2,

  onCanvasResize: () => void,

  takeRoomScreenshot: (
    onSuccess: (ressult: ThumbnailGenerationResult) => void,
    onError: (error: Error) => void,
    issuer: string
  ) => void,

  setScene: (scene: T) => void,

  getScene: () => T | null,

  startRenderLoop: () => void,

  stopRenderLoop: () => void,

  setDirty: () => void,

  cleanup: () => void

  enableOutline: (enable: boolean) => void

  isWeblGlContextLost: () => boolean

  changeViewerSettings: (settings: ViewerSettings) => void,

  changeDebugSettings: (debugSettings: DebugSettings) => void,

  queryGpuMemoryUsage: () => GpuMemoryStats,

  addObjectToOutline: (object: THREE.Object3D, selected: boolean) => void

  removeObjectFromOutline: (object: THREE.Object3D) => void

  updateOutline: () => void

  setOutlineThickness: () => void

  setFrameMetric: (metric: TimeMetric) => void

  addRenderCallback: (callback: RenderCallback) => void

  requestNotificationOnDrawIdle: () => void

  registerBeforeRenderHook: (callback: RenderCallback) => void

  registerAfterRenderHook: (callback: RenderCallback) => void
}
