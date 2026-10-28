/* eslint-disable no-bitwise */
import Renderer from "Renderer";
import {
  GvResult,
  ModifyItemParameters,
  Point2D,
  PointXYZ,
  SceneItemInfo,
  SceneItemParameters,
  StackableSurfaceParameters,
  ColorRepresentation,
  FurnitureItemParameters,
  Matrix4x4,
  PointXY,
  Placement,
} from "Renderer/geomviewer/geom_types";
import {
  NOTIFY_SCENE_ITEM_UPDATE,
  PlacingBehavior,
  PlacingOptions
} from "Renderer/geomviewer/geom_constants";
import { getGrandCentral, GrandCentral } from "Renderer/GrandCentral";
import { SceneItemUpdateNotification } from "Renderer/geomviewer/geom_notifications";
import type { StackSurfParentItemProxy } from "Renderer/model/StackableSurfaceItem3D";
import { NotificationInfo } from "Renderer/NotificationDispatcher";
import { toPoint3 } from "Renderer/geometry/Point3";
import {
  GHOST_ITEM_ID,
  EXTRA_HINT_STACKABLE,
  NOTIFY_COMPOSITION_LOADING_BEGIN,
  NOTIFY_COMPOSITION_LOADING_END
} from 'Renderer/constants'
import ArtItem3D from "Renderer/model/ArtItem3D";
import FurnitureItem3D from "Renderer/model/FurnitureItem3D";
import {
  extractPosition, 
  extractQuaternionFromMat3, 
  extractQuaternionFromMat4,
} from 'Renderer/geometry/utilities'
import { RenderItemCreationQueue} from 'Renderer/model/RenderItemCreationQueue'
import { isFurnitureItem3D, getStackingSurface,
  getStackableSurfacesForRenderItem, 
  isArtItem3D} from "Renderer/rendering/scene_utils";
import type StackableSurfaceItem3D from "Renderer/model/StackableSurfaceItem3D";
import { StackablesRelocate } from "Renderer/model/StackablesRelocate";
import {
  getFloorPlane,
  getFloorWithHeadingRotMat,
  getPolygonById,
} from "Renderer/positioning/positioning_utilities";
import { getClosestAxisAlignedHeading } from "Renderer/utils/modelUtils";
import type { RenderItem3D } from "Renderer/model/RenderItem3D";
import GhostItem3D, { type GhostItemParameters } from "Renderer/model/GhostItem3D";
import { GeomBaseScene, type InitialPositionType } from 'Renderer/rendering/GeomBaseScene'
import { gvCameraManager, gvCurrentScene } from "./geom_app";

// Bunch together a furniture item and its ID.
type RenderItemPair = {
  id: string;
  item: RenderItem3D;
}

// Item orientation, based on snap rotation and bbox.
type ItemOrientation = `horizontal` | `vertical` | `default`;

// All the info related to a swap-furniture-item operation.
type PendingSwapInfo = {
  isSwapOpInFlight: boolean;
  deleteItemDone: boolean;
  addItemDone: boolean;
  itemWasFocused: boolean;
  itemSwappedOut: RenderItemPair | undefined;
  itemSwappedIn: RenderItemPair | undefined;
  swapOutPos2D: Point2D | undefined;
  swapOutPlacement: Placement | undefined;
  swapOutSnapRotationIndex: number;
  swapOutPlacingBehavior: PlacingBehavior;
  swapOutOrientation: ItemOrientation;
  swapOutItemIsSnapRotable: boolean;
}

// An item 3D bounding box.
type ItemBBox = { max: PointXYZ, min: PointXYZ }

// Convenience type for FurnitureItem parameters.
type AddArtItemParams = Extract<SceneItemParameters, { itemKind: 'art-item' }>;
type AddFurnitureItemParams = Extract<SceneItemParameters, { itemKind: 'furniture-item' }>;

// Return the orientation of the given bbox as transformed by the anchor matrix.
function getTransformedBBoxOrientation(
  anchorMatrix: number[][] | undefined,
  bbox: ItemBBox): ItemOrientation {

  if (anchorMatrix) {
    let orientation: ItemOrientation =
      (bbox.max.y - bbox.min.y > bbox.max.x - bbox.min.x) ? `vertical` : `horizontal`;
    const isNineOclock = anchorMatrix[1][0] === -1 && anchorMatrix[0][1] === 1
    if (isNineOclock) {
      orientation = (orientation === `vertical`) ? `horizontal` : `vertical`;
    }

    return orientation;
  }

  return `default`;
}

// Return the orientation of a furniture item given its snap-rotation index and
// furniture data.
export function getFurnitureItemOrientation(
  snapRotIndex: number,
  itemData: FurnitureItemParameters): ItemOrientation {

  const anchors = itemData.placeables?.anchors;
  const bboxData = { max: itemData.max, min: itemData.min };
  if (anchors && snapRotIndex < anchors.length) {
    return getTransformedBBoxOrientation(anchors[snapRotIndex].matrixModel, bboxData);
  }

  return `default`;
}

