import { withPrefix } from 'gatsby'

import { ValueOf } from 'utils/object'
import { FILTER_TYPE_FURNISHED, FILTER_TYPE_SEMI_FURNISHED } from 'models/showrooms/constants'

export const NEW_SCENE_ID = '-1'

export const ROOM_BUILDER_SCENE_THUMBNAIL = withPrefix('/images/planner/roomBuilderThumbnail.jpg')
export const ROOM_BUILDER_DIMENSION_TIP = withPrefix('/images/planner/dimension_tip_rectangle.png')
export const ROOM_BUILDER_CUT_OUT = withPrefix('/images/graphics/roomBuilderCutOut.png')

// Room types
export const UNKNOWN_ROOMTYPE = 'UNKNOWN'
export const OTHER_ROOMTYPE = 'OTHER'
export const DINING_ROOM = 'DINING_ROOM'
export const LIVING_ROOM = 'LIVING_ROOM'
export const BEDROOM = 'BEDROOM'
export const OFFICE = 'OFFICE'
export const EMPTY = 'EMPTY'
export const GENERIC_ROOMTYPE = 'GENERIC'
export const DORM_ROOM = 'DORM_ROOM'
export const CHILDREN_ROOM = 'CHILDREN'
export const HALLWAY = 'HALLWAY'

export const ROOM_TYPES = [
    UNKNOWN_ROOMTYPE,
    OTHER_ROOMTYPE,
    DINING_ROOM,
    LIVING_ROOM,
    BEDROOM,
    OFFICE,
    EMPTY,
    GENERIC_ROOMTYPE,
    DORM_ROOM,
    CHILDREN_ROOM,
    FILTER_TYPE_FURNISHED,
    FILTER_TYPE_SEMI_FURNISHED,
] as const
export const UNSUPPORTED_ROOMTYPES = [UNKNOWN_ROOMTYPE, OTHER_ROOMTYPE]

export type RoomType = (typeof ROOM_TYPES)[number]

// Furnishing types
export const UNFURNISHED = 'UNFURNISHED'
export const PARTLY_FURNISHED = 'PARTLY_FURNISHED'
export const FULLY_FURNISHED = 'FULLY_FURNISHED'

export const FURNISHING_TYPES = [UNFURNISHED, PARTLY_FURNISHED, FULLY_FURNISHED] as const

export type FurnishingType = (typeof FURNISHING_TYPES)[number]

// Source types
export const SOURCETYPE_CAPTURED = 1
export const SOURCETYPE_SYNTHETIC = 2
export const SOURCETYPE_ROOMBUILDER = 3
export const SOURCETYPE_VIRTUAL_STAGING = 4
export const SOURCETYPE_LITE_SCAN = 5
export const SOURCETYPE_FMF_LITE = 6

export type SourceType =
    | typeof SOURCETYPE_CAPTURED
    | typeof SOURCETYPE_SYNTHETIC
    | typeof SOURCETYPE_ROOMBUILDER
    | typeof SOURCETYPE_VIRTUAL_STAGING
    | typeof SOURCETYPE_LITE_SCAN
    | typeof SOURCETYPE_FMF_LITE

// GLTF Scene types
export const SCENE_TYPES = {
    PHOTO_AR: 'PhotoAR',
    STANDARD_3D: 'Standard3D',
} as const
export type SceneType = ValueOf<typeof SCENE_TYPES>

// GLTF Scene sources
export const SCENE_SOURCES = {
    ROOM_BUILDER: 'RoomBuilder',
    SCENE_MANIFEST: 'SceneManifest',
} as const
export type SceneSource = ValueOf<typeof SCENE_SOURCES>

// Advanced recommendations {{{
export const SMART_REC_SUPPORTED_ROOM_TYPES = [
    'home-office',
    'living-room',
    'bedroom',
    'bathroom',
    'childrens-room',
    'outdoor',
    'hallway',
    'kitchen',
    'dining-room',
    'laundry',
    'garage',
] as const

export const MAP_ROOM_TYPE_TO_SMART_REC_ROOM_TYPE: Record<RoomType, (typeof SMART_REC_SUPPORTED_ROOM_TYPES)[number]> = {
    UNKNOWN: 'bedroom',
    OTHER: 'bedroom',
    DINING_ROOM: 'dining-room',
    LIVING_ROOM: 'living-room',
    BEDROOM: 'bedroom',
    OFFICE: 'home-office',
    EMPTY: 'bedroom',
    GENERIC: 'bedroom',
    DORM_ROOM: 'bedroom',
    CHILDREN: 'childrens-room',
    FULLY_FURNISHED: 'bedroom',
    PARTLY_FURNISHED: 'bedroom',
}
// }}}

// Scene assets cache keys.
export const ASSETS_CACHE_ENVMAP_KEY = 'equirectangular'

// Scene states (match API response values)
export const SCENE_STATE_PROCESSING = 'Processing'
export const SCENE_STATE_QUEUED = 'Queued'
export const SCENE_STATE_UPLOADED = 'Uploaded'
export const SCENE_STATE_FAILED = 'Failed'
export const SCENE_STATE_ERROR = 'Error'
export const SCENE_STATE_SUCCESS = 'Success'
export const SCENE_STATE_COMPLETE = 'Complete'

export const SCENE_STATES = [
    SCENE_STATE_PROCESSING,
    SCENE_STATE_QUEUED,
    SCENE_STATE_UPLOADED,
    SCENE_STATE_FAILED,
    SCENE_STATE_ERROR,
    SCENE_STATE_SUCCESS,
    SCENE_STATE_COMPLETE,
] as const

export type SceneState = (typeof SCENE_STATES)[number]
