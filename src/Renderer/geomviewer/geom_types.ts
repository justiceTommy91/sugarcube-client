/**
 * Types used throughout the GeomViewer API.
 */

import type { LightingData } from "Renderer/assets/Types"
import type { GLTf } from "Renderer/gltf/gltf"
import * as gc from "./geom_constants"

/**
 * API functions that can fail return a GvResult.
 */
export type GvResult<RetType = undefined> = {
  ok: boolean  // Whether the call succeeded.
  errorMsg?: string  // Error message, only when ok == false.
  retValues?: RetType  // Optional return value.
}

/**
 * Convenience geometry types.
 */
export type Point2D = [number, number];
export type Point3D = [number, number, number];
export type Quat4D = [number, number, number, number];
export type PointXY = { x: number, y: number };
export type PointXYZ = { x: number, y: number, z: number };
export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
]
export type Matrix4x4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
]

/** Animation override for an item's rendered transform and appearance. */
export type AnimationOverride = {
  position?: PointXYZ
  rotation?: Quat4D
  scale?: PointXYZ
  opacity?: number
  blendFactor: number
  space: 'local' | 'world' | 'view'
  /** Position as delta from rest position in view space, not absolute. */
  anchorToRest?: boolean
}

/**
 * PlaneType is used to characterize a plane in the scene manifest.
 * stackable class is for the static stackable surfaces in the room.
 */
export type SurfaceClass = 'wall' | 'floor' | 'ceiling' | 'opening' | 'door' | 'window' | 'stackable'
export type PlaneType = {
  id: number;
  d: number;/// d is from plane equation ax + by + cz + d = 0
  rot: Matrix3x3;  // 3x3 matrix with column 1 == x-basis, 2 = y-basis and 3 = z-basis vectors.
  class: SurfaceClass;  // class is the kind of plane, such as 'floor' or 'wall'.
}

/**
 * An array of plane types, directly out of the scene manifest.
 */
export type PlaneData = {
  planeData: Array<PlaneType>;
}

export type ManifestPolygonType = {
  id: number
  class: SurfaceClass
}

export type ManifestPolygonData = {
  plane_polygons: Array<ManifestPolygonType>
}


export type Location3 = {
    // Local-space position for the item.
    localPos: PointXYZ,
    // The plane or surface ID to which the item is bound.
    bindTo: string,
    // Gives additional information about placement. Currently used to know if the item is stacked.
    hintExtraBindTo?: string,
}

/**
 * Placement describes how an item, such as a piece of furniture, is placed in the scene.
 * For now only location3 kind of placement are available. But in the future we may have
 * other types of placement info and constraints.
 */
export type Placement = {
  // Location3: positions an item in world space together with a plane or surface ID
  // to which the item is bound, such as a shelve on a wall. Some items may be bound to
  // two planes, e.g. as wall-and-floor furniture. In that case, a hintExtraBindTo
  // ID is also provided for the second plane.
  kind: 'location3',
  location3: Location3,
  // Rotation undefined means the item is added from side panel and not loaded from saved 
  // composition. If defined, that one will be applied, if not item will arrange its rotation.
  rotation?: Quat4D,
} | {
  kind: 'location3Legacy',
  location3: Location3,
  rotation: Quat4D,
  parentId?: string
} | {
  kind: 'location2Legacy',
  location2: Point2D,
  location3: Location3,
  rotation?: Quat4D,
  heading: number,
}

/**
 * Manifest data, a.k.a. the scene manifest.
 */
export type ManifestData = {
  plane_orientation_inpaint_0?: PlaneData;
  plane_orientation_0?: PlaneData;
  plane_polygon_0?: ManifestPolygonData;
  semantic_segmentation_visual_0?: string;
  lighting?: LightingData;
  [key: string]: undefined | number | string | object;
}

/**
 * Describe a scene as loaded by the viewer.
 */