// Duplicate item's orientation:
// 1.- Is preserved when the original item is on the floor.
// 2.- Is defaulted to 0 when a wall-or-floor original item on the wall, because duplicate goes to the floor.
function setPlacementRotationFromHeading(placement: Placement, params: AddFurnitureItemParams, 
  dupKeepsOriginalRot = false) {
  const { isAddedFromDuplicate, heading } = params.itemOptions 

  // Account for any rotations in the floor plane. Usually 0 for pano scenes but
  // can be arbitrary for 3D mesh scenes. 
  const defaultHeading = gvCurrentScene()?.floorRotation() || 0

  let headingToApply = isAddedFromDuplicate && dupKeepsOriginalRot ? heading : defaultHeading
  const needsClosestAxisAligned = !isAddedFromDuplicate || !dupKeepsOriginalRot;
  if (needsClosestAxisAligned) {
    headingToApply = getClosestAxisAlignedHeading(headingToApply) || 0;
  }
  params.itemOptions.heading = headingToApply
  const floorPlane = getFloorPlane()
  if (floorPlane) {
    const floorPlaneRotMat = floorPlane.rot
    const rotWithHeadingMat = getFloorWithHeadingRotMat(headingToApply, floorPlaneRotMat)
    placement.rotation = extractQuaternionFromMat3(rotWithHeadingMat)
  }
}

function getRoomDefaultPlacement(params: AddFurnitureItemParams, originalPlacementBindTo?: string ) {
  const scene = gvCurrentScene()
  if (!scene) {
    return null
  }

  const isWallPlaceableOnly = !!(params.itemOptions.placingOptions & PlacingOptions.WALL_ONLY)
  const isWallFloorEdgePlaceable = !!(params.itemOptions.placingOptions & PlacingOptions.WALL_AND_FLOOR)
  let positionType: InitialPositionType = `floor`
  if (isWallPlaceableOnly) {
    positionType = `wall`
  } else if (isWallFloorEdgePlaceable) {
    positionType = `wall-floor-edge`
  }
  const placeablePos = scene.findPlaceablePos(positionType)
  if (placeablePos) {
    const placement: Placement = {
      kind: `location3`,
      location3: placeablePos.pos3D,
    }
    // Wall-only and wall-floor-edge items don't need further orientation processing.
    // The wall the're <bindTo> arranges the orientation.  
    if (!(isWallPlaceableOnly || isWallFloorEdgePlaceable)) { 
      if (originalPlacementBindTo) {
        const isOriginalComingFromFloor = getPolygonById(Number(originalPlacementBindTo))?.class === 'floor'
        const isDestinationFloor = getPolygonById(Number(placeablePos.pos3D.bindTo))?.class === 'floor'
        // Only case where orientation is preserved is when an item is duplicated on the floor.
        const duplicateKeepsOriginalRot = isOriginalComingFromFloor && isDestinationFloor
        setPlacementRotationFromHeading(placement, params, duplicateKeepsOriginalRot)
      } else {
        setPlacementRotationFromHeading(placement, params)
      }
    }

    return placement
  }

  return undefined
}

// GeomViewerModel will one day hold the non-graphical scene-content model, such as the
// list of RenderItems, stackables surfaces, etc. However, for now it defers most
// of that content and related operations to the legacy Renderer code. Instead it
// provides a thin shim with new GeomViewer API functionality and state.
export class GeomViewerModel {
  private renderer: Renderer;

  // Swap operation state. Swap operations are initiated by a call to function aboutToSwapItem.
  // It is followed by calls to addSceneItem and deleteSceneItem, which can happen in any order.
  private pendingSwapOp: PendingSwapInfo;

  // Keep track of static stackable surfaces added to the scene.
  private staticStackableSurfaces: string[] = [];

  // Keep track of item being dragged. This is so that we can suppress some notifications
  // while dragging.
  private draggingItemId?: string;

  // Wall color, either loaded from persisted user data, or set by user in the current session.
  private wallColor?: ColorRepresentation;

  private itemCreationQueue = new RenderItemCreationQueue()

  private stackablesRelocate: StackablesRelocate

  private isRoomDimensionsEnabled = false
  private isProductDimensionsEnabled = false
  private isDynamicMeasurementsEnabled = false
  private ghostItem?: GhostItem3D

  private isCompLoading = false

  constructor(renderer: Renderer) {
    this.renderer = renderer
    this.stackablesRelocate = new StackablesRelocate()

    this.pendingSwapOp = {
      isSwapOpInFlight: false,
      deleteItemDone: false,
      addItemDone: false,
      itemWasFocused: false,
      itemSwappedOut: undefined,
      itemSwappedIn: undefined,
      swapOutPos2D: undefined,
      swapOutPlacement: undefined,
      swapOutSnapRotationIndex: 0,
      swapOutOrientation: `default`,
      swapOutPlacingBehavior: PlacingBehavior.NONE,
      swapOutItemIsSnapRotable: false,
    }

    this.onItemUpdate = this.onItemUpdate.bind(this);
    this.onCompositionLoadingBegin = this.onCompositionLoadingBegin.bind(this)
    this.onCompositionLoadingEnd = this.onCompositionLoadingEnd.bind(this)

    getGrandCentral().addObserver(NOTIFY_SCENE_ITEM_UPDATE, this.onItemUpdate);
    getGrandCentral().addObserver(NOTIFY_COMPOSITION_LOADING_BEGIN, this.onCompositionLoadingBegin)
    getGrandCentral().addObserver(NOTIFY_COMPOSITION_LOADING_END, this.onCompositionLoadingEnd)
  }

  // Returns true when all furniture items have been loaded and added to the scene
  isCompositionLoading() {
    return this.isCompLoading
  }

  private onCompositionLoadingBegin() {
    this.isCompLoading = true
  }

  private onCompositionLoadingEnd() {
    this.isCompLoading = false
  }

  setRendererIsDirty() {
    this.renderer.setRenderIsDirty()
  }

  cleanup() {
    this.itemCreationQueue.discard()
    getGrandCentral().removeObserver(this.onItemUpdate);
    getGrandCentral().removeObserver(this.onCompositionLoadingBegin)
    getGrandCentral().removeObserver(this.onCompositionLoadingEnd)

    this.clearPendingSwapOp();
    this.deleteAllStaticStackableSurfaces();
  }

