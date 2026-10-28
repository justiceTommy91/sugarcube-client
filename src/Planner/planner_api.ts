import { Planner } from 'Planner/planner'
import { PlannerViewer } from 'Planner/planner_viewer'
import type {
  ColorMap,
  OrbitCameraState,
  PlannerSettings,
  PartialPlannerSettings,
  WallElementAxisDraggingState
} from 'Planner/planner_types'

import {
  INPUT_HANDLER_HOVER_START,
  INPUT_HANDLER_HOVER_END,
  INPUT_HANDLER_EVENT_DRAG_START,
  INPUT_HANDLER_EVENT_DRAG_END,
  INPUT_HANDLER_SELECT_START,
  INPUT_HANDLER_SELECT_END,
  ORBIT_CAMERA_STATE_CHANGED,
  INPUT_HANDLER_EVENT_DRAG_DIR_CHANGED,
  WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED,
  INPUT_STATE_DRAGGING,
  INPUT_STATE_DRAGGING_EXTERNAL,
  VIEWER_EVENT_WEBGL_CONTEXT_LOST,
  INPUT_HANDLER_EVENT_ITEM_DELETED,
} from 'Planner/planner_constants'

import {
  API_NOT_INITIALIZED,
  API_INITIALIZING,
  API_INITIALIZED,
  API_INITIALIZATION_ERROR,
  VIEWER_NOT_INITIALIZED,
  VIEWER_INITIALIZATION_ERROR,
  VIEWER_INITIALIZING,
  VIEWER_INITIALIZED,
  VIEWER_WEBGL_CONTEXT_LOST,

  ERROR_PLANNER_NOT_READY,
  ERROR_WEBGL_CONTEXT_LOST,

  CAMERA_VIEW_DOLLHOUSE_1,
  CAMERA_VIEW_TOPDOWN,
  EVENT_CAMERA_TRANSFORM_UPDATED,
  VIEWER_UI_EVENT_HOVER_CHANGE,
  VIEWER_UI_EVENT_SELECTION_CHANGE,
  VIEWER_UI_EVENT_DRAG_START,
  VIEWER_UI_EVENT_DRAG_END,
  VIEWER_UI_EVENT_WALL_ELEM_DRAG_DIR_CHANGE,
  VIEWER_UI_EVENT_CAMERA_ORBIT_CHANGE,
  VIEWER_UI_EVENT_ITEM_DELETED,
  OBJECT_TYPE_WALL,
  OBJECT_TYPE_WALL_ELEMENT,
  OBJECT_TYPE_WALL_VERTEX,
  OBJECT_TYPE_COMPOSITION_ITEM,
} from 'Planner/api_constants'

import type {
  RoomInfo,
  ApiState,
  ViewerState,
  ApiStateObserver,
  ApiErrorObserver,
  WallGraphObserver,
  CameraObserver,
  WallInfo,
  VertexInfo,
  WallElementInfo,
  WallProjectionInfo,
  VertexProjectionInfo,
  WallElementProjectionInfo,
  CameraViewName,
  Vector2Like,
  ViewerStateObserver,
  ViewerUIObserver,
  ViewerErrorObserver,
  PointSampleResult,
  ViewerUIEvent,
  ViewerUIEventType,
  InteractableItemType,
  WallElementSize,
  TemplateWallElementType,
  CompositionItemInfo,
  CompositionItemProjectionInfo,
  CompositionFurnitureItem,
  DeleteVertexResult,
  CollisionResolutionResult,
  SnappingInfo,
} from 'Planner/api_types'
import { projectLine } from 'Planner/api_utils'
import { DependencyCreationQueue } from 'Planner/dependency_creation_queue'
import { GLTf } from 'Renderer/gltf/gltf'

class AlreadyShutdownError extends Error {}

export class PlannerApi {
  static apiInstance: PlannerApi

  private state: ApiState = API_NOT_INITIALIZED
  private plannerInitializion: Promise<boolean> | null = null
  private planner: Planner | null = null
  private plannerViewers: Map<string, PlannerViewer> = new Map()
  private viewersStates: Map<string, ViewerState> = new Map()

  private apiStateObservers: Set<ApiStateObserver> = new Set()
  private errorObservers: Set<ApiErrorObserver> = new Set()
  private wallGraphObservers: Set<WallGraphObserver> = new Set()
  private cameraObservers: Map<string, Set<CameraObserver>> = new Map()
  private viewerStateObservers: Map<string, Set<ViewerStateObserver>> = new Map()
  private viewerUIObservers: Map<string, Set<ViewerUIObserver>> = new Map()
  private viewerErrorObservers: Map<string, Set<ViewerErrorObserver>> = new Map()
  private furnitureCreationQueue = new DependencyCreationQueue()