const SOURCETYPE_CAPTURED = 1
const SOURCETYPE_SYNTHETIC = 2
const SOURCETYPE_ROOMBUILDER = 3
// Not customer-facing
const SOURCETYPE_VIRTUAL_STAGING = 4
const SOURCETYPE_LITE_SCAN = 5
const SOURCETYPE_FMF_LITE = 6
export type SceneInfo = {
  // scene ID from server.
  sceneId: string;
  // The scene manifest.
  manifest: ManifestData | null;
  // The scene gltfManifest.
  gltfManifest: GLTf | null;
  // Base URL for loading GLTF assets.
  gltfBaseUrl: string | null;
  // The scene source type
  sourceType:
    | typeof SOURCETYPE_CAPTURED
    | typeof SOURCETYPE_SYNTHETIC
    | typeof SOURCETYPE_ROOMBUILDER
    | typeof SOURCETYPE_VIRTUAL_STAGING
    | typeof SOURCETYPE_LITE_SCAN
    | typeof SOURCETYPE_FMF_LITE;
  // The scene creation date.
  createdAt: string;
}

/**
 * User data restored from or saved to persistent storage.
 */
export type PersistUserData = {
  magicEraser?: {
    saveData: {
      erasedSegments: number[];  // List of region IDs that the user has erased.
    }
  }
  measurements?: {
    dynamicMeasurements: boolean,
    productDimensions: boolean,
    roomDimensions: boolean,
  }
  wallPaint?: {
    [key: string]: string | number;
  }
  wallPaintInpaint?: {
    [key: string]: string | number;
  }
}

/**
 * Describes a 2D profile for an art frame. These profiles are extruded to
 * form the actual 3D frame around the picture.
 */
export type ArtFrameProfile = {
  textureName: string;
  albedo: number | string;
  profile: Point2D[];
  scaleU: number;
  scaleV: number;
}

export type Color = {
  name: string;
  material: string;
  albedo: number | string;
  hex: string;
}

/**
 * Description for all available frames for a given art item.
 */
export type ArtFrameData = {
  canvasDepth: number;
  matOffset: number;
  sections?: Array<ArtFrameProfile>;
  color: Color;
  matte: {
    id: number;
    sections?: Array<ArtFrameProfile>;
  }
}

/**
 * Parameters used to configure wall-art items when added to the scene.
 */
export type ArtItemParameters = {
  image: { artImageData: ImageData, msFileDownloadTime: number };
  size: number;
  frameData: ArtFrameData;
}

/**
 * Parameters used to configure stackable-surface items when added to the scene.
 */
export type StackableSurfaceParameters = {
  // Unique ID associated with the surface's plane:
  id: string;
  // 2D geometry for the surface:
  parameters:
  | {
    type: 'circle'
    radius: number
    vertices: Point2D[]
  }
  | {
    type: 'polygon'
    vertices: Point2D[]
  };
  // 4x4 local transform, maps 2D geometry to local 3D space.
  transform: Matrix4x4;
}

/**
 * Combinable are special furniture items that are meant to be combined with a
 * parent item, such as a mattress or pillow, which are combined with bed frames.
 */
export type CombinablePlacement = {
  parentId: number;
  localTransform: number[];

  // Optional linkGroupName controls which combinable siblings will act as one
  // when outlining, computing pin positions and corners.
  linkGroupName?: string;
  socketName?: string;
}

/**
 * Placeable info for furniture items.
 * See https://geomagical.atlassian.net/wiki/spaces/WGFX/pages/1290993665/Placeables+version+3
 * Note:
 * Deprecate this type in GeomViewer. This property needs to be converted to a format that
 * is more directly usable to implement furniture behaviors in the viewer.
 */
export type Placeables = {
  version: number;
  combinations: number[][];
  anchors: {
    category: 'floor' | 'wall';
    constraint?: string;
    position?: Point2D;
    matrixModel?: Matrix4x4
  }[];
}


/**
 * Parameters used to configure furniture items when added to the scene.
 */
export interface FurnitureItemParameters {
  id: string, // Used by ghost item.
  globalProductId: string; // Used in Sentry error dispatches.

  modelUrl: string; // URL to model's GLB file.
  materialUrl?: string

  min: PointXYZ; // Bounding-box min.
  max: PointXYZ; // Bounding box max.
  scale: number; // Almost always 1.0; used to scale the item.
  rotX: number; // Almost always pi/2; rotates the item locally about x-axis.
  heading: number; // Item's heading, or rotation from default forward direction.

  isRug: boolean; // Whether the item is a rug.
  canStack: boolean; // Whether the item can be placed on a stacking surface.
  hasTallLegs: boolean; // Flag items such as tables.
  isCubicStructure: boolean; // Flag roughly cube-shaped items.
  uncompressedModelSize: number; // Uncompressed GLB model size; used for statistics.