  // Initiate a furniture swap operation. I.e. the item with the given ID is about
  // to be replaced with another item in a delete-and-add sequence. Delete and add
  // may happen in any order.
  aboutToSwapItem(itemId: string) {
    this.clearPendingSwapOp();

    const renderItem = gvCurrentScene()?.getRenderItem(itemId) as RenderItem3D
    if (!renderItem) {
      return
    }

    if (isFurnitureItem3D(renderItem)) {
      this.setupPendingSwap(renderItem)
      this.stackablesRelocate.aboutToReparentStackables(itemId)
    } else if (isArtItem3D(renderItem)) {
      this.setupPendingSwapArtItem(renderItem)
    }

    this.pendingSwapOp.isSwapOpInFlight = true
  }

  setupPendingSwapArtItem(artItem: ArtItem3D) {
    this.pendingSwapOp.itemSwappedOut = {
      id: artItem.getId(),
      item: artItem,
    }
    this.pendingSwapOp.swapOutPlacement = artItem.getPlacement()
    this.pendingSwapOp.itemWasFocused = gvCameraManager()?.isFocused(artItem) || false
  }

  setupPendingSwap(furnitureItem: FurnitureItem3D) {
    this.pendingSwapOp.itemSwappedOut = {
      id: furnitureItem.getId(),
      item: furnitureItem,
    }

    const snapRotIndex = furnitureItem.getSnapRotIndex()
    this.pendingSwapOp.swapOutPlacement = furnitureItem.getPlacement()
    this.pendingSwapOp.swapOutPlacingBehavior = furnitureItem.getPlacingBehavior()
    this.pendingSwapOp.itemWasFocused = gvCameraManager()?.isFocused(furnitureItem ) || false
    this.pendingSwapOp.swapOutSnapRotationIndex = snapRotIndex
    this.pendingSwapOp.swapOutOrientation =
      getFurnitureItemOrientation(snapRotIndex, furnitureItem.getFurnitureData())
    this.pendingSwapOp.swapOutItemIsSnapRotable = furnitureItem.getIsSnapRotatable()
  }

  private deleteChildren(item: RenderItem3D) {
    const children = [...item.getChildren()]
    const scene = this.renderer.scene;
    if (!scene) return;

    for (let i = 0; i < children.length; i += 1)
    {
      const childItem = children[i];
      // When swapping, don't delete stacked items, but only stacking surfaces. 
      // Stacked items will be restacked on new surfaces of the new item
      if (childItem.isStackableSurfaceItem() && this.pendingSwapOp.isSwapOpInFlight) {
        childItem.endIsNigh()
        scene.removeStackableSurfaceItem(childItem as StackableSurfaceItem3D)
      } else if (!this.pendingSwapOp.isSwapOpInFlight) {
        scene.removeStackableSurfaceItem(childItem as StackableSurfaceItem3D)
        this.deleteChildren(childItem)
        childItem.endIsNigh()
      }
    }
  }

  // Delete an item from the scene.
  deleteSceneItem(itemOrId: string | RenderItem3D) {
    const renderItem = typeof itemOrId === "string"
      ? this.renderer.getRenderItem(itemOrId)
      : itemOrId
    
    if (!renderItem) {
      return
    }

    if (!this.pendingSwapOp.isSwapOpInFlight) {
      // When swapping, the swapped-in item will remain focused upon
      // So only reset the camera mode if not in a swap operation
      if (gvCameraManager()?.clearFocusedItem(renderItem)) {
        gvCameraManager()?.setCameraMode({mode: `default`})
      }
    }

    this.deleteChildren(renderItem)

    // Check if a swap-op is in-flight.
    if (this.pendingSwapOp.isSwapOpInFlight && renderItem.getId() === this.pendingSwapOp.itemSwappedOut?.id) {
      this.pendingSwapOp.deleteItemDone = true;
    }

    // If add-item has been done, we're done with swapping.
    if (this.pendingSwapOp.addItemDone) {
      this.clearPendingSwapOp();
    }

    renderItem.endIsNigh();
  }

  addFurnitureItem(uniqueId: string, params: AddFurnitureItemParams): GvResult {
    return this.addFurnitureItem3D(uniqueId, params)
  }

  resolveRoomElement(uniqueId: string)
  {
    return this.itemCreationQueue.resolveRoomElement(uniqueId);
  }

