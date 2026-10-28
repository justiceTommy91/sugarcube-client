/* eslint-disable i18next/no-literal-string */
import { withPrefix } from "gatsby"

export const RUG_SUB_LAYER_DELTA = 0.0075
export const RUG_THICKNESS = 0.0235
export const THIN_RUG_THICKNESS = 0.0075
export const RUG_Z_FIGHT_OFFSET = 0.01

export const DEFAULT_MOBILE_TEXTURE_SIZE = 1024

export const SENTRY_BREADCRUMB_CATEGORY = 'graphics'

export const STACKABLE_UX_MAX_INDIRECT_DISTANCE = 0.2

export const AA_FXAA = 1
export const AA_TAA = 2
//
// Certain furniture can behave badly when pressed flush
// against a wall. The backboard of something like
// a bookshelf can appear to embed itself inside of the
// wall, causing the user to see wall where they would
// expect to see the shelf's backboard. This is due to the
// wall's floor lines not being perfectly aligned with the
// its depth data. The cause is different but the effect
// looks something like z-fighting. See the JIRA entry
// here for an example:
//
// https://geomagical.atlassian.net/browse/GFX-500
//
// The following shift walls outward by
// 0.02125 along their normals. This shift makes it so that
// you can't push a furniture item through the wall's depth
// barrier. The value 0.02125 was determined experimentally,
// and is roughly the diameter of a penny.
//
export const WALL_SHIFT_PANO_ROOMS = 0.02125
export const WALL_SHIFT_3D_ROOMS = 0.01

export const DEFAULT_THREE_NATIVE_LAYER = 0
export const STATIC_STACKABLES_THREE_NATIVE_LAYER = 1
export const COLOR_ID_SUBOBJECT_LAYER = 2
export const BAKED_RUG_SHADOWS_LAYER = 3
export const WALL_PLACEABLE_LAYER = 4
export const AO_LAYER = 5 // Objects that'll be subject to SSAO
export const AO_PANO_LAYER = 6 // Objects that'll be subject to SSAO, but won't self-shadow
export const LIGHT_COOKIE_LAYER = 7

export const ON_TOP_OF_DEFAULT_RENDER_ORDER = 1
export const STENCIL_MATERIAL_RENDER_ORDER = 100
export const STENCILED_OBJECTS_RENDER_ORDER = 101
export const TRANSPARENT_OBJECTS_RENDER_ORDER = 102
export const ALWAYS_ON_TOP_RENDER_ORDER = 999

export const SKYSPHERE_STENCIL_REF = 99
export const SKYSPHERE_NAME = 'skysphere'

// Used to push the surface out the parent object to make it visible when highlighted.
export const STATIC_STACKABLE_SURFACE_DEPTH_DELTA = 0.005
export const STACKABLE_SURFACE_DEPTH_DELTA = 0.00075


// For more information on this constant see makeFloorLinesFromPolys().
export const WALL_INTERSECTION_SHIFT = 0.1524 // 6in

// When dragging an item from the floor to a wall, we want to avoid sampling the exact corner line between
// floor and wall planes, because it leads to "noisy" sampling results jumping between wall and floor.
// This "push in" margin is applied to prevent it from happening and make sure that we always sample the wall.
export const WALL_3D_PUSH_IN_MARGIN = 0.04

// If a furniture item's back side is facing a wall, is closer to the wall then this distance,
// and the camera is behind that wall, the item will be hidden.
export const MAX_BACK_SIDE_DISTANCE_TO_WALL_TO_HIDE = 0.1

export const DOWNLOAD_RETRIES_COUNT = 3
export const DOWNLOAD_RETRY_DELAY_MS = 1000