  // Mirroring option if the item can be mirrored, undefined otherwise.
  mirrorOption?: typeof gc.MIRROR_X | typeof gc.MIRROR_Y | typeof gc.MIRROR_Z;
  // Whether the item should be mirrored when initially added to the scene.
  shouldMirrorItem: boolean;

  // Whether and how the item is combined with a parent, such as a mattress on a bed.
  combinablePlacement?: CombinablePlacement;

  // Placeable info describes how the furniture is anchored and snap-rotation options.
  placeables?: Placeables;
  anchorCombinationIndex?: number;

  // How the item should be placed in the scene. Note that placingOptions take precedences over
  // placingBehavior.
  placingOptions: gc.PlacingOptions;
  placingBehaviorHint: gc.PlacingBehavior;

  // If the item is stacked on a surface, this is the stackable surface's item ID.
  stackOnSurfaceId?: string;

  // Stackable surfaces associated with this item, such as the top of a table.
  // Parameter rotatedStackable is used for snap-rotatable furniture.
  stackables?: StackableSurfaceParameters[];
  rotatedStackables?: StackableSurfaceParameters[];

  // metadata
  metadata: unknown;

  // Legacy placing-behavior info. Comment in FurnitureItem.setPosSystem indicates it is
  // used with incorrect geometry from backend. It is not clear what kind of instability
  // may result from removing it. Leaving it for now.
  swappedOutPlacingBehavior?: gc.PlacingBehavior;

  // Tells if the item was added by swapping in with another item. 
  swappedInItem: boolean;

  // Tells if item comes from a duplicate UI request. We need to differentiate a duplicate from a fresh addition
  // for example to set a default orientation or the duplicated item one.
  isAddedFromDuplicate?: boolean;

  // Tells if the item has smartaPlacement data available. Used by the viewer to know if it needs to generate a default
  // placement for the item.
  hasSmartaPlacement?: boolean

  // If set to true, this indicates smarta placement request is still pending and viewer won't switch from
  // placeholder to actual model even if it finishes loading.
  // Placeholder is removed if the item is manually dragged or by setting the placement using modifySceneItem().
  pendingSmartaPlacement?: boolean
  
  isNoninteractable?: boolean

  /** Initial animation override applied before the placeholder is rendered. */
  initialAnimationOverride?: AnimationOverride
}

/**
 * Parameters used to configure a scene item that is added to the scene. The exact
 * content depends on the kind of item being added, as specified by the itemKind
 * property.
 */
export type SceneItemParameters =
  | {
    itemKind: 'art-item',
    // Item 3D position restored from a composition. Leave undefined when adding from catalog.
    restoredPosition?: [number, number, number];
    // Legacy item 2D position from a composition. Leave empty when adding from catalog.
    legacyPosition?: [number, number];
    // Placement in 3D scene. Undefined when adding new items or for legacy compositions.
    placement?: Placement;
    // Item-specific options.
    itemOptions: ArtItemParameters;
  }
  | {
    itemKind: 'furniture-item',
    // Item 3D position restored from a composition. Leave undefined when adding from catalog.
    restoredPosition?: [number, number, number];
    // Legacy item 2D position from a composition. Leave undefined when adding from catalog.
    legacyPosition?: [number, number];
    // Placement in 3D scene. Undefined when adding new items or for legacy compositions.
    placement?: Placement;
    // Restore current snap rotation. Meaningful only for items that support snap rotations.
    currentSnapRotationIndex?: number;
    // Item-specific options.
    itemOptions: FurnitureItemParameters;
  };

/**
 * Parameters used when modifying an item already in the scene. The exact content
 * depends on the kind of item that is being modified.
 */
export type ModifyItemParameters = {
  modifyArtItem?: {
    frameData: ArtFrameData;
    size: number;
  }
  modifyFurnitureItem?: {
    // Note: only one of the options below should be specified at a time. Specify more
    // than one option and you'll get whatever the viewer feels like doing on that day.

    // Change the item's orientation.
    newOrientation?: number;
    // For continuous orientation editing: set editOrientationStatus to 'begin' with the
    // first update to newOrientation and 'end' with the last update. This will quiet
    // geometry notifications until the last update.
    editOrientationStatus?: 'begin' | 'end';
    // For snap-rotable items, move to the next available snap rotation.
    toNextSnapRotation?: boolean;
    // For items' that support mirroring, set whether the item is mirrored.
    setIsMirrored?: boolean;
    // Change the item's material.
    newMaterialUrl?: string

    animationOverride?: AnimationOverride
  }
  inspectorParameters?: {
    reattachToSurface?: boolean
    wallSnapPushOut?: boolean
    position?: PointXYZ
  }
}

