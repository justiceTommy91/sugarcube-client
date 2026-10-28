/**
 * Notification bits for the "what" field in NotificationInfo. These values can
 * be or'ed together when specifying the filter bits with observers. (See
 * NotificationObserver.addObserver.) Bits 0x0001-0x8000 are reserved for
 * published (API) notifications, shown here. Other bits are used internally.
 */
export const NOTIFY_DOWNLOAD_ERROR = 0x01
export const NOTIFY_VIEWER_STATE_UPDATE = 0x02
export const NOTIFY_VIEWER_ERROR = 0x04
export const NOTIFY_SCENE_ITEM_UPDATE = 0x08
export const NOTIFY_LOW_PERFORMANCE = 0x10
export const NOTIFY_VIEWER_WARNING = 0x20
export const NOTIFY_CAMERA_TRANSFORM_UPDATE = 0x40
export const NOTIFY_GPU_STATS = 0x50

// Notifications dispatched in-lieu of legacy callbacks, while we transition to
// the new API; will go away.
export const NOTIFY_VIEWER_LEGACY_CALLBACK = 0x8000

/**
 * Download-type values are used with ViewerDownloadErrorNotification.
 */
export const DOWNLOAD_TYPE_SCENEDATA = 'scene_data'
export const DOWNLOAD_TYPE_PRODUCT = 'product'
export const DOWNLOAD_TYPE_ENVMAP = 'env_map'

/**
 * Options for mirroring furniture items.
 */
export const MIRROR_X = 1
export const MIRROR_Y = 2
export const MIRROR_Z = 3

/**
 * The various ways an item can be places in the scene.
 * Note that some of these values can be combined.
 */
export enum PlacingOptions {
  UNKNOWN = 0,
  // Various combinations of wall and floor placing options:
  FLOOR_ONLY = 0x001,
  WALL_ONLY = 0x002,
  WALL_AND_FLOOR = 0x004,
  WALL_OR_FLOOR = 0x008,
  // Some items have custom anchoring information in the furniture data:
  CUSTOM_ANCHORED = 0x010,
  // Some item can be snap-rotated at preset angles:
  SNAP_ROTATABLE = 0x020,
  // Items that always need to be anchored to a wall:
  WALL_ANCHORED = WALL_AND_FLOOR | WALL_ONLY,  // eslint-disable-line no-bitwise
}

/**
 * An item's current placing behavior.
 */
export enum PlacingBehavior {
  ON_FLOOR = 'Floor',  // Only on floor.
  ON_WALL = 'WallPlaceable',  // Only on walls.
  WALL_OR_FLOOR = 'WallOrFloorPlaceable',  // Can move from floor to wall and back.
  WALL_AND_FLOOR = 'WallAndFloorPlaceable',  // Must touch a wall and floor simultaneously.
  WALL_ART = 'WallArt',  // Special case for art items placed on the wall (or ceiling sometimes).
  NONE = 'None'  // I.e. undetermined or no applicable behavior, such as bed mattresses.
}

export enum ToneMapType {
  BlenderFilmic = 'BlenderFilmic',
  PBRNeutral = 'PBRNeutral',
  ACESFilmic = 'ACESFilmic',
  Disabled = 'Disabled'
}

export enum AutoExposureMeasurementMethod {
  AverageLogLuminance = 'AverageLog',
  PercentileLuminance90 = '90thPercentile',
  Hybrid = 'Hybrid'
}

/**
 * Placement dimension constraints (meters).
 */
export const MIN_DIMENSION_M = 0.20
export const MIN_EXTRUSION_DEPTH_M = 0.45

/**
 * Placement constraint warning field values.
 */
export const WARN_DIM_WIDTH = 'width' as const
export const WARN_DIM_HEIGHT = 'height' as const
export const WARN_DIM_DEPTH = 'depth' as const
export const WARN_REASON_MIN_SIZE = 'min-size' as const
export const WARN_REASON_WALL = 'wall-boundary' as const
export const WARN_REASON_CEILING = 'ceiling-boundary' as const
export const WARN_REASON_FLOOR = 'floor-boundary' as const
