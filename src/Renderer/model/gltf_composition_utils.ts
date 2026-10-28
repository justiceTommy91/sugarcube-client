import { RenderItem3D } from "Renderer/model/RenderItem3D"

import * as pu from 'Renderer/positioning/positioning_utilities'
import { getStackableSurfaceItem3D, isStackableSurfaceItem3D } from 'Renderer/rendering/scene_utils'
import { 
    multiplyMatrices4x4,
    composeTransform,
    extractPosition,
    extractQuaternionFromMat4,
    getInverted,
    copyMatrix4,
    transpose4,
} from 'Renderer/geometry/utilities'
import type FurnitureItem3D from 'Renderer/model/FurnitureItem3D'
import type ArtItem3D from "Renderer/model/ArtItem3D"
import type { FurnitureItemParameters, Matrix4x4, Placement, PointXYZ } from 'Renderer/geomviewer/geom_types'
import { EXTRA_HINT_STACKABLE } from 'Renderer/constants'
import { Point3 } from "Renderer/geometry"

// A set of utility functions to convert render item placement from and to gltf composition format.
// Summary of positioning differences between the Viewer and gltf save format:
// Item type:                                       Viewer:                     Gltf Save:
// Regular furniture or art item (no parent):       The scene is the parent.    Surface is the parent.
// Item on a static stackable surface:              Surface is the parent.      Surface is the parent.
// Item on a stackable surface on another item:     Surface is the parent.      Surface's parent item is the parent.

type Legacy3DPlacement = Extract<Placement, { kind: 'location3Legacy' }>

// Checks if <parentItem> is snap rotated to account for that when converting to world space. 
// See <convertRegularPlacementToSave>. For all rest of cases, returns regular localToWorld.
function localToWorldCheckingSnapRot(posInParentCoords: PointXYZ, parentItem: RenderItem3D) {
  const snapRotateTransform = (parentItem as FurnitureItem3D).getCurrentSnapRotateTransform?.()
  const isDefaultRotation = (parentItem as FurnitureItem3D).getIsDefaultRotation?.()
  if (snapRotateTransform && !isDefaultRotation) {
    const worldTransform = multiplyMatrices4x4(parentItem.getWorldTransform(), snapRotateTransform)
    return new Point3(posInParentCoords.x, posInParentCoords.y, posInParentCoords.z).mulMat4(worldTransform)
  }
  return parentItem.localToWorld(posInParentCoords)
}

/**
 * In gltf composition, a stackable item's local position is set in parent furniture item's coordinate system,
 * while in the viewer it should be surface's coordinates system. This function converts former to latter.
 * @param stackOnSurfaceId Id of the surface to which the item is bound.
 * @param posInParentCoords Item's position in parent furniture item's coordinates.
 * @returns Item's position in parent surface's coordinates.
 */
function toStackableSurfaceLocalPos(stackOnSurfaceId: string, posInParentCoords: PointXYZ): PointXYZ {
  const parentSurface = getStackableSurfaceItem3D(stackOnSurfaceId)
  const parentItem = parentSurface?.getParent()
  if (parentSurface && parentItem) {
      const worldPos = localToWorldCheckingSnapRot(posInParentCoords, parentItem)
      const localPos = parentSurface.worldToLocal(worldPos)
      return localPos
  }
  return posInParentCoords
}

// Convert placement of an item bound to a static stackable surface.
function convertStaticStackablePlacementFromSave(placement: Legacy3DPlacement): Placement {
  const ret: Placement = {
    kind: `location3`,
    location3: {
        localPos: { x: 0, y: 0, z: 0 },
        bindTo: '',
    },
    rotation: [0, 0, 0, 1],
  }

  const stackableSurface = getStackableSurfaceItem3D(placement.location3.bindTo)
  if (stackableSurface) {
      ret.location3.hintExtraBindTo = EXTRA_HINT_STACKABLE
      ret.location3.localPos = { ...placement.location3.localPos }
      ret.location3.bindTo = placement.location3.bindTo
      ret.rotation = [...placement.rotation]
  }
  return ret
}

// Convert placement of an item bound to stackable surface which is a child of other furniture item.
function convertDymanicStackablePlacementFromSave(placement: Legacy3DPlacement, stackOnSurfaceId: string): Placement {
  return {
    kind: `location3`,
    location3: {
        localPos: toStackableSurfaceLocalPos(stackOnSurfaceId, placement.location3.localPos),
        bindTo: stackOnSurfaceId,
        hintExtraBindTo: EXTRA_HINT_STACKABLE,
    },
    rotation: [...placement.rotation],
  }
}

// Convert placement of a regular furniture or art item.
function convertRegularItemPlacementFromSave(placement: Legacy3DPlacement, snapRotUndo?: Matrix4x4) {
  const ret: Placement = {
    kind: `location3`,
    location3: {
        localPos: { x: 0, y: 0, z: 0 },
        bindTo: '',
    },
    rotation: [0, 0, 0, 1],
  }
  const adjustedBindTo = String(+placement.location3.bindTo)
  const polygon = pu.getPolygonById(Number(adjustedBindTo))
  if (polygon) {
    const polygonTransform = copyMatrix4(polygon.transform)
    transpose4(polygonTransform)
    let transformInPolySpace = composeTransform(placement.location3.localPos,
        placement.rotation, { x: 1, y: 1, z: 1})
    // We need to undo the snap rotate transformation that was done on save. See <convertRegularPlacementToSave>.
    if (snapRotUndo) {
      transformInPolySpace = multiplyMatrices4x4(transformInPolySpace, snapRotUndo)
    }
    
    const worldTransform = multiplyMatrices4x4(polygonTransform, transformInPolySpace) 
    const worldPos = extractPosition(worldTransform)
    // Regular items are direct children of the scene, i.e. their local transform is the same as world.
    ret.location3.localPos = { ...worldPos }
    ret.location3.bindTo = adjustedBindTo
    ret.rotation = extractQuaternionFromMat4(worldTransform)
  }
  return ret
}