export const GL_ERR_CODES: { [key: number]: string } = {
    0: 'GL_NO_ERROR',
    1280: 'GL_INVALID_ENUM',
    1281: 'GL_INVALID_VALUE',
    1282: 'GL_INVALID_OPERATION',
    1283: 'GL_STACK_OVERFLOW',
    1284: 'GL_STACK_UNDERFLOW',
    1285: 'GL_OUT_OF_MEMORY',
    1286: 'GL_INVALID_FRAMEBUFFER_OPERATION',
    1287: 'GL_CONTEXT_LOST',
    37442: 'GL_CONTEXT_LOST',
    32817: 'GL_TABLE_TOO_LARGE',
} as const

// these constants must have the same values as corresponding MIRROR_#
// constants in src\constants\configurabilityTypes.ts
export const AXIS_X = 1
export const AXIS_Y = 2
export const AXIS_Z = 3

// Analytical light shadow biases.
export const SHADOW_BIAS_DIRECTIONAL = -0.00002
export const SHADOW_BIAS_POINT = -0.00014
export const SHADOW_BIAS_SPOT = -0.00014
export const NORMAL_BIAS_DIRECTIONAL = 0.04

// Analytical light PCSS shadows constants.
// An average light frustum width and size selected based on averaging multiple rooms data
export const PCSS_LIGHT_WORLD_SIZE = 0.15
export const PCSS_DEFAULT_FRUSTUM_WIDTH = 10

// Default wall art ambient light intensities
export const ART_LIGHT_DEFAULT_INTENSITY = 0.8
export const ART_LIGHT_PBR_INTENSITY = Math.PI

// Notification bits are used by NotificationDispatcher and GrandCentral to tag
// notifications. They can be or'ed together to filter several notifications of interest.
// The first 16-bits are used for public notifications, i.e. notifications that are
// advertised in the GeomViewer API. Bits 0x1,0000 to 0x8000,0000 are reserved for
// internal use.
export const NOTIFY_FURNITURE_ITEM_READY = 0x010000
export const NOTIFY_FURNITURE_ITEM_MOVE_START = 0x020000
export const NOTIFY_FURNITURE_ITEM_MOVE_END = 0x040000
export const NOTIFY_ART_ITEM_READY = 0x400000
// The data needed for positioning (bounding and renderObject) can be the ones from the placeholder box while real
// item is downloading. Once the real item is loaded these properties are re-set (are the same size). 
// This notification exists because there is no need to wait for the real item (NOTIFY_FURNITURE_ITEM_READY) for 
// positioning while item downloads and meanwhile placeholder box can be positioned and shown.
export const NOTIFY_RENDER_ITEM_POSITIONING_READY = 0x080000

export const NOTIFY_COMPOSITION_LOADING_BEGIN = 0x100000
export const NOTIFY_COMPOSITION_LOADING_END = 0x200000

// these javascript events will appear in Safari WebInspector timeline recording
export const EVT_FURNITURE_LOAD_BEGIN = 'EVT_FURNITURE_LOAD_BEGIN' // furniture item loading begin
export const EVT_FURNITURE_LOAD_END = 'EVT_FURNITURE_LOAD_END' // furniture item loading end
export const EVT_PINS_MANAGER_UPDATED = 'EVT_PINS_MANAGER_UPDATED' // pins manager did update pins visual locations
// the same as above, but fired as a CustomEvent with detail, needed for e2e tests
// Safari WebInspector seem to be ignoring CustomEvents, that's why we need two separate ones.
export const EVT_FURNITURE_LOAD_END_DETAIL = 'EVT_FURNITURE_LOAD_END_DETAIL'
export const EVT_WALL_ART_LOAD_END = 'EVT_WALL_ART_LOAD_END' // art item loading end
export const EVT_GLTFLOADER_FILE_LOAD_BEGIN = 'EVT_GLTFLOADER_FILE_LOAD_BEGIN' // glb file download begin
export const EVT_GLTFLOADER_FILE_LOAD_END = 'EVT_GLTFLOADER_FILE_LOAD_END' // glb file download end
export const EVT_GLTFLOADER_PARSE_BEGIN = 'EVT_GLTFLOADER_PARSE_BEGIN' // GLTFLoader started glb parsing
export const EVT_GLTFLOADER_PARSE_END = 'EVT_GLTFLOADER_PARSE_END' // GLTFLoader finished glb parsing
export const EVT_FURNITURE_GLB_LOAD_END = 'EVT_FURNITURE_GLB_LOAD_END' // GLB loading by GLTFLoader finished

