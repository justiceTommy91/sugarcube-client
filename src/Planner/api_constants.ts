export {
  EVENT_CAMERA_TRANSFORM_UPDATED,
  ORBIT_CAMERA_STATE_ENABLED,
  ORBIT_CAMERA_STATE_DISABLED,
  ORBIT_CAMERA_STATE_DRAGGING,
  WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED,
  WALL_ELEMENT_TYPE_DOOR,
  WALL_ELEMENT_TYPE_WINDOW,
} from 'Planner/planner_constants'

export const API_NOT_INITIALIZED = 'not-initialized'
export const API_INITIALIZING = 'initializing'
export const API_INITIALIZED = 'initialized'
export const API_INITIALIZATION_ERROR = 'initialization-error'

export const VIEWER_NOT_INITIALIZED = 'viewer-not-initialized'
export const VIEWER_INITIALIZING = 'viewer-initializing'
export const VIEWER_INITIALIZED = 'viewer-initialized'
export const VIEWER_INITIALIZATION_ERROR = 'viewer-initialization-error'
export const VIEWER_WEBGL_CONTEXT_LOST = 'viewer-webglcontext-lost'

export const VIEWER_UI_EVENT_HOVER_CHANGE = 'viewer-ui-hover-change'
export const VIEWER_UI_EVENT_SELECTION_CHANGE = 'viewer-ui-selection-change'
export const VIEWER_UI_EVENT_DRAG_START = 'viewer-ui-drag-start'
export const VIEWER_UI_EVENT_DRAG_END = 'viewer-ui-drag-end'
export const VIEWER_UI_EVENT_WALL_ELEM_DRAG_DIR_CHANGE = 'viewer-ui-wall-eleme-drag-dir-start'
export const VIEWER_UI_EVENT_ITEM_DELETED = 'viewer-ui-item-deleted'
export const VIEWER_UI_EVENT_CAMERA_ORBIT_CHANGE = 'viewer-ui-camera-orbit-change'

export const MATERIAL_STATUS_LOADING = `material-loading`
export const MATERIAL_STATUS_ERROR = `material-error`
export const MATERIAL_STATUS_DONE = `material-done`

export const WALL_ELEMENT_ASSET_STATUS_LOADING = `wall-asset-loading`
export const WALL_ELEMENT_ASSET_STATUS_ERROR = `wall-asset-error`
export const WALL_ELEMENT_ASSET_STATUS_DONE = `wall-asset-done`

export const ERROR_PLANNER_NOT_READY = `planner-not-ready`
export const ERROR_MATERIAL_DOWNLOAD_FAILED = `material-download-failed`
export const ERROR_MATERIAL_PARSE_FAILED = `material-gltf-parse-failed`
export const ERROR_MATERIAL_NOT_FOUND = `material-not-found`
export const ERROR_COULD_NOT_PLACE_WALL_ELEMENT = `could-not-place-wall-element`
export const ERROR_GLB_DOWNLOAD_FAILED = `glb-download-failed`
export const ERROR_ACQUIRING_WEBGL_CONTEXT  = `error-acquiring-webgl-context`
export const ERROR_WEBGL_CONTEXT_LOST = `webgl-context-lost`

export const CAMERA_VIEW_SIDE_1 = `camera-view-side-1`
export const CAMERA_VIEW_SIDE_2 = `camera-view-side-2`
export const CAMERA_VIEW_SIDE_3 = `camera-view-side-3`
export const CAMERA_VIEW_SIDE_4 = `camera-view-side-4`
export const CAMERA_VIEW_DOLLHOUSE_1 = `camera-view-doll-house-1`
export const CAMERA_VIEW_DOLLHOUSE_2 = `camera-view-doll-house-2`
export const CAMERA_VIEW_TOPDOWN = `camera-view-top-down`

export const OBJECT_TYPE_WALL = 'wall'
export const OBJECT_TYPE_WALL_ELEMENT = 'wall-element'
export const OBJECT_TYPE_COMPOSITION_ITEM = 'composition-item'
export const OBJECT_TYPE_WALL_VERTEX = 'wall-vertex'

// Furniture placement type.
export const PLACEMENT_FLOOR_ONLY = 'floor-only'
export const PLACEMENT_WALL_ONLY = 'wall-only'
export const PLACEMENT_EDGE_ONLY = 'edge-only'
export const PLACEMENT_ANYWHERE = 'anywhere'

export const PARENT_TYPE_ITEM = 'item'
export const PARENT_TYPE_ROOM_SURFACE = 'room-surface'