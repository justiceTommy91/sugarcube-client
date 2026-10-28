// Three.js r160 requires EventDispatcher to have a typed event map.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlannerEventMap = Record<string, any>

export const EVENT_CAMERA_TRANSFORM_UPDATED = 'transformUpdated'
export const EVENT_ITEM_SURFACE_SWITCHED = 'itemSurfaceSwitched'

export const ROOM_MESH_ROOT_NAME = 'Room mesh root'
export const WALL_GRAPH_VIEW_ROOT_NAME = 'Wall graph view'
export const LIGHT_FIXTURE_OBJ_NAME = 'fixture'

export const INPUT_STATE_IDLE = 'idle'
export const INPUT_STATE_DRAGGING = 'dragging'
export const INPUT_STATE_DRAGGING_EXTERNAL = 'dragging-external'

export const INPUT_HANDLER_HOVER_START = 'hover-start'
export const INPUT_HANDLER_HOVER_END = 'hover-end'
export const INPUT_HANDLER_SELECT_START = 'select-start'
export const INPUT_HANDLER_SELECT_END = 'select-end'
export const INPUT_HANDLER_EVENT_DRAG_START = 'drag-start'
export const INPUT_HANDLER_EVENT_DRAG_END = 'drag-end'
export const INPUT_HANDLER_EVENT_DRAG_DIR_CHANGED = 'drag-dir-changed'
export const INPUT_HANDLER_EVENT_ITEM_DELETED = 'item-deleted'

export const ROOM_FURNITURE_ITEM_ADDED = 'furniture-added'

export const ORBIT_CAMERA_STATE_ENABLED = 'enabled'
export const ORBIT_CAMERA_STATE_DISABLED = 'disabled'
export const ORBIT_CAMERA_STATE_DRAGGING = 'dragging'

export const ORBIT_CAMERA_STATE_CHANGED = 'orbit-camera-state-changed'

export const VIEWER_EVENT_WEBGL_CONTEXT_LOST = 'webgl-context-lost'

export const WALL_ELEMENT_TYPE_DOOR = 'door'
export const WALL_ELEMENT_TYPE_WINDOW = 'window'

export const ORBIT_CAMERA_ANIMATION_DURATION = 0.8 // Seconds.

export const WALLS_GRAPH_DEFAULT_SNAP_METERS = 0.1
export const WALLS_GRAPH_MIN_WALL_LENGTH = 0.1524 // 0.5' in meters.
export const WALLS_GRAPH_MAX_WALL_LENGTH = 19.812 // 65' in meters.
export const WALLS_GRAPH_WALL_ELEMENT_MARGIN = 0.025
export const WALL_SPLIT_MIN_DISTANCE = 1.5 * WALLS_GRAPH_MIN_WALL_LENGTH

export const AXIS_SNAP_THRESHOLD = 0.05 // At what distance by a single axis we snap to another vertex:
export const WALL_LINE_ANGLE_SNAP_THRESHOLD_DEG = 3.0

// A derived constants to detect if a snap condition is currently satisfied (and display a line)
export const AXIS_SNAP_LINE_THRESHOLD = 0.1 * AXIS_SNAP_THRESHOLD

export const BASEBOARD_HEIGHT = 0.1

export const FLOOR_UV_SCALES_BASED_ON_MATERIAL: {[key: string]: number} = {
    '[floor][unknown]00001_WoodFloor051_2K_7cm': 0.3, // Natural oak.
    '[floor][wood][tile]Wood_01': 0.7, // Honey pine. 
    '[floor][wood][tile]Wood_04': 0.7, // Ash grey.
    '[floor][wood][tile]Wood_05': 0.7, // Walnut brown.
    '[floor][wood][tile]Wood_06': 0.2, // Cherry oak.
    '[floor][wood][tile]Wood_07': 0.2, // Dark walnut.
}

export const WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED = 'wall_element_dragging_axis_state_disabled'
export const WALL_ELEMENT_DRAGGING_AXIS_STATE_ENABLED = 'wall_element_dragging_axis_state_enabled'
export const WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED = 'wall_element_dragging_axis_state_snapped'

// Wall element auto-snapping distance to initial dragging axes in world space.
export const WALL_EL_DRAGGING_AUTO_SNAP_DISTANCE = 0.1

// If screen projection of the dragging axis is less than this value we disable dragging along this axis.
export const WALL_EL_DRAGGING_AXIS_MIN_PROJ_SIZE = 50

// Mutation failure reasons returned by WASM.
export const MUTATION_FAIL_REASON_UNKNOWN = 0
export const MUTATION_FAIL_REASON_WRONG_INPUT = 1
export const MUTATION_FAIL_REASON_WALL_MIN_LENGTH = 2
export const MUTATION_FAIL_REASON_WALL_ELEMENTS = 3
export const MUTATION_FAIL_REASON_SELF_INTERSECTION = 4