// Used as a fallback for the equirectangular texture URL when none is provided by the manifest.
export const ALTERNATE_ENV_MAP_URL = withPrefix('/testAssets/cubemap/halfFurnished_HDRnoflip.hdr')
export const PLACEABLE_HINT_ARROW_URL = withPrefix('/testAssets/placeableHint/arrow.png')
export const PLACEABLE_HINT_ARROW_SHADOW_URL = withPrefix('/testAssets/placeableHint/shadow.png')

// Asset names in manifest object.
export const PANORAMA_ASSET_NAME = 'pano_0'
export const PANO_INPAINT_ASSET_NAME = 'pano_inpaint_0'
export const SEGM_INPAINT_ASSET_NAME = 'segmentation_inpainting_0'
export const NORMALS_SEGM_ASSET_NAME = 'normals_segmentation_0'
export const NORM_SEGM_INPAINT_ASSET_NAME = 'normals_segmentation_inpaint_0'
export const OCCLUSION_MAP_ASSET_NAME = 'depth_occlusion_0'
export const OCCLUSION_INPAINT_MAP_ASSET_NAME = 'depth_occlusion_inpaint_0'
export const RESIDUAL_MAP_ASSET_NAME = 'residual_0'
export const RESIDUAL_INPAINT_MAP_ASSET_NAME = 'residual_inpaint_0'
export const SEGMENTATION_ASSET_NAME = 'segmentation_0'
export const SHADING_MAP_ASSET_NAME = 'shading_0'
export const SHADING_INPAINT_MAP_ASSET_NAME = 'shading_inpaint_0'
export const EQUIRECTANGULAR_ASSET_NAME = 'equirectangular'
export const PLANE_ORIENTATION_INPAINT_ASSET_NAME = 'plane_orientation_inpaint_0'
export const PLANE_ORIENTATION_ASSET_NAME = 'plane_orientation_0'
export const INTRINSICS_ASSET_NAME = 'intrinsics_0'
export const PLANE_POLYGON_ASSET_NAME = 'plane_polygon_0'

export const GLTF_PANO_IMAGE_NAME = 'panoImage'
export const GLTF_DEPTH_IMAGE_NAME = 'depthImage'
export const GLTF_SEGMENTATION_IMAGE_NAME = 'segmentationImage'
export const GLTF_SHADING_IMAGE_NAME = 'shadingImage'
export const GLTF_RESIDUAL_IMAGE_NAME = 'residualImage'
export const GLTF_SHADING_INPAINT_IMAGE_NAME = 'shadingEraserImage'
export const GLTF_RESIDUAL_INPAINT_IMAGE_NAME = 'residualEraserImage'

// Render target size reduce factor for color id renderer class
export const COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR = 0.25

// Constants related to outline effect
export const EDGE_VISIBLE_COLOR = 0xffdb00
export const EDGE_SELECTED_COLOR = 0xffdb00
export const EDGE_HIDDEN_COLOR = 0xffdb00

// Max distance at which visual arrow hint for placeable items will appear on the wall or the floor
export const PLACEABLE_HINT_APPEAR_DISTANCE_WALL = 0.5
export const PLACEABLE_HINT_APPEAR_DISTANCE_FLOOR = 0.25

