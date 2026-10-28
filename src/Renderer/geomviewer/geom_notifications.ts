/**
 * GeomViewer notifications.
 */
import { DownloadType } from 'Renderer/NotificationDispatcher';
import type { SuccessfulPlacementStoppageMode, PlacementBeginMode } from 'Renderer/inputhandler/types'
import type { GeomCamera } from 'Renderer/multiview/geom_camera';
import { PolygonData } from 'Renderer/assets/Types';
import { GPUStats } from 'Renderer/gpuDetect/GPUDetector';
import * as constants from './geom_constants'
import {
  Corners,
  GlContextInfo,
  LowPerformanceEventInfo,
  Placement,
  Point2D,
  PointXYZ,
  SceneItemParameters
} from './geom_types';

/**
 * Notifications dispatched through NotificationDispatcher.
 */
export type NotificationInfo = {
  what: number, // One of the notification bits, e.g. NOTIFY_DOWNLOAD_ERROR.
  payload?: object | number | string,
}

/**
 * A NotificationObserver is simply a function called with notification info.
 */
export type NotificationObserver = (info: NotificationInfo) => void;

/**
 * A NotificationDispatcher is an interface to which observer can attach themselves
 * to receive notifications. Observers can filter what notifications they are
 * interested in by or'ing notification bits together.
 */
export interface NotificationDispatcher {
  addObserver: (filterBits: number, observer: NotificationObserver) => void;
  removeObserver: (observer: NotificationObserver) => void;
}

/**
 * GrandCentral notification dispatched for download errors.
 */
export type ViewerDownloadErrorNotification = {
  what: typeof constants.NOTIFY_DOWNLOAD_ERROR,
  payload: {
    downloadType: DownloadType,
    url: string,
    numAttempts: number,
    assetKeyOrId: string,
  }
}

/**
 * GrandCentral notification dispatched for viewer-update notifications.
 */
export type ViewerStateUpdateNotification = {
  what: typeof constants.NOTIFY_VIEWER_STATE_UPDATE,
  payload: {
    stateInfo: 'FirstRender'
  } | {
    stateInfo: 'ViewerReady'
    viewerReadyContextInfo: GlContextInfo,
  } | {
    stateInfo: 'WallDataReady',
    wallDataInfo: { width: number, height: number },
  } | {
    // Dispatched on-demand for mesh scenes, when the wall polygons data is extracted.
    stateInfo: 'WallPolygonsReady',
    wallPolygonsInfo: PolygonData
  } | {
    // Dispatched on-demand, after a call to doAction('request-on-draw-idle')
    stateInfo: 'DrawIdle'
  } | {
    // Dispatched when stackable placement mode is started.
    stateInfo: 'PlacementModeStarted'
  } | {
    // Dispatched to hide or show all furniture-item pins at once.
    stateInfo: 'HideOrShowAllPins',
    pinInfo: { hide: boolean },
  } | {
    // Dispatched when a camera view change is requested.
    stateInfo: 'ViewChangeStart',
  } | {
    // Dispatched by the camera manager when the camera exits the static view.
    stateInfo: 'CameraExitStaticView',
  } | {
    // Dispatched by the camera manager when the camera enters a static view.
    stateInfo: 'CameraEnterStaticView',
  } | {
    // Dispatched when the camera view change is done.
    stateInfo: 'ViewChangeEnd',
    camera?: GeomCamera,
    source: 'OrbitMode',
  } |{
    // Dispatched when the camera view change is done.
    stateInfo: 'ViewChangeEnd',
    camera?: GeomCamera,
    source: 'ViewManager',
    isRenderingThumbnail: boolean
  } | {
    // Dispatched on-demand, when the camera focus mode is requested/closed.
    stateInfo: 'ToggleFocus',
    itemId: string | undefined,
  } | {
    // Dispatched by the camera manager when the camera focus mode is applied.
    stateInfo: 'FocusTransitionFinished',
  } | {
    // Dispatched when a stackable item drag begins. Not Dispatched for items other than stackables.
    stateInfo: 'BeginStackableDraggingMode'
  } | {
    // Dispatched when a stackable item drag ends. Not Dispatched for items other than stackables.
    stateInfo: 'EndStackableDraggingMode'
  } | {
    // Dispatched when the validity of the destination position to true changes while dragging a stackable.
    stateInfo: 'ValidOrInvalidDestinationCursor'
    isDragDestinationValid: boolean 
  } | {
    // Camera in orbit mode started to move.
    stateInfo: 'OrbitModeBegin',
  } | {
    // Camera in orbit mode started to move.
    stateInfo: 'OrbitModeEnd',
  } | {
    // Camera in orbit mode started to move.
    stateInfo: 'OrbitMoveStart',
    movement: 'rotate' | 'pan',
  } | {
    // Camera in orbit mode stopped moving.
    stateInfo: 'OrbitMoveEnd',
  }
}