  static getInstance(): PlannerApi {
    if (!PlannerApi.apiInstance) {
      PlannerApi.apiInstance = new PlannerApi()
    }
    return PlannerApi.apiInstance
  }

  public async initialize(roomInfo: RoomInfo) {
    if (this.plannerInitializion) {
      return this.plannerInitializion
    }

    // There's a situation possible when an API instance was initialized, shutdown and initialized again in 
    // quick succession, leading to the previous `this.planner.initialize` promise to finish during the next 
    // initialization cycle, setting this API cycle into "initialized" state too early.
    // Tracking planner id aims to prevent that.
    this.furnitureCreationQueue = new DependencyCreationQueue()
    this.setState(API_INITIALIZING)
    this.planner = Planner.newInstance(Math.floor(Math.random() * 0xFFFFFFFF))
    this.plannerInitializion = this.planner.initialize(roomInfo)
      .then((plannerId) => {
        if (this.planner?.getId() !== plannerId) {
          throw new AlreadyShutdownError()
        }
        if (!roomInfo.composition) {
          return plannerId
        }
        const furniture = roomInfo.composition.furniture
        return Promise.all(furniture.map((item) => this.createFurnitureItem(item)))
          .then(() => plannerId)
      })
      .then((plannerId) => {
        if (this.planner?.getId() !== plannerId) {
          throw new AlreadyShutdownError()
        }
        this.setState(API_INITIALIZED)
        return true
      }).catch((error) => {
        if (error instanceof AlreadyShutdownError) {
          return false
        }
        this.reportError(error)
        this.setState(API_INITIALIZATION_ERROR)
        return false
      })
    return this.plannerInitializion
  }

  public shutdown() {
    if (!this.planner) {
      return
    }
    this.plannerViewers.forEach((viewer) => viewer.shutDown())
    this.plannerViewers.clear()
    this.planner.shutDown()
    this.planner = null
    this.plannerInitializion = null
    this.setState(API_NOT_INITIALIZED)
  }

  public getState() {
    return this.state
  }

  public addStateObserver(observer: ApiStateObserver) {
    this.apiStateObservers.add(observer)
  }

  public removeStateObserver(observer: ApiStateObserver) {
    this.apiStateObservers.delete(observer)
  }

  public addErrorObserver(observer: ApiErrorObserver) {
    this.errorObservers.add(observer)
  }

  public removeErrorObserver(observer: ApiErrorObserver) {
    this.errorObservers.delete(observer)
  }

  public addWallGraphObserver(observer: WallGraphObserver) {
    this.wallGraphObservers.add(observer)
  }

  public removeWallGraphObserver(observer: WallGraphObserver) {
    this.wallGraphObservers.delete(observer)
  }

  public addCameraObserver(viewerId: string, observer: WallGraphObserver) {
    let existing = this.cameraObservers.get(viewerId)
    if (!existing) {
      existing = new Set()
      this.cameraObservers.set(viewerId, existing)
    }
    existing.add(observer)
  }

  public removeCameraObserver(viewerId: string, observer: WallGraphObserver) {
    const existing = this.cameraObservers.get(viewerId)
    if (!existing) {
      return
    }
    existing.delete(observer)
  }

  public applySettings(settings: PartialPlannerSettings) {
    if (!this.planner) {
      return
    }
    this.planner.applySettings(settings)
  }

  public getSettings(): PlannerSettings | undefined {
    if (!this.planner) {
      return undefined
    }
    return this.planner.getCurrentSettings()
  }