// NYUD40 segmentation list of classes
// See https://github.com/shelhamer/fcn.berkeleyvision.org/blob/master/data/nyud/README.md.
export const NYUD40_CLASSES: Array<string> = [
    'unknown',
    'wall',
    'floor',
    'cabinet',
    'bed',
    'chair',
    'sofa',
    'table',
    'door',
    'window',
    'bookshelf',
    'picture',
    'counter',
    'blinds',
    'desk',
    'shelves',
    'curtain',
    'dresser',
    'pillow',
    'mirror',
    'floor mat',
    'clothes',
    'ceiling',
    'books',
    'refridgerator',
    'television',
    'paper',
    'towel',
    'shower curtain',
    'box',
    'whiteboard',
    'person',
    'night stand',
    'toilet',
    'sink',
    'lamp',
    'bathtub',
    'bag',
    'otherstructure',
    'otherfurniture',
    'otherprop',
]

// A list of colors per NYUD40 class for debugging visualizer
export const NYUD40_COLORS: number[][] = [
    [10, 10, 13],       // unknown
    [198, 166, 100],    // wall
    [47, 69, 56],       // floor
    [138, 102, 66],     // cabinet
    [225, 204, 79],     // bed
    [130, 137, 143],    // chair
    [164, 125, 144],    // sofa
    [169, 131, 7],      // table
    [37, 109, 123],     // door
    [49, 102, 80],      // window
    [239, 169, 74],     // bookshelf
    [234, 137, 154],    // picture
    [144, 70, 132],     // counter
    [213, 48, 50],      // blinds
    [244, 70, 17],      // desk
    [76, 81, 74],       // shelves
    [189, 236, 182],    // curtain
    [157, 145, 1],      // dresser
    [250, 210, 1],      // pillow
    [1, 93, 82],        // mirror
    [37, 40, 80],       // floor mat
    [161, 35, 18],      // clothes
    [87, 166, 57],      // ceiling
    [234, 230, 202],    // books
    [127, 181, 181],    // refridgerator
    [222, 76, 138],     // television
    [255, 255, 0],      // paper
    [71, 64, 46],       // towel
    [29, 51, 74],       // shower curtain
    [42, 46, 75],       // box
    [132, 195, 190],    // whiteboard
    [0, 187, 45],       // person
    [199, 180, 70],     // night stand
    [71, 75, 78],       // toilet
    [179, 36, 40],      // sink
    [235, 106, 14],     // lamp
    [215, 45, 109],     // bathtub
    [234, 230, 202],    // bag
    [1, 93, 82],        // otherstructure
    [189, 236, 182],    // otherfurniture
    [161, 35, 18],      // otherprop
]

// A list of disallowed wall placement NYUD40 classes
export const DISALLOWED_WALL_PLACEMENT_CLASSES: string[] = ['door', 'window']

// Special item ID used for the unique GhostItem instance
export const GHOST_ITEM_ID = '-1'

// Special surface ID used when hovering or stacking on the floor.
export const FLOOR_STACKABLE_SURFACE_ID = 'FloorStackableId'

export const EXTRA_HINT_STACKABLE = 'stackable'
export const EXTRA_HINT_DRAGGING_IN_HAND = 'dragging-in-hand'

export const STACKABLE_TEAR_OFF_TRESHOLD_METERS = 0.25
// Screen-space tear-of detection is used for surfaces that are in "indirect" interaction mode.
export const STACKABLE_TEAR_OFF_TRESHOLD_PIXELS = 75
export const STACKABLE_SNAP_TO_TRESHOLD_METERS = 0.2

// Don't show dynamic measurement if distance is smaller than this value.
export const DYNAMIC_MEASUREMENTS_MIN_LENGTH = 0.05

// Empirical threshold values for detecting low performance
export const LOW_PERFORMANCE_FRAME_TIME_UPPER_THRESHOLD = 45.0
export const LOW_PERFORMANCE_FRAME_TIME_LOWER_THRESHOLD = 35.0

// Desired aspect ratio when rendering thumbnails for mesh rooms.
export const MESH_ROOM_THUMBNAIL_ASPECT_RATIO_W_H = 16 / 10
