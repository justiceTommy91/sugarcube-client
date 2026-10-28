import * as THREE from "three";
import { 
  findNewStackablePosition,
  getNormalizedPos,
} from "Renderer/utils/modelUtils"
import { Point2 } from "Renderer/geometry";
import { gvCurrentScene } from "Renderer/foundation/geom_app"
import type FurnitureItem3D from "Renderer/model/FurnitureItem3D";
import type { Matrix3x3 } from 'Renderer/geomviewer/geom_types'
import { createIdentity3 } from "Renderer/geometry/utilities";

// Drop the given furniture items to the floor.
export function dropItemsToFloor(items: (FurnitureItem3D)[]) {
  items.forEach((item) => {
    const floorPos = gvCurrentScene()?.findPlaceableFloorPos()
    if (!floorPos) {
      return
    }
    item.setParent(null)
    item.setPlacement({
      kind: `location3`,
      location3: { ...floorPos.pos3D },
    })
    item.dispatchItemPlacementUpdate()
  })
}

function setVisibleAndDropToFloor(stackableItems: (FurnitureItem3D)[]) {
  // Need items back visible beforehand so that can detected by the floor placer and they spread.
  stackableItems.forEach(item => item.setVisible(true))
  dropItemsToFloor(stackableItems)
}

class StackingInfo {
  surfaceIndex = -1
  normalizedPosition: Point2 = new Point2(0, 0)
  rotation: Matrix3x3 = createIdentity3()
}

// Handles this.stackedItemsToReparent state and stackable relocation logic.
// Stackable items reparenting operation can happen due to a swap or a snap rotate operation. 
// Its initiated by a call to aboutToReparentStackables and completed by a call to reparentStackablesCycleFinish.
export class StackablesRelocate {
  // Map to store the stackable to relocate and respective normalized coordinate at the origin surface.
  private stackedItemsToReparent: Map<FurnitureItem3D, StackingInfo> = new Map()

  // Keeps the stackable items in this.stackedItemsToReparent for later relocate and reparent
  // or drops them to floor according to feature flag.
  public aboutToReparentStackables(currentParentId: string) {
    // We cannot have concurrent reparenting ops, which means that if we have many reparenting ops they are sequential.
    // Each started operation finishes so this.stackedItemsToReparent gets cleared and its length is 0 at this point. 
    // However, will this always be the case? We are relying on two different UI calls (deleteItem, addFurnitureItem).
    // If there could be concurrent calls for this operation there would be "orphaned" items that did not finish a 
    // previous reparenting cycle. We drop them to the floor in this case. 
    if (this.stackedItemsToReparent.size > 0) {
      setVisibleAndDropToFloor(Array.from(this.stackedItemsToReparent.keys()))
    }

    const stackedItems = gvCurrentScene()?.getStackedItemsForParent(currentParentId);
    if (stackedItems) {
      stackedItems.forEach((item) => {
        // Deparent and update the item world position.
        // The world position will be used to re compute local position again after swap is complete.
        this.beforeReparentingStackable(item, currentParentId)
      })
    }
  }

  // Full reparent cycle, reparent, set items visible and clear operation.
  public reparentStackablesCycleFinish(newParentItem: (FurnitureItem3D), visibleOnParent = false) {
    this.reparentPendingStackables(newParentItem)
    // If the stackable is stacked we may want to wait for later event to set stackables visible 
    // (e.g parent load finish on swap) or not (parent already loaded and visible on snap rotate).
    // If the stackable is on the floor, we don't to need wait, stackable will be visible.
    this.stackedItemsToReparent.forEach( (_, item) => {
      const isParented = item.getParentId() !== null
      const isVisible = isParented ? visibleOnParent : true
      item.setVisible(isVisible)
      item.dispatchSceneItemUpdateWithAutoPlacement()
    })
    this.stackedItemsToReparent.clear()
  }

  private beforeReparentingStackable(item: FurnitureItem3D, currentParentId: string) {
    const scene = gvCurrentScene()
    if (!scene) {
      return
    }
    // Store stackables and their normalized coordinates respect departing surface. 
    const fromSurfs = scene.getStackableSurfacesForRenderItem(currentParentId);
    const fromSurf = fromSurfs.find(surf => surf.getId() === item.getPlacement().location3.bindTo)
    if (fromSurf) {
      const worldPos = item.getObject()?.getWorldPosition(new THREE.Vector3())
      if (worldPos) {
        const normCoords = getNormalizedPos(worldPos, fromSurf) 
        if (normCoords) {
          const stackingInfo = new StackingInfo()
          if (fromSurf)
            stackingInfo.surfaceIndex = Number(fromSurf.getStackGroupId());

          stackingInfo.normalizedPosition = normCoords
          stackingInfo.rotation = item.getRotRelative()
          this.stackedItemsToReparent.set(item, stackingInfo)
        }
      }
    }
    // Visibility and parenting arrangements.
    item.setVisible(false)
    item.setParent(null)
  }

  // Relocates and reparents stackedItemsToReparent to <newParentItem>. 
  // stackedItemsToReparent are not visible at this point. 
  private reparentPendingStackables(newParentItem: (FurnitureItem3D)) {
    if (newParentItem.hasStackableSurfaces()) {
      this.stackedItemsToReparent.forEach((_, pendingToReparentItem) => {
        this.reparentPendingStackable(pendingToReparentItem, newParentItem)
      })
    } else {
      setVisibleAndDropToFloor(Array.from(this.stackedItemsToReparent.keys()))
    }
  }

  private static getStackable(parentItem: FurnitureItem3D, id: string) {
    return parentItem.getChildren().find((child) => child.getId() === id)
  }

  private reparentPendingStackable(stackableItem: FurnitureItem3D, newParentItem: FurnitureItem3D) {
    const destination = this.getStackableDestination(stackableItem, newParentItem)
    let reparentSuccess = false
    if (destination) {
      const surface = StackablesRelocate.getStackable(newParentItem, destination.stackableId)
      if (surface) {
        stackableItem.setParent(surface)
        stackableItem.setPosRelative(destination.newPos)
        stackableItem.setRotRelative(destination.rotation)
        reparentSuccess = true
      }
    }
    if (!reparentSuccess) {
      setVisibleAndDropToFloor([stackableItem])
    }
  }

  private getStackableDestination(stackableItem: FurnitureItem3D, newParentItem: FurnitureItem3D) {
    const scene = gvCurrentScene()
    if (!scene) {
      return null  
    }

    const toSurfs = scene.getStackableSurfacesForRenderItem(newParentItem)
    
    const stackingInfo = this.stackedItemsToReparent.get(stackableItem)
    const parentId = newParentItem.getId()
    if (parentId && stackingInfo) {
      // Match the index of the origin surafce to the index of the destination surface.
      // Using mod math avoids out of bounds and assigns an available index when fromSurfsCount > destSurfsCount.
      const fromSurfIdx = stackingInfo.surfaceIndex
      const toSurf = toSurfs[Number(fromSurfIdx) % toSurfs.length]
      const stackableId = toSurf.getId()

      if (stackingInfo.normalizedPosition) {
        const newPos = findNewStackablePosition(stackingInfo.normalizedPosition, toSurf)
        if (newPos) {
          return  {
            newPos,
            rotation: stackingInfo.rotation,
            stackableId
          }
        }
      }
    }

    return null
  }
}