/**
 * GrandCentral notification dispatched for viewer-error notifications.
 */
export type ViewerErrorNotification = {
  what: typeof constants.NOTIFY_VIEWER_ERROR,
  payload: {
    error: 'InitializationFailure',
    initializationFailureInfo: {
      [key: string]: undefined | boolean | string | object,
    }
  } | {
      error: 'Other',
    }
}

export type CameraTransformUpdateNotification = {
  what: typeof constants.NOTIFY_CAMERA_TRANSFORM_UPDATE,
  payload: {
    [key: string]: undefined | boolean | string | object,
  }
}

/**
 * GrandCentral notification dispatched for low performance notifications.
 */
export type LowPerformanceNotification = {
  what: typeof constants.NOTIFY_LOW_PERFORMANCE,
  payload: LowPerformanceEventInfo
}

/**
 * GrandCentral notification dispatched for legacy-callback notifications.
 * These notifications will eventually be eliminated, once all corresponding
 * behaviors are implemented within the viewer.
 */
export type ViewerLegacyCallbackNotification = {
  what: typeof constants.NOTIFY_VIEWER_LEGACY_CALLBACK,
  payload: {
    legacyCallback: 'updateHiddenSurfaces',
    updateHiddenSurfacesInfo: {
      surfaces: number[],
    }
  }
}

/**
 * GrandCentral dispatches notifications of type SceneItemUpdateNotification to
 * inform observers of state changes in scene items. These notifications come with
 * a payload that is specific to each state change, as defined below.
 */

// The item responded to a UI event.
export type UiEventPayload = {
  stateInfo: 'HoverStart' | 'HoverEnd' | 'DragStart' | 'Selected' | 'Deselected' |
  // Fired when the viewer enters stackable placement with an item by any means.
  'BeginPlacementModeWithItem' |
  // 'PlacementModeCanvasClicked' event is fired when a click on the viewer
  // does not hit any stackable surfaces in stackable placement mode, which is
  // useful for reminding user to select a valid surface.
  'PlacementModeCanvasClicked' |
  // 'ToggleFocus' event is fired when the 'c' key is pressed while and item
  // is selected. Which should toggle on/off the camera focus mode.
  // Fired when a stackable item drag begins. Not Dispatched for items other than stackables.
  'BeginStackableDraggingMode' |
  // Fired when a stackable item drag ends. Not Dispatched for items other than stackables.
  'EndStackableDraggingMode' |
  // Fired when the destination position validity changes either in placement mode or stackable dragging mode.
  // Used to display the corresponding cursor icon that tells the user if the destination is valid.
  'ValidOrInvalidDestinationCursor' |
  'ToggleFocus'
} | {
  // PlacementModeSurfaceClicked is fired when a pointer click is received on the
  // viewer in the stackable placement mode and it hits a stackable surface or the floor.
  // This indicates user intent to place the stackable in the payload to be
  // added to the scene on the surface.
  stateInfo: 'PlacementModeSurfaceClicked',
  itemData: {
    pendingStackableItem: SceneItemParameters,
    pendingStackableUniqueId: string
  },
} | {
  // Fired when the viewer exits stackable placement mode with an item by any means.
  stateInfo: 'EndPlacementModeWithItem',
  itemData: {
    // Whether a new stackable is discarded at the end of placement mode. This happens
    // only when the user cancels adding a new stackable to the scene. When true, the
    // itemId is that if the discarded item (see SceneItemUpdateNotification).
    discardItem: boolean,
  }
  // Telemetry data to dispatch telemetry tied to viewer events. In this case placement mode begin/end.
  // We only track the successful placement cases, which means when item is succesfully placed. 
  // Value is undefined otherwise e.g user cancels placement.
  stackablePlacementTelemetry?: {
    // Placement mode cancellation request may come from a UI element click or a scene surface click.
    // This produces the positioning of the item in the scene. This means the cancellation reason also
    // tells how the item was positioned.
    placementStoppageReason: SuccessfulPlacementStoppageMode
    // Placement mode begin may be in these two modes.  
    placementBeginMode: PlacementBeginMode
    // Wether the stackable changed surface during this placement mode.
    hasStackableChangedSurface: boolean
  }
} | { 
  stateInfo: 'DragEnd'
  // Telemetry data to dispatch telemetry tied to viewer events.
  // Value is undefined if dragging is not successfull. e.g user cancels dragging or dragging destination not valid.
  stackablePlacementTelemetry?: {
    // Wether the stackable changed surface while dragging.
    hasStackableChangedSurface: boolean
  }
}

// The item has been successfully loaded. It is now ok to query the item's metrics.
export type ItemReadyPayload = {
  stateInfo: 'ItemReady';
}