  private addFurnitureItem3D(uniqueId: string, params: AddFurnitureItemParams): GvResult {
    let position: Point2D | undefined = params.legacyPosition
    let placement: Placement | undefined = params.placement

    // Note combinable children don't incorporate into swap operations on their own.
    if (this.pendingSwapOp.isSwapOpInFlight && !params.itemOptions.combinablePlacement) {
      // It's a swap. Try to match snap rotation and position of swapped out item.
      params.itemOptions.anchorCombinationIndex = this.calcSnapRotIndexForSwapInItem(params)
      position = this.pendingSwapOp.swapOutPos2D
      const newPlacementInfo = this.calcPlacementForSwapInItem(params)
      if (newPlacementInfo.placement) {
        placement = newPlacementInfo.placement
      }
      // E2e tests don't follow the regular swapping procedure as react client does, and don't
      // fill placingBehaviorHint.
      if (params.itemOptions.placingBehaviorHint === undefined) {
        params.itemOptions.placingBehaviorHint = newPlacementInfo.placingBehavior
      }
      this.pendingSwapOp.addItemDone = true
    }

    // Both onUpdate and updateReactPin FurnitureItem callbacks are redirected to the same
    // function, which dispatches notifications based on the content of <info>.
    const updateCallback = (info: { [key: string]: unknown }) => {
      this.onUpdateFurnitureItemCallback(uniqueId, info);
    }

    // At least one legacy 2D position or 3D position must be provided. Get a 2D position from
    // the renderer if neither is provided.
    if (params.restoredPosition === null) {
      params.restoredPosition = undefined; // API consistently uses undefined.
    }

    const furnitureData = params.itemOptions

    if (!placement ||
      // Ignore placement and load plugged in combinables using socket transform.
      params.itemOptions.combinablePlacement?.socketName) {
      if (params.itemOptions.combinablePlacement) {
        // Combinable.
        const elements = params.itemOptions.combinablePlacement.localTransform
        const transform: Matrix4x4 = [
          [elements[0], elements[4], elements[8], elements[12]],
          [elements[1], elements[5], elements[9], elements[13]],
          [elements[2], elements[6], elements[10], elements[14]],
          [elements[3], elements[7], elements[11], elements[15]],
        ]
        placement = {
          kind: `location3`,
          location3: {
            localPos: { ...extractPosition(transform) },
            bindTo: '',
          },
          rotation: extractQuaternionFromMat4(transform),
        }
      } else if (params.restoredPosition) {
        // Stackable.
          placement = {
            kind: `location3Legacy`,
            location3: {
              localPos: {
                x: params.restoredPosition[0],
                y: params.restoredPosition[1],
                z: params.restoredPosition[2],
              },
              bindTo: '',
            },
            rotation: [0, 0, 0, 1],
          }
      } else if (position) {
        placement = {
          kind: `location2Legacy`,
          location2: position,
          location3: {
            localPos: { x: 0, y: 0, z: 0 },
            bindTo: '',
          },
          heading: params.itemOptions.heading,
        }
      } else {
        // Default placement from catalog.
        const defaultPlacement =  getRoomDefaultPlacement(params)
        if (defaultPlacement) {
          placement = defaultPlacement
        }
      }
    } else if (params.itemOptions.isAddedFromDuplicate && !params.itemOptions.hasSmartaPlacement) {
      const defaultPlacement = getRoomDefaultPlacement(params, placement.location3.bindTo)
      if (defaultPlacement) {
        placement = defaultPlacement
      }
    }

    // Viewer convention: <stackOnSurfaceId> is defined if item is stacked, its not if its on the floor.
    if (placement && params.itemOptions.canStack && params.itemOptions.stackOnSurfaceId) {
      placement.location3.bindTo = params.itemOptions.stackOnSurfaceId
      placement.location3.hintExtraBindTo = EXTRA_HINT_STACKABLE
    }

    furnitureData.swappedInItem = this.pendingSwapOp.isSwapOpInFlight;
    
    if (!placement) {
      return { ok: false, errorMsg: `no suitable position` }
    }
    this.itemCreationQueue.createFurnitureItem(uniqueId, this.renderer, placement, furnitureData, updateCallback)
      .then((newItem) => {
        if (newItem) {
          return this.addItemStackablesToScene(newItem, params.itemOptions).then(() => newItem)
        }
        return newItem
      })
      .then((newItem) => {
        if (!newItem) {
          return
        }
        if (this.pendingSwapOp.isSwapOpInFlight) {
          this.stackablesRelocate.reparentStackablesCycleFinish(newItem, true)
           if (this.pendingSwapOp.itemWasFocused) {
            gvCameraManager()?.setCameraMode({mode: `focused`, itemId: uniqueId})
          }
        }
        // If delete-item has been done, we're done with swapping.
        if (this.pendingSwapOp.deleteItemDone) {
          this.clearPendingSwapOp();
        }
        // If there's a swap-op in flight, retain the swapped-in info.
        if (this.pendingSwapOp.isSwapOpInFlight) {
          this.pendingSwapOp.itemSwappedIn = {
            id: uniqueId,
            item: newItem,
          }
        }
      })
    return { ok: true }
  }

  private addArtItem3D(uniqueId: string, params: AddArtItemParams) : GvResult {
    const position: Point2D | undefined = params.legacyPosition
    let placement: Placement | undefined = params.placement

    if (this.pendingSwapOp.isSwapOpInFlight) {
      // It's a swap. Try to match snap position of swapped out item.
      placement = this.pendingSwapOp.swapOutPlacement
      this.pendingSwapOp.addItemDone = true
    }

    if (params.restoredPosition === null) {
      params.restoredPosition = undefined; // API consistently uses undefined.
    }

    const artItemOptions = params.itemOptions

    if(!placement) {
      if(params.restoredPosition) {
        placement = {
          kind: `location3Legacy`,
          location3: {
            localPos: {
              x: params.restoredPosition[0],
              y: params.restoredPosition[1],
              z: params.restoredPosition[2],
            },
            bindTo: '',
          },
          rotation: [0, 0, 0, 1],
        }
      } else if (position) {
        placement = {
          kind: `location2Legacy`,
          location2: position,
          location3: {
            localPos: { x: 0, y: 0, z: 0 },
            bindTo: '',
          },
          heading: 0
        }
      } else {
        const placeabelPos = gvCurrentScene()?.findPlaceablePos(`wall`)
        if(placeabelPos) {
          placement = {
            kind: `location3`,
            location3: placeabelPos.pos3D,
          }
        }
      }
    }
   
    if(!placement) {
      return { ok: false, errorMsg: `no suitable position` }
    }
    this.itemCreationQueue.createArtItem(uniqueId, this.renderer, placement, artItemOptions)
     .then(() => {
         if (this.pendingSwapOp.isSwapOpInFlight) {
            if (this.pendingSwapOp.itemWasFocused) {
             gvCameraManager()?.setCameraMode({mode: `focused`, itemId: uniqueId})
           }
         }
        // If delete-item has been done, we're done with swapping.
        if (this.pendingSwapOp.deleteItemDone) {
          this.clearPendingSwapOp()
        }
       })

    return { ok: true }
  }