  public getAllWallsInfo() {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return undefined
    }
    return currentRoom.getAllWallsInformation()
  }

  public getAllVerticesInfo() {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return undefined
    }
    return currentRoom.getAllVerticesInformation()
  }

  public getWallInfo(wallId: string): WallInfo | undefined {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return undefined
    }
    return currentRoom.getWallInformation(wallId)
  }

  public getVertexInfo(vertexId: string): VertexInfo | undefined {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return undefined
    }
    return currentRoom.getVertexInformation(vertexId)
  }

  public setWallLength(wallId: string, newLength: number) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return
    }
    currentRoom.setWallLength(wallId, newLength)
    this.onWallGraphUpdated()
  }

  public testSplitWall(wallId: string, distance: number) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return false
    }
    return currentRoom.testSplitWall(wallId, distance)
  }

  public splitWall(wallId: string, distance: number) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return null
    }
    const result = currentRoom.splitWall(wallId, distance)
    if (result) {
      this.onWallGraphUpdated()
    }
    return result
  }

  public getAutoSplitDistance(wallId: string): number | undefined {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return undefined
    }
    return currentRoom.getAutoSplitDistance(wallId)
  }

  public testDeleteVertex(vertexId: string): boolean {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return false
    }
    return currentRoom.testDeleteVertex(vertexId)
  }

  public deleteVertex(vertexId: string): DeleteVertexResult {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return { success: false }
    }
    const result = currentRoom.deleteVertex(vertexId)
    if (result.success) {
      this.onWallGraphUpdated()
    }
    return result
  }

  public async exportCurrentRoom(binary = false, download = false) {
    if (!this.planner) {
      return null
    }
    return this.planner.exportCurrentRoom(binary, download)
  }

  public async exportCurrentRoomAsTemplate(download = false) {
    if (!this.planner) {
      return null
    }
    return this.planner.exportCurrentRoomAsTemplate(download)
  }

  public exportCurrentRoomEnvMap(viewerId: string, equirect = true, download = false) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return null
    }
    return viewer.borrowOffscreenRenderContext((offscreenRenderCtx) => 
      this.planner?.exportCurrentRoomEnvMap(offscreenRenderCtx, equirect, download)
    )
  }

  public setSnapModeEnabled(enabled: boolean) {
    this.planner?.setSnapModeEnabled(enabled)
  }

  public setFloorMaterialFromUrl(assetUuid: string, glbUrl: string) {
    if (!this.planner) {
      return Promise.reject(new Error(ERROR_PLANNER_NOT_READY, { cause: `setFloorMaterialFromUrl` }))
    }
    return this.planner.setFloorMaterialFromUrl(assetUuid, glbUrl)
  }

  public setFloorMaterialFromGltfObject(assetUuid: string, gltfObject: GLTf, baseUrl: string) {
    if (!this.planner) {
      return Promise.reject(new Error(ERROR_PLANNER_NOT_READY, { cause: `setFloorMaterialFromGltfObject` }))
    }
    return this.planner.setFloorMaterialFromGltfObject(assetUuid, gltfObject, baseUrl)
  }

  public enableWallsDoubleSide(enable: boolean) {
    const room = this.planner?.getCurrentRoom()
    if (!room) {
      return
    }
    room.enableWallsDoubleSide(enable)
  }

  public setWallColor(wallId: string, rgb255: [number, number, number]) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return
    }
    currentRoom.setWallColor(wallId, rgb255)
  }

  public setAllWallsColor(rgb255: [number, number, number]) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return
    }
    currentRoom.setAllWallsColor(rgb255)
  }

  public setGraphViewVisible(visible: boolean) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return
    }
    currentRoom.setGraphViewVisible(visible)
  }

  public setWallGraphColors(colors: ColorMap) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return
    }
    currentRoom.setWallGraphColors(colors)
  }

  public setWallGraphColor(rgb255: [number, number, number]) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return
    }
    currentRoom.setWallGraphColor(rgb255)
  }

  public async addViewer(canvas: HTMLCanvasElement, id: string,
      stateObserver?: ViewerStateObserver, errorObserver?: ViewerErrorObserver): Promise<void> {
    if (!this.planner) {
      throw new Error('Planner instance is not created.')
    }

    if (this.plannerViewers.has(id)) {
      return
    }

    const newViewer = new PlannerViewer(this.planner)
    this.plannerViewers.set(id, newViewer)

    newViewer.addEventListener(INPUT_HANDLER_HOVER_START,
      evt => this.observeViewerUIEvent(id, VIEWER_UI_EVENT_HOVER_CHANGE, evt.id, evt.objectType))
    newViewer.addEventListener(INPUT_HANDLER_HOVER_END,
      () => this.observeViewerUIEvent(id, VIEWER_UI_EVENT_HOVER_CHANGE))
    newViewer.addEventListener(INPUT_HANDLER_EVENT_DRAG_START,
      evt => this.observeViewerUIEvent(id, VIEWER_UI_EVENT_DRAG_START, evt.id, evt.objectType,
        undefined, undefined, evt.isInternal))
    newViewer.addEventListener(INPUT_HANDLER_EVENT_DRAG_END,
      evt => this.observeViewerUIEvent(id, VIEWER_UI_EVENT_DRAG_END, evt.id, evt.objectType,
        undefined, undefined, evt.isInternal))
    newViewer.addEventListener(INPUT_HANDLER_EVENT_DRAG_DIR_CHANGED,
      evt => this.observeViewerUIEvent(id, VIEWER_UI_EVENT_WALL_ELEM_DRAG_DIR_CHANGE, evt.id, evt.objectType,
                                       evt.verticalDraggingState, evt.horizontalDraggingState))
    newViewer.addEventListener(INPUT_HANDLER_SELECT_START,
      evt => this.observeViewerUIEvent(id, VIEWER_UI_EVENT_SELECTION_CHANGE, evt.id, evt.objectType))
    newViewer.addEventListener(INPUT_HANDLER_EVENT_ITEM_DELETED,
      evt => this.observeViewerUIEvent(id, VIEWER_UI_EVENT_ITEM_DELETED, evt.id, evt.objectType,
        undefined, undefined, evt.isInternal))

    newViewer.addEventListener(INPUT_HANDLER_SELECT_END,
      () => this.observeViewerUIEvent(id, VIEWER_UI_EVENT_SELECTION_CHANGE))
    newViewer.addEventListener(ORBIT_CAMERA_STATE_CHANGED,
      evt => this.observeViewerOrbitCameraEvent(id, evt.state))


    newViewer.addEventListener(VIEWER_EVENT_WEBGL_CONTEXT_LOST,
      () => {
        this.reportViewerError(id, new Error(ERROR_WEBGL_CONTEXT_LOST))
        this.setViewerState(id, VIEWER_WEBGL_CONTEXT_LOST)
      })

    this.setViewerState(id, VIEWER_NOT_INITIALIZED)
    if (stateObserver) {
      this.addViewerStateOserver(id, stateObserver)
    }
    if (errorObserver) {
      this.addViewerErrorObserver(id, errorObserver)
    }

    await this.plannerInitializion

    this.setViewerState(id, VIEWER_INITIALIZING)
    try {
      await newViewer.initWithRoom(canvas)
      const camera = newViewer.getCameraManager()?.getCamera()
      camera?.addEventListener(EVENT_CAMERA_TRANSFORM_UPDATED, () => this.onCameraTransformUpdated(id))
      this.onCameraTransformUpdated(id)
      this.setViewerState(id, VIEWER_INITIALIZED)
    } catch (error) {
      this.setViewerState(id, VIEWER_INITIALIZATION_ERROR)
      this.reportViewerError(id, error)
    }
  }

  public removeViewer(id: string) {
    if (!this.planner) {
      return
    }
    const viewer = this.plannerViewers.get(id)
    if (!viewer) {
      return
    }
    viewer.shutDown()
    this.plannerViewers.delete(id)
    this.viewersStates.delete(id)
    this.viewerStateObservers.delete(id)
    this.viewerUIObservers.delete(id)
    this.viewerErrorObservers.delete(id)
  }

  public getViewerSystemInfo(id: string) {
    const viewer = this.plannerViewers.get(id)
    if (!viewer) {
      return null
    }
    return viewer.getSystemInfo()
  }

  public addViewerStateOserver(viewerId: string, observer: ViewerStateObserver) {
    let existing = this.viewerStateObservers.get(viewerId)
    if (!existing) {
      existing = new Set()
      this.viewerStateObservers.set(viewerId, existing)
    }
    existing.add(observer)
  }

  public removeViewerStateObserver(viewerId: string, observer: ViewerStateObserver) {
    if (!this.plannerViewers.has(viewerId)) {
      return
    }
    const existing = this.viewerStateObservers.get(viewerId)
    if (!existing) {
      return
    }
    existing.delete(observer)
  }

  public addViewerUIObserver(viewerId: string, observer: ViewerUIObserver) {
    let existing = this.viewerUIObservers.get(viewerId)
    if (!existing) {
      existing = new Set()
      this.viewerUIObservers.set(viewerId, existing)
    }
    existing.add(observer)
  }

  public removeViewerUIObserver(viewerId: string, observer: ViewerUIObserver) {
    if (!this.plannerViewers.has(viewerId)) {
      return
    }
    const existing = this.viewerUIObservers.get(viewerId)
    if (!existing) {
      return
    }
    existing.delete(observer)
  }

  public addViewerErrorObserver(viewerId: string, observer: ViewerErrorObserver) {
    let existing = this.viewerErrorObservers.get(viewerId)
    if (!existing) {
      existing = new Set()
      this.viewerErrorObservers.set(viewerId, existing)
    }
    existing.add(observer)
  }

  public removeViewerErrorObserver(viewerId: string, observer: ViewerErrorObserver) {
    if (!this.plannerViewers.has(viewerId)) {
      return
    }
    const existing = this.viewerErrorObservers.get(viewerId)
    if (!existing) {
      return
    }
    existing.delete(observer)
  }

  public getViewerState(viewerId: string) {
    return this.viewersStates.get(viewerId)
  }

  public onCanvasResized(viewerId: string) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    viewer.onCanvasResized()
    this.onCameraTransformUpdated(viewerId)
  }

  public setTopDownCameraView(viewerId: string, animate = false) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    viewer.setCameraView(CAMERA_VIEW_TOPDOWN, animate)
  }

  public setDollhouseCameraView(viewerId: string, animate = false) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    viewer.setCameraView(CAMERA_VIEW_DOLLHOUSE_1, animate)
  }

  public setCameraView(viewerId: string, viewNmae: CameraViewName, animate = false) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    viewer.setCameraView(viewNmae, animate)
  }

  public refreshCameraView(viewerId: string) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    viewer.refreshCurrentCameraVew()
  }

  public setCameraOrbitControlsAllowed(viewerId: string, enabled: boolean) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    viewer.setIsOrbitControlsAllowed(enabled)
  }

  public getCameraOrbitControlsAllowed(viewerId: string) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return false
    }
    return viewer.getIsOrbitControlsAllowed()
  }

  public getWallProjection(viewerId: string, wallId: string): WallProjectionInfo | undefined {
    const viewer = this.plannerViewers.get(viewerId)
    const currentRoom = this.planner?.getCurrentRoom()
    const wallInfo = currentRoom?.getWallInformation(wallId)
    if (!viewer || !wallInfo) {
      return undefined
    }
    const vertex1 = viewer.projectWorldPosition(wallInfo.vertex1Pos)
    const vertex2 = viewer.projectWorldPosition(wallInfo.vertex2Pos)
    if (!vertex1 || !vertex2) {
      return undefined
    }
    const inputHandler = viewer.getInputHandler()
    const isSelected = inputHandler.getSelectedEntityType() === OBJECT_TYPE_WALL &&
      inputHandler.getSelectedEntityId() === wallId
    return { vertex1, vertex2, isSelected }
  }

  public getVertexProjection(viewerId: string, vertexId: string): VertexProjectionInfo | undefined {
    const viewer = this.plannerViewers.get(viewerId)
    const currentRoom = this.planner?.getCurrentRoom()
    const vertexInfo = currentRoom?.getVertexInformation(vertexId)
    if (!viewer || !vertexInfo) {
      return undefined
    }
    const position = viewer.projectWorldPosition(vertexInfo.position)
    if (!position) {
      return undefined
    }
    const inputHandler = viewer.getInputHandler()
    const isSelected = inputHandler.getSelectedEntityType() === OBJECT_TYPE_WALL_VERTEX &&
      inputHandler.getSelectedEntityId() === vertexId
    return {
      position,
      isSelected,
    }
  }

  public getVertexSnappingInfo(viewerId: string, vertexId: string): SnappingInfo | undefined {
    const viewer = this.plannerViewers.get(viewerId)
    const currentRoom = this.planner?.getCurrentRoom()
    if (!viewer || !currentRoom) {
      return undefined
    }
    const snapState = currentRoom.getVertexSnapState(vertexId)
    if (!snapState) {
      return undefined
    }
    const snapLines = snapState.lines.map(line => projectLine(line, viewer))
    const snapAngles = snapState.anglePairs.map((pair) => ({
      line1: projectLine(pair.line1, viewer),
      line2: projectLine(pair.line2, viewer),
      isOnVertex: pair.isOnVertex,
    }))
    const snapParallels = snapState.parallelPairs.map((pair) => ({
      line1: projectLine(pair.line1, viewer),
      line2: projectLine(pair.line2, viewer),
    }))
    return {
      snapLines,
      snapAngles,
      snapParallels,
    }
  }

  public getWallsSnappingInfo(viewerId: string, wallId: string): SnappingInfo | undefined {
    const viewer = this.plannerViewers.get(viewerId)
    const currentRoom = this.planner?.getCurrentRoom()
    if (!viewer || !currentRoom) {
      return undefined
    }
    const snapLines = currentRoom.getWallSnapState(wallId).map(line => projectLine(line, viewer))
    return {
      snapLines,
      snapAngles: [],
      snapParallels: [],
    }
  }

  public startMoveWallScreenSpace(viewerId: string, wallId: string, relPoint: Vector2Like) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    inputHandler.handleWallUIStartDrag(wallId, relPoint)
  }

  public stopMoveWallScreenSpace(viewerId: string) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    inputHandler.handleWallUIEndDrag()
  }

  public moveWallInScreenSpace(viewerId: string, wallId: string, toRelative: Vector2Like): CollisionResolutionResult {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return { success: false }
    }
    const inputHandler = viewer.getInputHandler()
    const result = inputHandler.handleWallUIDrag(wallId, toRelative)
    if (result) {
      this.onWallGraphUpdated()
    }
    return result
  }

  public forceSelectedWall(viewerId: string, wallId: string | null) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    inputHandler.forceSelectEntity(wallId, OBJECT_TYPE_WALL)
  }

  public clearCurrentSelection(viewerId: string) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    inputHandler.forceSelectEntity(null)
  }

  public moveVertexInScreenSpace(viewerId: string, vertexId: string,
    toRelative: Vector2Like): CollisionResolutionResult {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return { success: false }
    }
    const inputHandler = viewer.getInputHandler()
    const result = inputHandler.handleVertexUIDrag(vertexId, toRelative)
    if (result) {
      this.onWallGraphUpdated()
    }
    return result
  }

  public forceSelectedVertex(viewerId: string, vertexId: string | null) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    inputHandler.forceSelectEntity(vertexId, OBJECT_TYPE_WALL_VERTEX)
  }

  public relativePointToPixels(viewerId: string, relativePoint: Vector2Like | undefined) {
    if (!relativePoint) {
      return undefined
    }
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return undefined
    }
    return viewer.relativePointToPixels(relativePoint)
  }

  public sampleRelativePoint(viewerId: string, relativePoint: Vector2Like): PointSampleResult | null {
    const cameraManager = this.plannerViewers.get(viewerId)?.getCameraManager()
    const currentRoom = this.planner?.getCurrentRoom()

    if (!cameraManager || !currentRoom) {
      return null
    }
    const camera = cameraManager.getCamera()
    const ray = camera.getScreenPointRay([relativePoint.x, relativePoint.y])
    return currentRoom.sampleScene(ray)
  }

  public getAllWallElementsInfo() {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return undefined
    }
    return currentRoom.getAllWallElementsInformation()
  }

  public getWallElementInfo(elementId: string): WallElementInfo | undefined {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return undefined
    }
    return currentRoom.getWallElementInformation(elementId)
  }

  public getWallElementProjection(viewerId: string, elementId: string): WallElementProjectionInfo | undefined {
    const viewer = this.plannerViewers.get(viewerId)
    const room = this.planner?.getCurrentRoom()
    const elementInfo = room?.getWallElementInformation(elementId)
    const cameraPosition = viewer?.getCameraPosition()
    if (!viewer || !room || !elementInfo || !cameraPosition) {
      return undefined
    }
    const center = viewer.projectWorldPosition(elementInfo.centerWorldPos)
    const corners = elementInfo.corners
      .map(pos => pos ? viewer.projectWorldPosition(pos) : undefined)
    const ints = elementInfo.roomIntersections
      .map(pos => pos ? viewer.projectWorldPosition(pos) : undefined)

    const backFacing = room.isWallBackFacing(elementInfo.wallId, cameraPosition)
    const inputHandler = viewer.getInputHandler()
    const inputState = inputHandler.getState()
    const isHovered = inputHandler.getHoverEntityId() === elementInfo.elementId
    const isDragged = inputHandler.getDraggingEntityId() === elementInfo.elementId &&
      (inputState === INPUT_STATE_DRAGGING || inputState === INPUT_STATE_DRAGGING_EXTERNAL)
    const isSelected = inputHandler.getSelectedEntityType() === OBJECT_TYPE_WALL_ELEMENT &&
      inputHandler.getSelectedEntityId() === elementInfo.elementId

    const verticalDraggingAxisState = inputHandler.getVerticalDraggingAxisState() ?? 
                                 WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED

    const horizontalDraggingAxisState = inputHandler.getHorizontalDraggingAxisState() ?? 
                                   WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED

    if (!center) {
      return undefined
    }
    return {
      center,
      corners: [corners[0], corners[1], corners[2], corners[3]],
      roomIntersections: [ints[0], ints[1], ints[2], ints[3]],
      backFacing,
      isHovered,
      isSelected,
      isDragged,
      verticalDraggingAxisState,
      horizontalDraggingAxisState
    }
  }

  public getAllCompositionItemsInfo() {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return undefined
    }
    return currentRoom.getCompositionItemsInfo()
  }

  public getCompositionItemInfo(itemId: string): CompositionItemInfo | undefined {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return undefined
    }
    return currentRoom.getCompositionItemInfo(itemId)
  }

  public getCompositionItemProjection(viewerId: string, elementId: string): CompositionItemProjectionInfo | undefined {
    const viewer = this.plannerViewers.get(viewerId)
    const room = this.planner?.getCurrentRoom()
    const itemInfo = room?.getCompositionItemInfo(elementId)
    const cameraPosition = viewer?.getCameraPosition()
    if (!viewer || !room || !itemInfo || !cameraPosition) {
      return undefined
    }
    const position = viewer.projectWorldPosition(itemInfo.worldPosition)
    if (!position) {
      return undefined
    }
    const corners = itemInfo.corners
      .map(pos => pos ? viewer.projectWorldPosition(pos) : undefined)
    const inputHandler = viewer.getInputHandler()
    const inputState = inputHandler.getState()
    const isHovered = inputHandler.getHoverEntityId() === itemInfo.itemId
    const isDragged = inputHandler.getDraggingEntityId() === itemInfo.itemId &&
      (inputState === INPUT_STATE_DRAGGING || inputState === INPUT_STATE_DRAGGING_EXTERNAL)
    const isSelected = inputHandler.getSelectedEntityType() === OBJECT_TYPE_COMPOSITION_ITEM &&
      inputHandler.getSelectedEntityId() === itemInfo.itemId
    return {
      position,
      corners: [
        corners[0], corners[1], corners[2], corners[3],
        corners[4], corners[5], corners[6], corners[7],
      ],
      isHovered,
      isSelected,
      isDragged,
    }
  }

  public forceHoverWallElement(viewerId: string, elementId: string | null) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    inputHandler.forceHoverEntity(elementId, OBJECT_TYPE_WALL_ELEMENT)
  }

  public forceSelectedWallElement(viewerId: string, elementId: string | null) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    inputHandler.forceSelectEntity(elementId, OBJECT_TYPE_WALL_ELEMENT)
  }

  public forceDraggedWallElement(viewerId: string, elementId: string | null) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    inputHandler.forceDraggedEntity(elementId, OBJECT_TYPE_WALL_ELEMENT)
  }

  public moveWallElementInScreenSpace(viewerId: string, elementId: string, toRelative: Vector2Like) {
      const viewer = this.plannerViewers.get(viewerId)
      if (!viewer) {
        return
      }
      const inputHandler = viewer.getInputHandler()
      inputHandler.handleWallElementUIDrag(elementId, toRelative)
      this.onWallGraphUpdated()
  }

  public setWallsInteractive(viewerId: string, enable: boolean) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    viewer.getInputHandler().setWallsDragEnabled(enable)
  }

  public setWallElementsInteractive(viewerId: string, enable: boolean) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    viewer.getInputHandler().setWallElementsDragEnabled(enable)
  }

  public getWallsInteractive(viewerId: string) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return false
    }
    return viewer.getInputHandler().getWallsDragEnabled()
  }

  public getWallElementsInteractive(viewerId: string) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return false
    }
    return viewer.getInputHandler().getWallElementsDragEnabled()
  }

  public onPointerMove(viewerId: string, event: PointerEvent) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    if (inputHandler.onPointerMove(event)) {
      this.onWallGraphUpdated()
    }
  }

  public onPointerDown(viewerId: string, event: PointerEvent) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    if (inputHandler.onPointerDown(event)) {
      this.onWallGraphUpdated()
    }
  }

  public onPointerUp(viewerId: string, event: PointerEvent) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    const inputHandler = viewer.getInputHandler()
    if (inputHandler.onPointerUp(event)) {
      this.onWallGraphUpdated()
    }
  }

  public onKeyDown(viewerId: string, event: KeyboardEvent) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }

    const inputHandler = viewer.getInputHandler()
    if (!inputHandler.onKeyDown(event)) {
      return
    }

    if (event.key === 'Delete') {
      const selectedWallElement = inputHandler.getSelectedEntityId()
      if (selectedWallElement && inputHandler.getSelectedEntityType() === OBJECT_TYPE_WALL_ELEMENT) {
        this.plannerViewers.forEach((plannerViewer) => {
          plannerViewer.onWallElementDeleted(selectedWallElement)
        })
      }
    }

    this.onWallGraphUpdated()
  }

  public showWallElementMeasurements(elementId: string | null,
                                     vertical: WallElementAxisDraggingState,
                                     horizontal: WallElementAxisDraggingState) {
    const room = this.planner?.getCurrentRoom()
    if (room) {
      room.setMeasurementsVisibility(elementId, vertical, horizontal)
    }
  }

  public addWallElement(gltfObject: GLTf, baseUrl: string, uuid: string, type: TemplateWallElementType,
    fromViewerId?: string, initialSize?: WallElementSize) {
    if (!this.planner) {
      return Promise.reject(new Error(ERROR_PLANNER_NOT_READY, { cause: `addWallElement` }))
    }
    let cameraPosition
    if (fromViewerId) {
      const viewer = this.plannerViewers.get(fromViewerId)
      if (viewer) {
        cameraPosition = viewer.getCameraPosition()
      }
    }
    return this.planner.addWallElement(gltfObject, baseUrl, uuid, type, cameraPosition, initialSize)
      .then((result) => {
        this.onWallGraphUpdated()
        return result
      })
  }

  public deleteWallElement(elementId: string) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return
    }
    currentRoom.deleteWallElement(elementId)
    this.plannerViewers.forEach((viewer) => {
      viewer.onWallElementDeleted(elementId)
    })
    this.onWallGraphUpdated()
  }

  public deleteCompositionItem(itemId: string) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return
    }
    currentRoom.deleteCompositionItem(itemId)
    this.plannerViewers.forEach((viewer) => {
      viewer.onCompositionItemDeleted(itemId)
    })
    this.onWallGraphUpdated()
  }

  public setWallElementSize(elementId: string, size: WallElementSize) {
    if (!this.planner) {
      return
    }
    this.planner.setWallElementSize(elementId, size.width, size.height, size.metadata)
    this.onWallGraphUpdated()
  }

  public setLightFixtureObject(gltfObject: GLTf, baseUrl: string, uuid: string) {
    if (!this.planner) {
      return Promise.reject(new Error(ERROR_PLANNER_NOT_READY, { cause: `setLightFixtureObject` }))
    }
    return this.planner.setLightFixtureObject(gltfObject, baseUrl, uuid)
      .then((result) => {
        this.onWallGraphUpdated()
        return result
      })
  }

  public hideLights() {
    if (!this.planner) {
      return
    }
    this.planner.hideLights()
  }

  public refreshLights() {
    if (!this.planner) {
      return
    }
    this.planner.refreshLights()
  }

  private setState(state: ApiState) {
    this.state = state
    this.apiStateObservers.forEach(observer => observer(state))
    this.onWallGraphUpdated()
  }

  private setViewerState(viewerId: string, state: ViewerState) {
    this.viewersStates.set(viewerId, state)
    const observers = this.viewerStateObservers.get(viewerId)
    if (observers) {
      observers.forEach(observer => observer(state))
    }
  }

  private onCameraTransformUpdated(viewerId: string) {
    const observers = this.cameraObservers.get(viewerId)
    if (!observers) {
      return
    }
    observers.forEach(observer => observer())
  }

  private onWallGraphUpdated() {
    this.wallGraphObservers.forEach(observer => observer())
  }

  private reportError(error: Error) {
    this.errorObservers.forEach(observer => observer(error))
  }

  private reportViewerError(viewerId: string, error: unknown) {
    const observers = this.viewerErrorObservers.get(viewerId)
    if (!observers) {
      return
    }
    observers.forEach(ob => ob(error))
  }

  private observeViewerUIEvent(viewerId: string, eventType: ViewerUIEventType,
                               objectId?: string, objectType?: InteractableItemType,
                               verticalDraggingState?: WallElementAxisDraggingState,
                               horizontalDraggingState?: WallElementAxisDraggingState,
                              isInternal?: boolean) {
    const observers = this.viewerUIObservers.get(viewerId)
    const correctEventType = eventType !== VIEWER_UI_EVENT_CAMERA_ORBIT_CHANGE
    if (!observers || !correctEventType) {
      return
    }
    const event: ViewerUIEvent = eventType === VIEWER_UI_EVENT_WALL_ELEM_DRAG_DIR_CHANGE
    ? {
      type: eventType,
      objectId,
      objectType,
      verticalDraggingState,
      horizontalDraggingState,
    }
    : {
      type: eventType,
      objectId,
      objectType,
      isInternal: isInternal ?? false,
    }
    observers.forEach(ob => ob(event))
    if (eventType === VIEWER_UI_EVENT_ITEM_DELETED) {
      this.onWallGraphUpdated()
    }
  }

  private observeViewerOrbitCameraEvent(viewerId: string, state: OrbitCameraState) {
    const observers = this.viewerUIObservers.get(viewerId)
    if (!observers) {
      return
    }
    const event: ViewerUIEvent = { type: VIEWER_UI_EVENT_CAMERA_ORBIT_CHANGE, state }
    observers.forEach(ob => ob(event))
  }

  private createFurnitureItem(itemInfo: CompositionFurnitureItem) {
    const dependsOn = itemInfo.parentType === `item` ? itemInfo.parentId : undefined
    const creationFunc = () => {
      if (!this.planner) {
        return Promise.reject(new Error(ERROR_PLANNER_NOT_READY, { cause: `loadComposition` }))
      }
      return this.planner.addCompositionItem(itemInfo)
        .then((itemUuid) => {
          if (itemUuid) {
            this.plannerViewers.forEach((viewer) => viewer.onFurnitureItemResolved(itemUuid))
          }
          this.onWallGraphUpdated()
          return itemUuid
        })
    }
    return this.furnitureCreationQueue.create(itemInfo.uniqueId, creationFunc, dependsOn)
  }

  public getFurnitureState() {
    return this.planner?.getFurnitureSaveData() || []
  }

  public getFloorArea() {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return 0
    }
    return currentRoom.getFloorArea()
  }

  public debugForceWebglContextLoss(viewerId: string) {
    const viewer = this.plannerViewers.get(viewerId)
    if (!viewer) {
      return
    }
    viewer.debugForceWebglContextLoss()
  }

  public blinkObject(objectType: InteractableItemType, objectId: string) {
    const currentRoom = this.planner?.getCurrentRoom()
    if (!currentRoom) {
      return
    }
    currentRoom.blinkObject(objectType, objectId)
  }
}