// The item's geometry, orientation or position has changed.
export type GeometryPayload = {
  stateInfo: 'Geometry';
  itemData: {
    // Corners of 2D item's axis-aligned bounding box, in relative screen coordinates. Dispatched
    // as [[xMin, yMin], [xMax, yMin], [xMax, yMax], [xMin, yMax]].
    corners?: [Point2D, Point2D, Point2D, Point2D];
    // Legacy 2D (x, y) position of the item in relative screen space.
    x?: number;
    y?: number;
    // Item placement in the 3D scene has changed.
    placement?: Placement;
    // Heading is the the horizontal spin away from the default forward direction.
    heading?: number;
    // 3D position of item. Only defined for stackable items in special cases,
    // undefined when item uses 2D positon.
    p3: PointXYZ | undefined;
    // The downloading status of the 3d data, since this causes updates to the
    // item's geometry.
    // TODO: Remove when the FurnitureItem stops pushing multiple Geometry
    // change notifications while the download is still in progress.
    isLoading?: boolean;
    // The item's parent uniqueId if the parent is an item.
    // Or 'SURFACE' if it's a room surface.
    parentIdOrSurface?: string;
    // The parent surface's GLTF id if it's a room surface.
    // Or the stacking surface index if the parent is an item.
    parentAttachment?: number;
    // A list of polygon ids of additional surfaces item is in contact with.
    additionalContacts?: number[]
    // For telemetry purposes. Used to avoid the dispatch of rotate events to the
    // telemetry when heading has changed due to wall change.    
    isBoundToWall?: boolean;
  }
}

// A furniture-item placement has changed. Includes snap-rotation and re-parenting updates.
export type ItemPlacementPayload = {
  stateInfo: 'ItemPlacement';
  itemData: {
    // (x, y) position of the item in relative screen space.
    x?: number;
    y?: number;
    // 3D position of item. Only defined for stackable items in special cases,
    // undefined when item uses 2D positon.
    p3: PointXYZ | undefined;
    // The item's root parent ID (undefined for floor). Always available with p3 (above).
    // Also dispatched on its own when an item is re-parented internally.
    parentId?: string;
    // The item's parent uniqueId if the parent is an item.
    // Or 'SURFACE' if it's a room surface.
    parentIdOrSurface?: string;
    // The parent surface's GLTF id if it's a room surface.
    // Or the stacking surface index if the parent is an item.
    parentAttachment?: number;
    // A list of polygon ids of additional surfaces item is in contact with.
    additionalContacts?: number[]
    // Dispatched for snap-rotable items, index of current snap rotation.
    snapRotationIndex?: number;
    // Item's heading.
    heading?: number;
    // Placement behavior in the scene changed.
    placingBehavior?: constants.PlacingBehavior;
    // Dispatched for stackable items only, undefined when on the floor.
    stackedOnSurfaceId: string | undefined;
    // Item placement in the 3D scene has changed, translated for GLTF composition format.
    placement?: Placement;
    // Item placement in the 3D scene, as it is used in the viewer.
    rawPlacement3d?: Placement;
    // Wether a stackable is relocated on a swap or snap rotate operation.
    // For any other way of placement its false. If the item can not stack its undefined.
    isAutoPlacement?: boolean;
  }
  // List of surfaces the item is colliding with (e.g., ['wall'])
  collisionState?: string[]
}

export type ItemPlacementData = Omit<ItemPlacementPayload['itemData'], `p3` | `placement`> & {
  // This placement is not of Placement type but save/output format.
  placement?: {
    kind: string,
    location3: {
      localPos: PointXYZ
    },
    rotation: { x: number, y: number, z: number, w: number }
  }
  // optional corners for art items
  corners?: Corners
};

// A ghost item (gray boxes dragged over stacking surfaces) has changed position.
export type GhostGeometryPayload = {
  stateInfo: 'GhostGeometry';
  itemData: {
    // Corners of 2D item's axis-aligned bounding box, in relative screen coordinates. Dispatched
    // as [minX, maxX, minY, maxY].
    corners?: [number, number, number, number];
  }
}

// Updated info about whether and where to show the item's pin.
export type PinInfoPayload = {
  stateInfo: 'PinInfo';
  itemData: {
    hidePin?: boolean;
    itemIsHidden?: boolean;
    x?: number;
    y?: number;
  }
}

export type SceneItemUpdateNotification = {
  what: typeof constants.NOTIFY_SCENE_ITEM_UPDATE,
  payload: {
    // Id of the item whose state is changed.
    itemId: string;
  } & (
    UiEventPayload
    | ItemReadyPayload
    | GeometryPayload
    | ItemPlacementPayload
    | GhostGeometryPayload
    | PinInfoPayload
  );
}

export type GPUStatsNotification = {
  what: typeof constants.NOTIFY_GPU_STATS,
  payload: {
    stateInfo: 'GPUStatsSuccess',
    stats: GPUStats
  } | {
    stateInfo: 'GPUStatsFailed',
    error: string
  }
}