  addArtItem(uniqueId: string, parameters: AddArtItemParams): GvResult {
    return this.addArtItem3D(uniqueId, parameters)
  }

  addStackableSurfaceItem(
    uniqueId: string,
    parentItemId: string | undefined,
    parameters: StackableSurfaceParameters) {

    const parentItemProxy: StackSurfParentItemProxy | undefined =
      parentItemId ? { uniqueId: parentItemId } : undefined;

    return this.itemCreationQueue.createStackableSurface(uniqueId, this.renderer, parameters, parentItemProxy)
      .then((stackSurfItem) => {
        if (!stackSurfItem) {
          return null
        }
        stackSurfItem.setVisible(false, false);
        // Keep track of static stackable surfaces so we can delete them later.
        if (!parentItemId) {
          this.staticStackableSurfaces.push(uniqueId);
        }
        return stackSurfItem
      })
  }

  // Modify an item already in the scene.
  modifySceneItem(itemId: string, modifyParameters: ModifyItemParameters): GvResult {
    const item = this.renderer.getRenderItem(itemId);
    if (!item) {
      return { ok: false, errorMsg: `Invalid itemID: ${itemId}` }
    }

    if (item.isArtItem()) {
      return GeomViewerModel.modifyArtItem(item as (ArtItem3D), modifyParameters)
    }
    if (item.isFurnitureItem()) {
      return this.modifyFurnitureItem(itemId, item as FurnitureItem3D, modifyParameters)
    }

    return { ok: false, errorMsg: `Not implemented` }
  }

  // Return scene item parameters that can be used to recreate the same scene item,
  // replicating its current state.
  querySceneItemParameters(itemId: string): GvResult<SceneItemParameters> {
    let itemInfo: SceneItemParameters | undefined = undefined;
    const item = this.renderer.getRenderItem(itemId);

    if (item) {
      if (item instanceof FurnitureItem3D) {
        itemInfo = {
          itemKind: `furniture-item`,
          itemOptions: item.getFurnitureData(),
        }

        // We need transfer parent plane id, since furnitureData may not hold,
        // the scene items in its up-to-date state, only parameters when it's
        // first created.
        const parent = item.getParent()
        if (parent && parent.isStackableSurfaceItem()) {
          itemInfo.itemOptions.stackOnSurfaceId = parent.getId()
        }
        const location = item.getLocation()
        itemInfo.placement = {
          kind: `location3`,
          location3: { ...location },
        }
      }
    }

    if (itemInfo) {
      return { ok: true, retValues: itemInfo }
    }

    return { ok: false, errorMsg: `Item ${itemId} not in scene or not of supported type` }
  }

  // Return information about an item in the scene.
  querySceneItemInfo(itemId: string): GvResult<SceneItemInfo> {
    // The scene item may be either in the RenderItem table or the stackingSurface
    // table. We check both.
    let itemInfo: SceneItemInfo | undefined = undefined;
    const item = this.renderer.getRenderItem(itemId);
    if (item) {
      if (item instanceof FurnitureItem3D) {
        itemInfo = {
          itemKind: `furniture-item`,
          corners: item.getCorners(),
        }
      } else if (item instanceof ArtItem3D) {
        itemInfo = {
          itemKind: `art-item`,
          corners: item.getCorners(),
        }
      }
    } else {
      const stackItem = getStackingSurface(itemId);
      if (stackItem) {
        itemInfo = {
          itemKind: `stackable-surf-item`,
          corners: stackItem.getCorners(),
        }
      }
    }

    if (itemInfo) {
      return { ok: true, retValues: itemInfo }
    }
    return { ok: false, errorMsg: `Item ${itemId} not in scene` }
  }

  // Return the current value of wall color.
  retrieveWallColor() {
    return this.wallColor
  }

  // Store the current wall color (this function doesn't actually change the wall color).
  storeWallColor(color?: ColorRepresentation) {
    this.wallColor = color
  }

  private addItemStackablesToScene(furnitureItem: FurnitureItem3D, itemParams: FurnitureItemParameters) {
    let stackables = itemParams.stackables;
    if (!furnitureItem.getIsDefaultRotation()) {
      stackables = itemParams.rotatedStackables;
    }

    const promises: Promise<StackableSurfaceItem3D | null>[] = []
    if (stackables) {
      const parentId = furnitureItem.getId()
      stackables.forEach(stackable => {
        const stackableId = `${parentId}${stackable.id}`
        promises.push(this.addStackableSurfaceItem(stackableId, parentId, stackable))
      });
    }
    return Promise.all(promises)
  }

  // Remove and dispose of all the static stackable surfaces in the scene.
  private deleteAllStaticStackableSurfaces() {
    this.staticStackableSurfaces.forEach(id => {
      const item = this.renderer.getRenderItem(id);
      item?.endIsNigh();
    });

    this.staticStackableSurfaces.length = 0;
  }

  private static modifyArtItem(artItem: ArtItem3D, parameters: ModifyItemParameters): GvResult {
    if (parameters.modifyArtItem) {
      artItem.updateFrame(parameters.modifyArtItem.frameData, parameters.modifyArtItem.size);
      return { ok: true };
    }

    return { ok: false, errorMsg: `Invalid modifyParameters` };
  }

