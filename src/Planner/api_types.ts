import * as constants from 'Planner/api_constants'
import type { RoomTemplate } from 'Planner/room_template/room_template'
import type {
  OrbitCameraState,
  WallElementAxisDraggingState,
  RayCastResultObjectType,
  RefinedParentType,
} from 'Planner/planner_types'
import type { ArtFrameData } from 'Renderer/geomviewer/geom_types'

export type {
  WallInfo,
  VertexInfo,
  WallElementInfo,
  CompositionItemInfo,
  OrbitCameraState,
  PlannerSettings,
  WallElementAxisDraggingState
} from 'Planner/planner_types'
export type { RoomTemplate } from 'Planner/room_template/room_template'
export type {
  TemplateAssetInfo,
  TemplateWallElementType,
} from 'Planner/room_template/room_template_types'


export type PlacementType = typeof constants.PLACEMENT_FLOOR_ONLY
  | typeof constants.PLACEMENT_WALL_ONLY
  | typeof constants.PLACEMENT_EDGE_ONLY
  | typeof constants.PLACEMENT_ANYWHERE

export type GeneralParentType = typeof constants.PARENT_TYPE_ITEM | typeof constants.PARENT_TYPE_ROOM_SURFACE

export type GlbModelInfo = {
  glbUrl: string
}

export type ImageBasedArtInfo = {
  imageUrl: string
  artImageData: ImageData
  size: number
  frameData: ArtFrameData
}

export type ModelInfo = GlbModelInfo | ImageBasedArtInfo

export const isGlbModelInfo = (modelInfo: ModelInfo): modelInfo is  GlbModelInfo => 'glbUrl' in modelInfo

export type CompositionFurnitureItem<T extends GeneralParentType | RefinedParentType
  = GeneralParentType> = {
  uniqueId: string
  placement: PlacementType
  position: Vector3Like,
  rotation: QuaternionLike,
  parentId: string
  parentType: T
  model: ModelInfo
  modelPosition: Vector3Like,
  modelRotation: QuaternionLike,
}

export type CompositionInfo = {
    uuid: string
    floorId: number
    ceilingId: number
    furniture: CompositionFurnitureItem[]
}

export type RoomInfo = {
    roomTemplate: RoomTemplate
    composition?: CompositionInfo
}

export type ApiState = typeof constants.API_NOT_INITIALIZED
  | typeof constants.API_INITIALIZING
  | typeof constants.API_INITIALIZED
  | typeof constants.API_INITIALIZATION_ERROR

export type ViewerState = typeof constants.VIEWER_NOT_INITIALIZED
  | typeof constants.VIEWER_INITIALIZING
  | typeof constants.VIEWER_INITIALIZED
  | typeof constants.VIEWER_INITIALIZATION_ERROR
  | typeof constants.VIEWER_WEBGL_CONTEXT_LOST

export type MaterialLoadingStatus = typeof constants.MATERIAL_STATUS_LOADING
  | typeof constants.MATERIAL_STATUS_ERROR
  | typeof constants.MATERIAL_STATUS_DONE

export type WallAssetLoadingStatus = typeof constants.WALL_ELEMENT_ASSET_STATUS_LOADING
  | typeof constants.WALL_ELEMENT_ASSET_STATUS_ERROR
  | typeof constants.WALL_ELEMENT_ASSET_STATUS_DONE

export type MaterialLoadError = typeof constants.ERROR_PLANNER_NOT_READY
  | typeof constants.ERROR_MATERIAL_DOWNLOAD_FAILED
  | typeof constants.ERROR_MATERIAL_NOT_FOUND

export type ViewerUIEventType = typeof constants.VIEWER_UI_EVENT_HOVER_CHANGE
  | typeof constants.VIEWER_UI_EVENT_SELECTION_CHANGE
  | typeof constants.VIEWER_UI_EVENT_DRAG_START
  | typeof constants.VIEWER_UI_EVENT_DRAG_END
  | typeof constants.VIEWER_UI_EVENT_WALL_ELEM_DRAG_DIR_CHANGE
  | typeof constants.VIEWER_UI_EVENT_ITEM_DELETED
  | typeof constants.VIEWER_UI_EVENT_CAMERA_ORBIT_CHANGE

export type InteractableItemType = typeof constants.OBJECT_TYPE_WALL
  | typeof constants.OBJECT_TYPE_WALL_ELEMENT
  | typeof constants.OBJECT_TYPE_COMPOSITION_ITEM
  | typeof constants.OBJECT_TYPE_WALL_VERTEX