export type CameraMode = 'default' | 'free' | 'focused' | 'orbit'

export type CameraModeParameters = {
  mode: CameraMode
  // If camera mode is item-specific (e.g. focused mode), pass related item id.
  itemId?: string
}

export type CameraState = {
  mode: 'default' | 'free' | 'focused'
  orbitModeAllowed: boolean
} | {
  mode: 'orbit'
  orbitModeAllowed: boolean
  minDollyDistance: number
  maxDollyDistance: number
  currentDollyDistance: number
}

/**
 * Viewer status, queried with getViewerStatus.
 */
export type ViewerStatus =
  'not-started' |  // Viewer has not been started.
  'initializing' | // Viewer is starting, busy loading background data.
  'ready' |        // Viewer is initialized and ready for user interactions.
  'running' |      // Viewer is actively drawing frames.
  'context-lost' | // Viewer has lost the webgl context.
  'init-failed' |  // Viewer initialization has failed and viewer should be shut down.
  'shutting-down'; // Viewer is shutting down and will soon be in not-started state.

/**
 * Settings used to configure the Viewer.
 */
export type ViewerSettings = {
  canvasWidth: number;
  isSyntheticScene: boolean;
  isRoomBuilderScene: boolean;
  is3dMeshScene: boolean;
  maxTextureSize: number;
  canMagicErase: boolean;
  hasTexturedWalls: boolean;
  toneMapType: gc.ToneMapType;
  exposureCompensation: number;
  onOffOptions: {
    collectFrameMetric: boolean;
    disableOutline: boolean;
    magicEraserMode: boolean;
    showItemLoaders: boolean;
    showOcclusions: boolean;
    showShadows: boolean;
    usePBR: boolean;
    wallCollisions: boolean; // I.e. enable wall collisions.
    enableDebugControls: boolean;
    useAutoExposure: boolean;
    disableMobileCanvasSizing?: boolean;
    enableDitheredOpacity?: boolean;
  }
  // Optimizely feature flags are used to selectively enable features, AB testing, etc.
  // They tend to change often and are declared here as a generic type so as to
  // not require frequent API updates.
  featureFlags: {
    [key: string]: boolean | Promise<boolean>;
  }
  // On/off options for mobile devices.
  mobileFeatures: {
    noAA: boolean;
    noWallColor: boolean;
    sequentialLoading: boolean;
    enableFXAA: boolean;
  }
}

/**
 * General viewer information, returned by queryViewerInfo.
 */
export type ViewerInfo = {
  // Current viewer status.
  status: ViewerStatus;
  // Whether the scene is a magic-eraser scene.
  isMagicEraserScene: boolean;
  // For magic-eraser scenes, the number of erasable items, otherwise always 0.
  erasableItems: number;
  // The number of static stackable surfaces added to the scene.
  numStaticStackableSurfaces: number;
  // List of views available in multiview scenes.
  views?: string[];
  // Label for canonical view.
  canonicalView?: string;
  // Label of the current view.
  currentView?: string;
  // Dimensions of the viewer.
  dimensions?: [number, number];
  // Current camera state.
  cameraState?: CameraState
  // Room dimensions.
  roomDimensionsEnabled?: boolean
  // Product dimensions.
  productDimensionsEnabled?: boolean
  // Dynamic measurements.
  dynamicMeasurementsEnabled?: boolean
}

/**
 * Information about an item in the scene, returned by querySceneItemInfo.
 */
export type SceneItemInfo = {
  // Corners of 2D item's axis-aligned bounding box, in relative screen coordinates,
  // as [[xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax]].
  corners: Point2D[];
  // Kind of item, such as 'furniture-item'.
  itemKind: SceneItemParameters['itemKind'] | 'stackable-surf-item';
}

/**
 * GL context information is dispatched by the GeomViewer once it reaches the 'ready' state.
 */