  private modifyFurnitureItem(
    itemId: string, furnitureItem: FurnitureItem3D, parameters: ModifyItemParameters): GvResult {

    // Allow for newOrientation or editOrientationStatus to be presented together or
    // separately.
    if (parameters.modifyFurnitureItem?.newOrientation !== undefined ||
      parameters.modifyFurnitureItem?.editOrientationStatus) {

      if (parameters.modifyFurnitureItem.editOrientationStatus === 'end') {
        // Status == 'end' signals the last update of a sequence of continuous-orientation
        // updates. We can re-enable notifications, by clearing draggingItemId.
        this.draggingItemId = undefined;

        // If the request to with status == 'end' comes without newOrientation value,
        // we need to explicitly dispatch that final 'Geometry' notification.
        if (parameters.modifyFurnitureItem?.newOrientation === undefined) {
          this.dispatchItemUpdate(itemId);
          furnitureItem.dispatchItemPlacementUpdate()
        }
        furnitureItem.enableDispatchProjectionUpdates(true)
      }

      if (parameters.modifyFurnitureItem?.newOrientation !== undefined) {
        furnitureItem.setOrientation(parameters.modifyFurnitureItem.newOrientation);
      }

      if (parameters.modifyFurnitureItem.editOrientationStatus === 'begin') {
        // Status == 'begin' signals the beginning of a sequence of continuous-orientation
        // updates. We suppress Geometry notification by setting draggingItemId = itemId.
        this.draggingItemId = itemId;
        furnitureItem.enableDispatchProjectionUpdates(false)
      }
    } else if (parameters.modifyFurnitureItem?.setIsMirrored !== undefined) {
      furnitureItem.setIsMirrored(parameters.modifyFurnitureItem?.setIsMirrored);
    } else if (parameters.modifyFurnitureItem?.toNextSnapRotation) {
      this.doItemSnapRotation(furnitureItem)
    } else if (parameters.modifyFurnitureItem?.animationOverride !== undefined) {
      const vt = parameters.modifyFurnitureItem.animationOverride
      furnitureItem.setAnimationOverride(vt.blendFactor > 0 ? vt : null)
    } else if (parameters.inspectorParameters) {
      const { reattachToSurface, wallSnapPushOut, position } = parameters.inspectorParameters
      if (position) {
        furnitureItem.setPosAbsolute(position)
      }
      if (reattachToSurface) {
        furnitureItem.inspectorReattachToSurface()
      }
      if (wallSnapPushOut) {
        furnitureItem.inspectorWallSnapPushOut()
      }
    } else if (parameters.modifyFurnitureItem?.newMaterialUrl !== undefined) {
      furnitureItem.updateMaterial(parameters.modifyFurnitureItem?.newMaterialUrl)
    }

    return { ok: true };
  }

  // Creates a GhostItem instance or re-news the existing one.
  updateGhostItem(parameters: FurnitureItemParameters): GvResult {
    // Legacy onGhostRender callback.
    const onGhostRender = (info: { corners: number[] }): void => {
        GeomViewerModel.onGhostItemUpdateCallback(parameters.id, info);
    }
    const { id, rotX, scale, min, max }: GhostItemParameters = parameters
    if (this.ghostItem) {
      this.ghostItem.endIsNigh()
    }

    this.ghostItem = new GhostItem3D(GHOST_ITEM_ID, this.renderer, onGhostRender, {id, rotX, scale, min, max})
    
    return { ok: true };
  }

  // Perform a snap-rotation on a furniture item. That includes all incidental
  // operations such as dropping stacked items to the floor and fixing the
  // stackable surfaces for that item.
  private doItemSnapRotation(furnitureItem: FurnitureItem3D) {
    const itemId = furnitureItem.getId();
    this.stackablesRelocate.aboutToReparentStackables(itemId)

    // Remove the existing stackable surfaces for this item.
    const surfaces = getStackableSurfacesForRenderItem(itemId)
    surfaces?.forEach((surf) => {
      surf.setParent(null)
      surf.endIsNigh()
    });

    furnitureItem.toNextSnapRotation();

    // Now add the stackable surfaces again. This will add the right surfaces for
    // the new orientation.
    this.addItemStackablesToScene(furnitureItem, furnitureItem.getFurnitureData())
    .then(() => {
      this.stackablesRelocate.reparentStackablesCycleFinish(furnitureItem, true)
    })
  }

  // Clear out any pending swap-operation info.
  private clearPendingSwapOp() {
    this.pendingSwapOp.isSwapOpInFlight = false;
    this.pendingSwapOp.deleteItemDone = false;
    this.pendingSwapOp.addItemDone = false;
    this.pendingSwapOp.itemSwappedOut = undefined;
    this.pendingSwapOp.itemSwappedIn = undefined;
    this.pendingSwapOp.swapOutPos2D = undefined;
    this.pendingSwapOp.swapOutPlacingBehavior = PlacingBehavior.NONE;
    this.pendingSwapOp.swapOutSnapRotationIndex = 0;
  }