export function convertFurniturePlacementFromSave(placement: Placement,
  furnitureData: FurnitureItemParameters, snapRotUndo?: Matrix4x4): Placement {
  if (placement.kind !== `location3Legacy`) {
    return placement
  }
  if (placement.parentId === 'SURFACE') {
    const stackableSurface = getStackableSurfaceItem3D(String(placement.location3.bindTo))
    if (stackableSurface) {
        return convertStaticStackablePlacementFromSave(placement)
    }
    return convertRegularItemPlacementFromSave(placement, snapRotUndo)
  }
  if (furnitureData.stackOnSurfaceId) {
    return convertDymanicStackablePlacementFromSave(placement, furnitureData.stackOnSurfaceId)
  }
  return placement
}

export function convertArtPlacementFromSave(placement: Placement): Placement {
  if (placement.kind !== `location3Legacy`) {
    return placement
  }
  return convertRegularItemPlacementFromSave(placement)
}

function convertStaticStackablePlacementToSave(renderItem: RenderItem3D) {
  const location = renderItem.getLocation()
  const parentSurface = getStackableSurfaceItem3D(location.bindTo)
  if (!parentSurface) {
    return {}
  }
  const quaternion = extractQuaternionFromMat4(renderItem.getTransform())
  return {
    parentAttachment: +location.bindTo,
    parentIdOrSurface: 'SURFACE',
    parentId: renderItem.getParent()?.getId(),
    placement: {
      kind: `location3`,
      location3: {
        localPos: { ...location.localPos }
      },
      rotation: {
        x: quaternion[0],
        y: quaternion[1],
        z: quaternion[2],
        w: quaternion[3],
      },
    }
  }
}

function convertDynamicStackablePlacementToSave(childItem: RenderItem3D, pseudoParent: RenderItem3D) {
  const parentId = pseudoParent.getId()
  let pseudoParentTransform = pseudoParent.getWorldTransform()
  const snapRotateTransform = (pseudoParent as FurnitureItem3D).getCurrentSnapRotateTransform?.()
  if (snapRotateTransform) {
    pseudoParentTransform = multiplyMatrices4x4(pseudoParentTransform, snapRotateTransform)
  }
  const worldTransform = childItem.getWorldTransform()
  const transformInPseudoParentSpace = multiplyMatrices4x4(getInverted(pseudoParentTransform), worldTransform)
  const quaternion = extractQuaternionFromMat4(transformInPseudoParentSpace)
  let parentAttachment = +childItem.getLocation().bindTo
  const parent = childItem.getParent()
  if (isStackableSurfaceItem3D(parent)) {
    parentAttachment = +parent.getPlaneParameters().id
  }
  return {
    parentAttachment,
    parentIdOrSurface: parentId,
    parentId,
    placement: {
      kind: `location3`,
      location3: {
        localPos: extractPosition(transformInPseudoParentSpace)
      },
      rotation: {
        x: quaternion[0],
        y: quaternion[1],
        z: quaternion[2],
        w: quaternion[3],
      },
    }
  }
}

/**
 * Converts the item placement data to gltf composition format.
 * @param renderItem The renderItem from which we extract the placement properties to save.
 * @param snapRotateTransform
 *  +--------------------------+
    |                          |
    |                          |
    |                          x 2
    |                          |
    |                          |
    +------------x-------------+
                 1 
  *  Gltf composition format consumes a position and a rotation. This means we need to pass in point 2
  *  while the viewer uses 1. Optional <snapRotateTransformation> transforms point 1 to 2 when the item is
  *  snap rotated. This transformation gets undone when the item loads.
 */
function convertRegularPlacementToSave(renderItem: RenderItem3D) {
  const polygon = pu.getPolygonById(Number(renderItem.getLocation().bindTo))
  if (!polygon) {
      return {}
  }
  let worldTransform = renderItem.getWorldTransform()
  const snapRotateTransform = (renderItem as FurnitureItem3D).getCurrentSnapRotateTransform?.()
  if (snapRotateTransform) {
    worldTransform = multiplyMatrices4x4(worldTransform, snapRotateTransform)
  }

  const polygonTransform = copyMatrix4(polygon.transform)
  transpose4(polygonTransform)
  const transformInPolygonSpace = multiplyMatrices4x4(getInverted(polygonTransform), worldTransform)
  const quaternion = extractQuaternionFromMat4(transformInPolygonSpace)
  return {
    parentAttachment: +renderItem.getLocation().bindTo,
    parentIdOrSurface: 'SURFACE',
    placement: {
      kind: `location3`,
      location3: {
        localPos: extractPosition(transformInPolygonSpace)
      },
      rotation: {
        x: quaternion[0],
        y: quaternion[1],
        z: quaternion[2],
        w: quaternion[3],
      },
    }
  }
}

export function convertFurniturePlacementToSave(furnitureItem: FurnitureItem3D) {
  if (furnitureItem.getLocation().hintExtraBindTo === EXTRA_HINT_STACKABLE ||
      // Combinables using sockets should be saved similarly to stackables.
      furnitureItem.usesSockets()) {
    const pseudoParent = furnitureItem.getRootFurnitureParent()
    if (pseudoParent) {
      return convertDynamicStackablePlacementToSave(furnitureItem, pseudoParent)
    }
    return convertStaticStackablePlacementToSave(furnitureItem)
  }
  return convertRegularPlacementToSave(furnitureItem)
}

export function convertArtPlacementToSave(artItem: ArtItem3D) {
  return convertRegularPlacementToSave(artItem)
}