export type GlContextInfo = {
  hasFragmentDepth: boolean;
  antialias: boolean;
  software: boolean;
  canvas_height: number;
  canvas_width: number;
  hasWGL1QueryTimer: boolean;
  hasWGL2QueryTimer: boolean;
  hwinfo: {
    model: string;
    type: string;
    vendor: string;
    os: {
      name: string;
      version: string;
    }
    cpu: {
      architecture: string;
    }
  }
  version: string;
  GLSLversion: string;
  vendor: string;
  renderer: string;
  underlyingVendor: string | undefined;
  underlyingRenderer: string | undefined;
  devicePixelRatio: number;
}

/**
 * A user action that is not directly associated with a keyboard or mouse event
 * on the viewer.
 * eg. Hide all in magic eraser mode
 *
 * @note 'Placement mode' is a unique input mode in which users can drag a stackable item onto
 * the scene's stackable surfaces and place it using a mouse click.
 *
 * Entry Methods:
 * 1. 'enter-placement-mode' action (defined in this context). This works on the currently selected
 *    stackable item and removes it from the scene (e.g., changing surfaces).
 * 2. 'GeomViewerType.addSceneItem()' method, which is used when adding a new item to the scene.
 *
 * Exit Methods:
 * 1. The user clicks on a valid surface, placing the item there.
 * 2. The 'exit-placement-mode' action is triggered, placing the item on the floor.
 * 3. The 'cancel-placement-mode' action is triggered, discarding the item and restoring
 *    its original position if applicable.
 */
export type ViewerAction =
  // Show or hide all stackable regions in magic-eraser mode:
  'magic-eraser-show-all' |
  'magic-eraser-hide-all' |
  // Tell the viewer the canvas has new dimensions:
  'on-canvas-resized' |
  'deselect-all' |
  // Request that the viewer dispatch a notification on next draw idle:
  'request-on-draw-idle' |
  // Enter placement mode with the currently selected stackable item. (i.e. change stackable surfaces):
  'enter-placement-mode' |
  // End placement mode discarding changes:
  'cancel-placement-mode' |
  // End placement mode placing accessory on the floor:
  'exit-placement-mode' |
  // Ask the viewer to re-bake the envmap using the current scene state:
  'rebake-environment-map'

/**
 * ColorRepresentation is used to pass color information in various formats.
 */
export type ColorRepresentation =
  // A single hexadecimal number, e.g. 0xff0000.
  number |
  // A hexadecimal triplet, e.g. '0xff0000'.
  string |
  // r, g, b values in range 0..1, e.g. [ 1, 0, 0 ], or
  // r, g, b values in range 0..255, e.g. [255, 0, 0].
  [number, number, number] |
  // r, g, b values in range 0..1, e.g. { r: 1.0, g: 0.0, b: 0.0 }.
  { r: number, g: number, b: number }

  /**
   * RenderingLibraries enum type is used to select what backend 3D library will 
   * be running under the hood. FOr now we have only Three to represent threejs, later on
   * we can add in more libraries.
  */

  export enum RenderingLibraries {
    Three
}

export type LowPerformanceEventInfo = {
  frameTimes: number[]
  medianFrameTime: number
  firstFrameTimeStamp: number
  lastFrameTimeStamp: number
}
/**
 * COMPOSITION TYPES
 */
export type Corners = [Point2D, Point2D, Point2D, Point2D]

export type APIProduct = {
  id: number
  localItemNumber: string
  genericId: string
  typeName: string
  globalProduct: boolean
  productId: string
  stacks: boolean
  geometryType: string
  geometryTypes: string[]
  modelUrl: string
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
  scale: number
  rotX: number
  metadata: unknown | null
  stackables: unknown | null
  productGeometries: unknown
}

export interface RenderItem {
  id: number
  uniqueId: number
  x: number | null
  y: number | null
  z?: number
  corners: Corners
  heading: number
  headingI?: number
  headingJ?: number
  headingK?: number
  mirrorOptionEnabled: boolean
  stackedPlane?: string
  combinablePlacement?: Record<string, unknown> // TODO
  metrics: Record<string, unknown> | null
  readyAndRendered: boolean
  placingBehavior?: string // TODO narrow string type
  swappedOutPlacingBehavior?: string
  parentId?: number | null
  placeables?: unknown
  anchorCombinationIndex?: unknown
  p3?: { x: number; y: number; z: number }
  placement?: Placement
  smartaPlacement?: unknown
  rawPlacement3d?: {
      location3: {
          localPos: { x: number; y: number; z: number }
          bindTo: string
      }
      rotation?: Quat4D
  }
  parentIdOrSurface?: string
  parentAttachment?: number
  additionalContacts?: number[]
  swapChainPosition?: Point2D
  pin: {
      x: number
      y: number
      hidePin: boolean
      itemIsHidden: boolean
  }
  isAddedFromDuplicate?: boolean
  pendingSmartaPlacement?: boolean
  isLoading?: boolean
  assemblyFlip?: string
  socket?: string
  socketSet?: string
  // TODO artData keys
}
 