  // Calculate and return the snap-rotation index for the swap-in furniture item.
  // This function tries to match the behavior and snap-rotation index of the
  // swapped-out furniture item. If it is not snap-rotatable, then only the
  // behaviors are matched. If all this fails, then it return 0.
  private calcSnapRotIndexForSwapInItem(swapInParams: AddFurnitureItemParams): number {
    let snapRotIndex = this.pendingSwapOp.swapOutSnapRotationIndex;

    // Get the candidate orientation from the swapped-in item by using the snap-rotation
    // index for the swapped-out item and the anchor list for the swapped-in item.
    const swapInOrientation = getFurnitureItemOrientation(
      this.pendingSwapOp.swapOutSnapRotationIndex, swapInParams.itemOptions);

    const swapInAnchors = swapInParams.itemOptions.placeables?.anchors;
    const swapOutCategory =
      this.pendingSwapOp.swapOutPlacingBehavior === PlacingBehavior.ON_WALL ? `wall` : `floor`;
    const swapInCategory = swapInParams.itemOptions.placingBehaviorHint === PlacingBehavior.ON_WALL
      ? `wall`
      : `floor`;

    // If the item being swapped out is snap-rotable, check if the orientations match.
    // We need to match both the orientation and the placing behavior (wall or floor).
    const hasSameCategory = swapInAnchors?.some(anchor => anchor.category === swapOutCategory)
    const useCategory = hasSameCategory
      ? swapOutCategory
      : swapInCategory
    if (this.pendingSwapOp.swapOutItemIsSnapRotable) {
      if (swapInOrientation !== this.pendingSwapOp.swapOutOrientation) {
        // Look through the swap-in-item anchors for an anchor that has the same category
        // (wall or floor) and yield the same orientation.
        const swapOutOrientation = this.pendingSwapOp.swapOutOrientation;
        snapRotIndex = swapInAnchors?.findIndex((anchor, index) =>
          anchor.category === useCategory &&
          getFurnitureItemOrientation(index, swapInParams.itemOptions) === swapOutOrientation) || 0;
      }
    } else {
      // Item swapped-out is not rotatable. We only try to match behavior (wall, or floor).
      // Use the default orientation by default.
      snapRotIndex = 0;
      if (swapInAnchors) {
        snapRotIndex = swapInAnchors.findIndex(anchor => anchor.category === useCategory);
      }
    }

    return snapRotIndex;
  }

  // Calculate and return the placement for the swap-in furniture item.
  // This function tries to match the behavior and plane index of the
  // swapped-out furniture item. If it is has no placeable option, then
  // it's dropped to the floor at the nearest point.
  private calcPlacementForSwapInItem(swapInParams: AddFurnitureItemParams) {
    const placement = this.pendingSwapOp.swapOutPlacement;

    // If the swapped in item has no placeable options, yet the swapped out item had
    // then drop the item to the floor at the nearest position.
    const swapOutItem = this.pendingSwapOp.itemSwappedOut?.item
    const swapOutParams = isFurnitureItem3D(swapOutItem) ? swapOutItem.getFurnitureData() : undefined
    const swapInPlaceables = swapInParams.itemOptions.placeables
    const swapOutPlaceables = swapOutParams?.placeables
    const swapInPlacing = swapInParams.itemOptions.placingOptions
    if (!swapInPlacing && !swapInPlaceables && swapOutPlaceables) {
      const floor = getFloorPlane()
      if (floor && placement) {
        placement.location3.bindTo = `${floor?.id}`
      }
    }
    let resultPlacingBehavior = this.pendingSwapOp.swapOutPlacingBehavior
    if (placement && swapInPlacing !== undefined) {
      const isWallOnly = !!(swapInPlacing & PlacingOptions.WALL_ONLY)
      const isEdgeOnly = !!(swapInPlacing & PlacingOptions.WALL_AND_FLOOR)
      const wallFlags = PlacingOptions.WALL_ONLY | PlacingOptions.WALL_AND_FLOOR | PlacingOptions.WALL_OR_FLOOR
      const isFloorOnly = !(swapInPlacing & wallFlags)

      const mustBeOnWall = isWallOnly || isEdgeOnly
      const mustBeOnFloor = isFloorOnly

      const fromWall = this.pendingSwapOp.swapOutPlacingBehavior === PlacingBehavior.ON_WALL
      const fromFloor = this.pendingSwapOp.swapOutPlacingBehavior === PlacingBehavior.ON_FLOOR

      const floor2Wall = fromFloor && mustBeOnWall
      const wall2Floor = fromWall && mustBeOnFloor
      const needReposition = floor2Wall || wall2Floor
      if (needReposition) {
        resultPlacingBehavior = floor2Wall ? PlacingBehavior.ON_WALL : PlacingBehavior.ON_FLOOR
        if (floor2Wall) {
          const repositionResult = GeomBaseScene.repositionFloorToWall(placement)
          if (repositionResult && repositionResult.point && repositionResult.plane) {
            placement.location3.localPos = { ...repositionResult.point }
            placement.location3.bindTo = String(repositionResult.plane.id)
          }
        } else {
          const position = GeomBaseScene.repositionWallToFloor(placement, swapOutItem?.getSurfaceBoundTo())
          const floorPlane = getFloorPlane()
          if (position && floorPlane) {
            placement.location3.localPos = { ...position }
            placement.location3.bindTo = String(floorPlane.id)
          }
        }
      }
    }

    // Other than that, return the swapOut placement as is to match the swapOut behavior.
    return { placement, placingBehavior: resultPlacingBehavior }
  }

