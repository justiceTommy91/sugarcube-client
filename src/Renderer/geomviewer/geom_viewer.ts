
/**
 * GeomViewer
 * The Geomagical Viewer library.
 */
import { NotificationDispatcher } from 'Renderer/NotificationDispatcher';
import { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import {
  GpuMemoryStats,
  PerformanceStats,
  SceneLoadingStats,
  RoomDownloadStats,
  SceneItemMetrics,
} from 'Renderer/geomviewer/geom_stats'
import {
  GvResult,
  GlContextInfo,
  ModifyItemParameters,
  CameraModeParameters,
  PersistUserData,
  SceneInfo,
  SceneItemParameters,
  ViewerSettings,
  ViewerStatus,
  ViewerAction,
  ViewerInfo,
  SceneItemInfo,
  ColorRepresentation,
  Composition,
  CompositionExport,
  RoomDimensionsInfo,
  ProductDimensionsInfo,
  DynamicMeasurementsInfo,
  Point2D,
  PointXYZ,
  PlacementFromStrokesResult,
  AdjustedPlacementInfo,
} from 'Renderer/geomviewer/geom_types'

/**
 * Global GeomViewer API object.
 *
 * Usage:
 * import * as gv from 'Renderer/geomviewer'
 * gv.initGeomViewerLib();
 * const gvApi = gv.GeomViewer.bindings;
 * gvApi.startViewer(...);
 */


export interface GeomViewerType {
  /**
   * Return the Grand Central notification dispatcher. Attach an observer to this
   * dispatcher to receive notifications for asynchronous viewer events, such as
   * download errors. GrandCentral transcends the start/shutdown lifetime of the
   * viewer.
   * @return {NotificationDispatcher}
   */
  getGrandCentral: () => NotificationDispatcher,

  /**
   * Start the viewer in the given canvas to display the given scene.
   * @param canvas {HTMLCanvasElement} The canvas to use as webgl render target.
   * @param scene {SceneInfo} The information for the scene to show in the canvas.
   * @param restoredUserProps {PersistUserProperties} A bag (object) of properties
   *     referring to user data restored with this scene, such as segments erased in
   *     the magic window. May be empty.
   * @param viewerSettings {ViewerSettings} Settings for the initial viewer configuration.
   * @param debugSettings {DebugSettings} Initial debug configuration in developer mode.
   * @param onUpdateUserProperties {function} A function the viewer can call to update
   *     properties that should be persisted when the user saves the composition.
   * @return {Error | undefined} An error if the viewer fails to start or undefined
   *     otherwise. Note that errors arising from asynchronous operations, such as loading
   *     background data, are reported through the Grand Central notification dispatcher.
   */
  startViewer: (
    canvas: HTMLCanvasElement,
    scene: SceneInfo,
    restoredUserProps: PersistUserData,
    viewerSettings: ViewerSettings,
    debugSettings: DebugSettings,
    onUpdateUserProperties: (userProps: PersistUserData) => void,) => GvResult,

  /**
   * Shutdown the viewer and release all resources.
   */
  shutdownViewer: () => void,

  /**
   * Modify the viewer settings after the viewer has started.
   * @param settings {ViewerSettings} The new settings to apply.
   */
  changeViewerSettings: (settings: ViewerSettings) => void,

  /**
   * Sets the current view in multi-view scenes. Given view label should match
   * one of the views returned by `queryViewerInfo`.
   * @param view {string} Label of the view.
   * 
   * TODO (cang): Keeping this optional until implemented.
   */
  setCurrentView?: (view: string) => void,

  /**
   * Update the thumbnail for given view index.
   */
  updateViewThumbnail: (canvas: HTMLCanvasElement, viewId: string) => void,

  /**
   * Modify the debug settings after the viewer has started.
   * @param debugSettings {DebugSettings} The new debug settings to apply.
   */
  changeDebugSettings: (debugSettings: DebugSettings) => void,

  /**
   * Return the current status of the viewer.
   * @returns the current viewer status.
   */
  getViewerStatus: () => ViewerStatus,

  /**
   * Return the WebGL context information. The data returned is valid only after
   * successful initialization of the Viewer.
   * @returns the current webgl-context info, or undefined if not available.
   */
  getGlContextInfo: () => GlContextInfo | undefined,

  /**
   * Return general viewer information. The info returned is valid only when the
   * viewer is in the 'ready' or 'running' state.
   * @returns {ViewerInfo}
   */
  queryViewerInfo: () => ViewerInfo,

  /**
   * Return GPU memory usage information.
   * @returns The current memory-usage statistics.
   */
  queryGpuMemoryUsage: () => GpuMemoryStats,

  /**
   * Return Viewer performance statistics.
   * @returns the current performance statistics, or undefined if not available.
   */
  queryPerformanceStats: () => PerformanceStats | undefined,

  /**
   * Return room and furniture download information, such as download size.
   * @returns the download statistics for the current room.
   */
  queryDownloadMetrics: () => RoomDownloadStats,

  querySceneLoadingStats: () => SceneLoadingStats,

  queryRoomDimensionsInfo: () => RoomDimensionsInfo | undefined,

  queryProductDimensionsInfo: (itemId: string) => ProductDimensionsInfo | undefined,

  queryDynamicMeasurementsInfo: () => DynamicMeasurementsInfo | undefined

  /**
   * Handles UIEvents such as PointerEvent, KeyboardEvent.
   */
  handleUIEvent: (event: UIEvent, renderItemId?: number, buttons?: number) => void,

  /**
  * Performs user actions that cannot be classified as mouse or
  * keyboard events. Returns an error if specified action is not valid
  * in current context.
  * @param action {ViewerAction} User action to be performed.
  */
  doAction: (action: ViewerAction) => GvResult,

  // TODO(georges): Remove '?' once implemented.

  /**
   * Query the metrics associated with an item in the scene.
   * @param itemId The ID of the item whose metrics are queried.
   * @returns GvResult with item metrics in retValue on success.
   */
  queryItemMetrics: (itemId: string) => GvResult<SceneItemMetrics>,

  /**
   * Query and return information about a scene item given its ID.
   * @param itemId the scene-item unique ID.
   * @returns GvResult with scene-item info.
   */
  querySceneItemInfo: (itemId: string) => GvResult<SceneItemInfo>,

  /**
   * Add an item, such as wall-art or furniture, to the scene.
   * 
   * If the SceneItemParameters indicate this is a stackable item but there's no
   * 'stackOnSurfaceId' parameters and position provided, this will start the 'stackable
   * placement mode' which allows user to drag and place the item on available surfaces
   * in the scene. 
   * @see ViewerAction for more information regarding placement mode.
   * 
   * @param uniqueId A string ID that uniquely identifies the item for both the
   *     caller and the Viewer.
   * @param itemParameters Parameters used to configure the item being added to
   *     the scene. Includes the kind of item being added and configuration data
   *     specific to each item type.
   * @returns GvResult. Note that adding an item to the scene is an asynchronous
   *     process in most cases. Thus the addition may still fail. Failures after
   *     the function returns are reported as notifications through GrandCentral.
   */
  addSceneItem: (
    uniqueId: string,
    itemParameters: SceneItemParameters) => GvResult,

  /**
   * Remove item with the given ID from the scene and discard it.
   * @param itemId The ID of the item to be removed.
   * @returns GvResult
   */
  deleteSceneItem: (itemId: string) => GvResult,

  /**
  * Select item with the given ID from the scene.
  * @param itemId The ID of the item to be selected.
  * @returns GvResult
  */
  selectSceneItem: (itemId: string) => GvResult,

  /**
   * Modify a scene item in-place. What aspect of a scene item can be modified
   * depends on the item type. For instance, for art items, the frame can be
   * changed.
   * @param itemId The ID of the item to be edited.
   * @param modifyParameters Specifies what aspect(s) of the item are to be
   *     modified. The exact content of this parameter depends on the item type.
   * @returns GvResult
   */
  modifySceneItem: (
    itemId: string,
    modifyParameters: ModifyItemParameters) => GvResult,

  /**
   * Tell the viewer that the item with the given ID is about to be swapped out and
   * replaced with another item. A call to aboutToSwapItem should be followed by
   * a call to deleteSceneItem to delete the item that is being swapped out and
   * addSceneItem to add the item that replaces it. These two functions can be
   * called in any order.
   *
   * In response to aboutToSwapItem, the viewer will prepare for the swap operation,
   * including setting aside any necessary state, such as the item's position.
   *
   * If there is any mismatch in the calls to these three functions, such as, for
   * instance a mismatched itemId in the call the deleteSceneItem, the swap is
   * cancelled and the sequence becomes a regular add and delete.
   * @param itemId The ID of the item being swapped out.
   * @returns {GvResult}
   */
  aboutToSwapItem: (itemId: string) => GvResult,

  /**
   * Sets walls color in the current room.
   * @param color {ColorRepresentation}
   */
  setWallColor: (color?: ColorRepresentation) => void,

  setCameraMode: (parameters: CameraModeParameters) => void,
  forceOrbitModeAllowed: (allowed: boolean) => void,

  setRoomDimensionsEnabled: (enabled: boolean) => void,
  setProductDimensionsEnabled: (enabled: boolean) => void,
  setDynamicMeasurementsEnabled: (enabled: boolean) => void,

  /**
   * Set to zoom as a percent of the default zoom level for the current view.
   * @param factor represents the zoom level as a percentage of the default zoom level.
   *    A factor of 1.0 represents the default zoom level.
   *    A factor greater than 1.0 represents zooming in.
   *    A factor less than 1.0 represents zooming out.
   */
  zoom: (factor: number) => void,

  setCameraDollyDistance: (value: number) => void,
  setLeftButtonPanningEnabled: (value: boolean) => void,

  loadComposition: (composition: Composition) => void
  exportComposition: () => CompositionExport

  /**
   * Exports the current scene generated envmap from the scene.
   * It exports it to a .hdr file blob internally before exporting.
   * @returns {Blob}
   */
  exportEnvmap: () => Blob | null

  signalCompositionLoadingBegin: ()  => void
  signalCompositionLoadingEnd: ()  => void

  /**
   * Request GPU stats.
   * This is an async request. 
   * Results will be dispatched via GrandCentral.
   */
  requestGPUStats: (benchmarksURL?: string) => void

  /**
   * Given a set of strokes (arrays of normalized [x,y] points in 0-1 range),
   * determine the dominant scene surface and compute placement info.
   */
  queryPlacementFromStrokes: (
    strokes: Point2D[][],
    options?: { forceFloorPlacement?: boolean, brushWidth?: number }
  ) => GvResult<PlacementFromStrokesResult>

  /**
   * Given a prior placement result and new dimensions, re-compute placement
   * corners with constraint validation and anchor control.
   */
  queryAdjustedPlacement: (
    prior: PlacementFromStrokesResult,
    newDimensions: { width: number; height: number; depth: number },
    options?: {
      forceFloorPlacement?: boolean
      widthAnchor?: 'min' | 'max'
      heightAnchor?: 'min' | 'max'
    }
  ) => GvResult<AdjustedPlacementInfo>

  /**
   * Given a prior placement result, shift its uvBounds by the projection of
   * worldDelta onto the surface's UV axes and re-compute placement. Dimensions
   * are preserved. Used to sync the bounding box to an item's new position
   * after it's been dragged.
   */
  queryMovedPlacement: (
    prior: PlacementFromStrokesResult,
    worldDelta: PointXYZ,
    options?: { forceFloorPlacement?: boolean }
  ) => GvResult<AdjustedPlacementInfo>

  /**
   * Hide magic-eraser segments touched by the given strokes.
   * Resets all segments to visible first, then erases those under stroke points.
   * If strokes is empty, all segments are shown (full reset).
   *
   * Optional overrides are applied after the geometric computation so manual
   * user toggles survive auto-erase: forceVisible is removed from the erase
   * set, forceErased is added to it.
   */
  eraseSegmentsFromStrokes: (
    strokes: Point2D[][],
    options?: {
      brushWidth?: number
      overrides?: { forceErased?: number[]; forceVisible?: number[] }
    }
  ) => void

  /**
   * Return the current viewport (WebGL canvas) pixel dimensions.
   * @returns `{ width, height }` or undefined if the viewer is not ready.
   */
  getViewportSize: () => { width: number; height: number } | undefined

  /**
   * Render the current scene with flat lighting (no shadows, no direct specular)
   * and return the result as an HTMLCanvasElement.
   * @param width - Width of the output canvas in pixels.
   * @param height - Height of the output canvas in pixels.
   * @returns The rendered HTMLCanvasElement, or undefined if the viewer is not ready.
   */
  renderFlat: (width: number, height: number) => HTMLCanvasElement | undefined

  /**
   * Compute the ratio of foreground pixels to total pixels, computed at the given dimensions.
   * @param width - Width in pixels.
   * @param height - Height in pixels.
   * @returns The ratio of foreground pixels (0–1).
   */
  computeForegroundRatio: (width: number, height: number) => number
}