export type ViewerUIEvent = {
  type: typeof constants.VIEWER_UI_EVENT_HOVER_CHANGE
    | typeof constants.VIEWER_UI_EVENT_DRAG_START
    | typeof constants.VIEWER_UI_EVENT_DRAG_END
    | typeof constants.VIEWER_UI_EVENT_SELECTION_CHANGE
    | typeof constants.VIEWER_UI_EVENT_ITEM_DELETED
  isInternal: boolean
  objectId?: string
  objectType?: InteractableItemType
} | {
  type: typeof constants.VIEWER_UI_EVENT_WALL_ELEM_DRAG_DIR_CHANGE
  objectId?: string
  objectType?: InteractableItemType
  verticalDraggingState?: WallElementAxisDraggingState
  horizontalDraggingState?: WallElementAxisDraggingState
} | {
  type: typeof constants.VIEWER_UI_EVENT_ITEM_DELETED
  objectId?: string
  objectType?: InteractableItemType
  isInternal: boolean
} | {
  type: typeof constants.VIEWER_UI_EVENT_CAMERA_ORBIT_CHANGE
  state: OrbitCameraState
}

export type ApiStateObserver = (newState: ApiState) => void
export type ApiErrorObserver = (error: unknown) => void
export type WallGraphObserver = () => void
export type CameraObserver = () => void

export type ViewerStateObserver = (newState: ViewerState) => void
export type ViewerUIObserver = (event: ViewerUIEvent) => void
export type ViewerErrorObserver = (error: unknown) => void

export type Vector2Like = { x: number, y: number }
export type Vector3Like = { x: number, y: number, z: number }
export type QuaternionLike = { x: number, y: number, z: number, w: number }
export type Line2 = { p1: Vector2Like, p2: Vector2Like }

export type WallProjectionInfo = {
  vertex1: Vector2Like
  vertex2: Vector2Like
  isSelected: boolean
}

export type VertexProjectionInfo = {
  position: Vector2Like
  isSelected: boolean
}

export type SnappingInfo = {
  snapLines: Line2[]
  snapAngles: { line1: Line2, line2: Line2, isOnVertex: boolean }[]
  snapParallels: { line1: Line2, line2: Line2 }[]
}

export type MaybeVector2Like = Vector2Like | undefined
export type WallElementProjectionInfo = {
  center: Vector2Like
  corners: [MaybeVector2Like, MaybeVector2Like, MaybeVector2Like, MaybeVector2Like],
  roomIntersections: [MaybeVector2Like, MaybeVector2Like, MaybeVector2Like, MaybeVector2Like],
  backFacing: boolean
  isHovered: boolean
  isSelected: boolean
  isDragged: boolean
  verticalDraggingAxisState: WallElementAxisDraggingState
  horizontalDraggingAxisState: WallElementAxisDraggingState
}

export type CompositionItemProjectionInfo = {
  position: Vector2Like
  corners: [
    MaybeVector2Like, MaybeVector2Like, MaybeVector2Like, MaybeVector2Like,
    MaybeVector2Like, MaybeVector2Like, MaybeVector2Like, MaybeVector2Like,
  ],
  isHovered: boolean
  isSelected: boolean
  isDragged: boolean
}

export type CameraViewName =  typeof constants.CAMERA_VIEW_SIDE_1 |
  typeof constants.CAMERA_VIEW_SIDE_2 |
  typeof constants.CAMERA_VIEW_SIDE_3 |
  typeof constants.CAMERA_VIEW_SIDE_4 |
  typeof constants.CAMERA_VIEW_DOLLHOUSE_1 |
  typeof constants.CAMERA_VIEW_DOLLHOUSE_2 |
  typeof constants.CAMERA_VIEW_TOPDOWN

export type PointSampleResult = {
  objectType: RayCastResultObjectType
  id?: string // Wall id or global wall element id.
}

export type WallElementSizeMetadata = {
  sizeIndex: number
}

export type WallElementSize = {
  width: number
  height: number
  metadata: WallElementSizeMetadata
}

export type WallSplitResult = {
  newVertexId: string
  newWallId: string
}

export type DeleteVertexResult = {
  success: true
  retainedWallId?: string
  deletedWallId?: string
} | {
  success: false
  obstacleType?: InteractableItemType
  obstacleItemsIds?: string[]
}

export type CollisionResolutionResult = {
  success: boolean
  obstacleType?: InteractableItemType
  obstacleItemsIds?: string[]
}