  // Observer for item-update notifications, notably drag-start/end. This is so that we
  // can suppress some notifications while dragging.
  // Also this is where we handle adding stackable items to user selected surfaces.
  private onItemUpdate(info: NotificationInfo) {
    const itemUpdate = info as SceneItemUpdateNotification;

    if (itemUpdate.payload.stateInfo === 'PlacementModeSurfaceClicked') {
      // PlacementModeSurfaceClicked means user intends to place a stackable
      // item into a specified stackable surface after a stackable placement
      // session. So we add the item to the scene here with the given parameters
      // or if the item is already in the scene (ie. changing surfaces),
      // we reposition & reparent the item.
      const stackableParams = itemUpdate.payload.itemData.pendingStackableItem;
      const stackableUniqueId = itemUpdate.payload.itemData.pendingStackableUniqueId;

      if (stackableParams.itemKind === 'furniture-item') {
        const renderItem = gvCurrentScene()?.getRenderItem(stackableUniqueId) as RenderItem3D
        if (isFurnitureItem3D(renderItem)) {
          renderItem.setParentBySurfaceId(stackableParams.itemOptions.stackOnSurfaceId || null)
          if (stackableParams.placement) {
            renderItem.setPlacement(stackableParams.placement)
          }
          renderItem.dispatchItemPlacementUpdate()
        } else {
          // This is a new item, so we add it to the scene.
          this.addFurnitureItem(stackableUniqueId, stackableParams)
        }
      }
    } else if (itemUpdate.payload.stateInfo === 'DragStart') {
      this.draggingItemId = itemUpdate.payload.itemId;
    } else if (itemUpdate.payload.stateInfo === 'DragEnd') {
      const itemId = itemUpdate.payload.itemId;
      this.draggingItemId = undefined;

      // On drag-end, we need to send a final item-update notification for the dragged item.
      if (itemId) {
        this.dispatchItemUpdate(itemId);
      }
    }
  }

  // Helper function dispatches a geometry-update notification for the item with the given ID.
  private dispatchItemUpdate(itemId: string, notifyParent = true) {
    const renderItem = this.renderer.getRenderItem(itemId);
    if (renderItem  instanceof FurnitureItem3D) {
      const furnitureItem = renderItem;
      if (notifyParent){
        const parent = furnitureItem.getRootFurnitureParent()
        if (parent) {
          this.dispatchItemUpdate(parent.getId(), false)
          return
        }
      }

      const screenPos = furnitureItem.getDragReferencePointOnScreen();
      this.onUpdateFurnitureItemCallback(itemId, {
        corners: furnitureItem.getCorners(),
        x: screenPos.x,
        y: screenPos.y,
        heading: furnitureItem.getOrientation(),
      });

      // Children corners will need updates too.
      furnitureItem.getChildren()
        .forEach(item => {
          this.dispatchItemUpdate(item.getId(), false)
          item.getChildren().forEach(child => this.dispatchItemUpdate(child.getId(), false)) 
        })
    }
  }

  // FurnitureItem legacy callback function (see addFurnitureItem) for both onUpdate
  // and updateReactPin.
  private onUpdateFurnitureItemCallback(itemId: string, info: { [key: string]: unknown }) {
    const renderer = Renderer.getInstance();
    const renderItem = renderer?.getRenderItem(itemId);
    if (!renderItem) {
      return
    }
    if (renderItem.isFurnitureItem()) {
      const furnitureItem = renderItem as FurnitureItem3D
      // Note that we suppress geometry notifications while dragging. A single notification
      // will be dispatched on drag-end. Also, note that we don't check for a specific
      // draggingItemId, because we also want to suppress child item geometry updates.
      if ((info.corners || info.position) && this.draggingItemId === undefined) {
        let pos: PointXY | undefined
        if (!pos) {
          pos = furnitureItem.getDragReferencePointOnScreen();
        }
        // p3 property in legacy 2D items:
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        let p3 = undefined
        const saveInfo = furnitureItem.getSavePositioningInfo()
        const posToSave = saveInfo.placement?.location3.localPos
        if (posToSave) {
          p3 = toPoint3(posToSave)
        }
        const notification: SceneItemUpdateNotification = {
          what: NOTIFY_SCENE_ITEM_UPDATE,
          payload: {
            itemId,
            stateInfo: `Geometry`,
            itemData: {
              corners: info.corners as [Point2D, Point2D, Point2D, Point2D],
              x: pos.x,
              y: pos.y,
              heading: info.heading as number,
              p3,
              isLoading: furnitureItem.getIsDownloading(),
              isBoundToWall: furnitureItem.isBoundToWall(),
            }
          }
        }
        GrandCentral.getDispatcher().dispatchNotification(notification);
      }

      if (info.metrics) {
        const notification: SceneItemUpdateNotification = {
          what: NOTIFY_SCENE_ITEM_UPDATE,
          payload: {
            itemId,
            stateInfo: `ItemReady`,
          }
        }
        GrandCentral.getDispatcher().dispatchNotification(notification);
      }

      // Note: pin-update notifications are dispatched directly by the PinsManager.
    }
  }

  // Legacy callback for stackable-surface items. The callback is actually invoke
  // by ghost items as they are dragged on the stackable surface.
  private static onGhostItemUpdateCallback(itemId: string, info: { corners: number[] }) {
    if (info?.corners?.length === 4) {
      const notification: SceneItemUpdateNotification = {
        what: NOTIFY_SCENE_ITEM_UPDATE,
        payload: {
          itemId,
          stateInfo: `GhostGeometry`,
          itemData: {
            corners: info.corners as [number, number, number, number],
          }
        }
      }
      GrandCentral.getDispatcher().dispatchNotification(notification);
    }
  }

  public storeRoomDimensionsEnabled(enabled: boolean) {
    this.isRoomDimensionsEnabled = enabled
  }

  public retrieveRoomDimensionsEnabled() {
    return this.isRoomDimensionsEnabled
  }

  public storeProductDimensionsEnabled(enabled: boolean) {
    this.isProductDimensionsEnabled = enabled
  }

  public retrieveProductDimensionsEnabled() {
    return this.isProductDimensionsEnabled
  }

  public storeDynamicMeasurementsEnabled(enabled: boolean) {
    this.isDynamicMeasurementsEnabled = enabled
  }

  public retrieveDynamicMeasurementsEnabled() {
    return this.isDynamicMeasurementsEnabled
  }
}
