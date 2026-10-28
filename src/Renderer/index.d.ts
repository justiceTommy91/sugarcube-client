
import { PlaneData, PointXYZ } from "Renderer/geomviewer/geom_types"
import type { ColorIdRenderer } from './ColorIdRenderer'
import { GpuMemoryStats, PerformanceStats } from "./geomviewer/geom_stats"
import { GlContextInfo, type ColorRepresentation } from "./geomviewer/geom_types"
import type FurnitureManager from "./FurnitureManager"
import type FurnitureItem3D from "./model/FurnitureItem3D"
import type { PinsManager } from "./PinsManager"
import { DebugSettings } from "./geomviewer/geom_debug"
import type { ImageBasedScene } from "./rendering/ImageBasedScene"
import type { RenderItem3D } from './model/RenderItem3D'
import type { StackableSurfaceItem3D } from './model/StackableSurfaceItem3D'

export type StackableSurfaceQueryResult = {
  stackablePlaneId: string;
  worldPoint: THREE.Vector3 | null;
  directHit: boolean;
  parentPoint: THREE.Vector3 | null;
  localPoint: PointXYZ | null
}

export type RendererLoadingStats = {
  msBuildScene: number
  msFirstFrame: number
  msTotalRenderingTime: number
}

export default class Renderer {
  cubeTex: THREE.Texture
  settings: ViewerSettings
  debugSettings: DebugSettings
  pinsManager?: PinsManager
  maxTextureSize: number

  furnitureManager: FurnitureManager
  scene: ImageBasedScene
  highlightOff(): void
  highlightOn(isFloorMode: boolean): void
  onChildUpdate(oneTimeRenderCallback: (() => void) | null = null): void
  addToScene(item: BaseItem): void
  removeFromScene(item: BaseItem): void
  incrementLoadedItems(size: number): void
  decrementLoadedItems(size: number): void
  addObjectToOutline(object: THREE.Object3D, selected: boolean): void
  removeObjectFromOutline(object: THREE.Object3D): void
  updateOutline(): void
  setOutlineThickness()
  getLightDirectionByIndex(planeIndex): number

  getCamera(): THREE.Camera

  getThreeRenderer(): THREE.WebGLRenderer

  sceneFront: THREE.Scene

  sceneOcclusion: THREE.Scene

  colorIdRenderer?: ColorIdRenderer

  activeRenderer: boolean
  getHasRendered(): boolean

  fullyInitialized: boolean

  static getInstance(): Renderer | undefined
  static newInstance(params: object): void

  queryGpuMemoryUsage(): GpuMemoryStats
  getHistogramStats(): PerformanceStats
  getRoomGlbStats(): { totalModelsLoadSizeMB: number, modelsCount: number }
  getRoomAdditionalStats(): { sceneAdditionalDataSizeMB: number }
  isWeblGlContextLost(): boolean

  getLoadingStats(): RendererLoadingStats

  updateSettings(flatSettings: object, settings: ViewerSettings): void
  updateDebugSettings(settings: object): void

  // API backdoor to get feature flags from the renderer. Returns the current value
  // of a feature flag by its property name in the Renderer's settings.
  getFeatureFlagByKeyName(key: string): boolean | Promise<boolean>

  getMagicEraserMode(): boolean

  isRendererValid(): boolean;

  setRenderIsDirty(): void

  cleanup(): void;

  incrementLoadingItems(): void
  decrementLoadingItems(): void

  getSceneFront(): THREE.Scene | null
  getSceneOcclusion(): THREE.Scene | null
  getRenderItem(itemId: string): RenderItem3D | undefined
  getObjectIdAtPoint(relX: number, relY: number): number | null
  getStackedItemsForParent(parentId: string): (FurnitureItem3D)[]
  getStackedItemsForSurfaces(surfaceIds: string[]): Map<string, FurnitureItem3D[]> | undefined
  getIsSurfaceErased(surfaceId: string | undefined): boolean

  hasMagicEraserData(): boolean
  getNumErasableSegments(): number
  getNumStaticStackableSurfaces(): number

  shouldUseFrontSideShadows(): boolean
  shouldUseXRay(): boolean

  getRenderItems(): IterableIterator<RenderItem3D> | undefined
  getAllStackableSurfaces(): Map<string, StackableSurfaceItem3D>
  getEnvMapIntensity(): number
  takeRoomScreenshot(
    onSuccess: (thumb: { thumbDataUrl: string }) => void,
    onError: ((err: unknown) => void) | null,
    issuer: string,
  ): void
  useFilmicLUT: boolean

  onMouseMove(relXY: [number, number]): void
  onClick(relXY: [number, number]): void
  onCanvasResize(): void
  requestNotificationOnDrawIdle(): void

  getRenderDimensions(): [number, number]
  getWallDimensions(): [number, number]
  getObjectIdAtPointUsingBbox(relX: number, relY: number,
    findNearest?: boolean, filterFn?: (item: RenderItem3D) => boolean): number | null
  isWallSnapSupported(): boolean
  setStaticFurnitureViz(onoff: boolean): void
  eraseSegmentsFromStrokes(
    strokes: [number, number][][],
    brushWidth?: number,
    overrides?: { forceErased?: number[]; forceVisible?: number[] },
  ): void
  checkSupportWallOrFloorItems(): boolean
  intrinsics: number[]
  planeOrientation: PlaneData | null
  contextInfo: GlContextInfo

  setWallColor(color?: ColorRepresentation)
  recordItemForDelayedReparenting(item: FurnitureItem3D, newParentId: string)
  getContactShadowTexRenderTarget(): THREE.WebGLRenderTarget
  getContactShadowCamera(): THREE.PerspectiveCamera

  addStackingSurface(item: StackableSurfaceItem3D)
  assetsList: RoomGLTFAssets | SceneManifest
}