export type ArtProductData = {
  artAssetUrls: string[]
  displayWidthCm: number
  displayHeightCm: number
}

export type ArtRenderItemComplete = RenderItem &
  APIProduct &
  ArtProductData & {
      renderType: 'ART_ITEM'
      selected: boolean
      frame: ArtFrameData & {
          id: number
          name: string
          thumbUrl: string
          mattes: unknown
          colors: unknown
      }
      size: {
          height: number
      }
      artImageData: { artImageData: ImageData; msFileDownloadTime: number; }
  }

export type FurnitureRenderItemComplete = RenderItem &
  APIProduct & {
      renderType: 'FURNITURE_ITEM'
      selected: boolean
      isCombinableChild: boolean
  }

export type RenderItemComplete = ArtRenderItemComplete | FurnitureRenderItemComplete

export type Composition = {
  scene: SceneInfo
  renderItems: RenderItemComplete[]
}

export type CompositionExport = { 
  renderItems: Partial<RenderItemComplete>[]
}

export type WallDimensionInfo = {
  id: string
  screenPoint1: PointXY
  screenPoint2: PointXY
  screenMiddlePoint: PointXY
  relativePoint1: PointXY
  relativePoint2: PointXY
  relativeMiddlePoint: PointXY
  point1BehindCamera: boolean,
  point2BehindCamera: boolean,
  pointMiddleBehindCamera: boolean,
  length: number
  hasVisualLine: boolean
}

export type RoomDimensionsInfo = {
  dimensions: WallDimensionInfo[]
  isValid: boolean
  isEnabled: boolean
  shouldBeVisible: boolean
  opacity: number
}

export type DimensionTypeStr = 'size-x' | 'size-y' | 'size-z'
export type ProductDimensionInfo = {
  relativePoint1: PointXY
  relativePoint2: PointXY
  relativeMiddlePoint: PointXY
  screenSpaceNormal: PointXY
  length: number
  typeStr: DimensionTypeStr
}

export type ProductDimensionsInfo = {
  dimensions: ProductDimensionInfo[]
}

export type MeasurementTypeStr = '+x' | '-x' | '+z' | '-z' | '+y' | '-y'
export type DynamicMeasurementInfo = {
  type: MeasurementTypeStr
  relativePoint1: PointXY
  relativePoint2: PointXY
  relativeMiddlePoint: PointXY
  length: number
}
export type DynamicMeasurementsInfo = {
  trackedItemId: string | null
  measurements: DynamicMeasurementInfo[]
  isEnabled: boolean
}

export type PlacementFromStrokesResult = {
  surfaceId: string
  surfaceClass: 'wall' | 'floor'
  planeId?: number
  dimensions: { width: number, height: number, depth: number }  // In meters.
  corners: [Point2D, Point2D, Point2D, Point2D]              // Base face, canvas-normalized [0,1].
  extrusionCorners: [Point2D, Point2D, Point2D, Point2D]     // Side face showing extrusion, canvas-normalized [0,1].
  // All 8 box corners, canvas-normalized [0,1].
  // Back: BL(0), BR(1), TR(2), TL(3). Front: BL(4), BR(5), TR(6), TL(7).
  boxCorners?: [
    Point2D, Point2D, Point2D, Point2D,
    Point2D, Point2D, Point2D, Point2D,
  ]
  placement?: Placement
  uvBounds?: { uMin: number; uMax: number; vMin: number; vMax: number }
  extrusionDepth?: number
}

export type PlacementConstraintWarning = {
  dimension: 'width' | 'height' | 'depth'
  reason: 'min-size' | 'wall-boundary' | 'floor-boundary' | 'ceiling-boundary'
  constrainedValue: number  // meters, what it was clamped to
}

export type AdjustedPlacementInfo = PlacementFromStrokesResult & {
  warnings: PlacementConstraintWarning[]
}
