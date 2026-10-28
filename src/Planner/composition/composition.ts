import * as THREE from 'three'
import * as WallSnap from 'Renderer/WallSnap'

import { CompositionItem, CompositionItemSnaphot } from 'Planner/composition/composition_item'
import type { RoomScene } from 'Planner/rendering/room_scene'
import type { WallsGraph } from 'Planner/editor/walls_graph'
import type { RoomMesh } from 'Planner/rendering/room_mesh'
import type { BoundableSurfaceType, FurnitureSaveData, RefinedParentType } from 'Planner/planner_types'
import type { CompositionFurnitureItem, GeneralParentType, CollisionResolutionResult } from 'Planner/api_types'
import { isGlbModelInfo } from 'Planner/api_types'
import * as plannerConstants from 'Planner/planner_constants'
import type { GltfModelManager } from 'Planner/rendering/model_manager'

import {
  PLACEMENT_ANYWHERE,
  PLACEMENT_WALL_ONLY,
  PLACEMENT_FLOOR_ONLY,
  OBJECT_TYPE_COMPOSITION_ITEM,
} from 'Planner/api_constants'

import type { PlaneType } from 'Renderer/geomviewer/geom_types'
import { gvPositioningConext } from 'Renderer/positioning/positioning_context'

type ObjectsLink = {
  roomSurfaceMesh: THREE.Object3D,
  compositionSurfaceNode: THREE.Object3D,
}

type SurfaceNode = {
  node: THREE.Object3D,
  type: BoundableSurfaceType,
}

type PlacementFlags = {
  canBePlacedOnWall: boolean
  canBePlacedOnFloor: boolean
  canBePlacedOnWallFloorEdge: boolean
}

export type CompositionSnapshot = {
  items: Map<string, CompositionItemSnaphot>
}

export class Composition {
  private modelManager: GltfModelManager
  private scene: RoomScene
  private root: THREE.Object3D | null = null
  private rootNodes = new Map<string, THREE.Object3D>()
  private floorPlane: PlaneType | null = null

  // Links between visual room wall meshes and "surface" nodes in the composition gltf.
  private surfaceLinks: ObjectsLink[] = []

  private comspositionSurfaces = new Map<string, SurfaceNode>()
  private items = new Map<string, CompositionItem>()
  private snapshot: CompositionSnapshot | null = null

  constructor(scene: RoomScene, modelManager: GltfModelManager) {
    this.scene = scene
    this.modelManager = modelManager
  }

  public initialize(floorPlane: PlaneType, wallsGraph: WallsGraph, roomMesh: RoomMesh) {
    this.floorPlane = floorPlane
    if (this.root) {
      this.scene.getRenderScene().remove(this.root)
      this.root = null
    }
    this.root = new THREE.Group()
    this.root.userData.exportIgnore = true
    this.initSurfaces(roomMesh)
    this.scene.getRenderScene().add(this.root)

    Composition.resetWallSnap(floorPlane, wallsGraph)
  }

  public addCompositionItem(itemInfo: CompositionFurnitureItem) {
    if (!this.floorPlane) {
      return undefined
    }
    const modelId = isGlbModelInfo(itemInfo.model) ? itemInfo.model.glbUrl : itemInfo.model.imageUrl
    const refinedItemInfo = this.refineParentType(itemInfo)
    const placementFlags = {
      canBePlacedOnWall: itemInfo.placement === PLACEMENT_ANYWHERE || itemInfo.placement === PLACEMENT_WALL_ONLY,
      canBePlacedOnFloor: itemInfo.placement === PLACEMENT_ANYWHERE || itemInfo.placement === PLACEMENT_FLOOR_ONLY,
      canBePlacedOnWallFloorEdge: true,
    }
    const pos = new THREE.Vector3(itemInfo.position.x, itemInfo.position.y, itemInfo.position.z)
    const quat = new THREE.Quaternion(itemInfo.rotation.x, itemInfo.rotation.y, itemInfo.rotation.z,
      itemInfo.rotation.w)
    const scale = new THREE.Vector3(1, 1, 1)
    const rootLocalTransform = new THREE.Matrix4()
    rootLocalTransform.compose(pos, quat, scale)

    const modelPos = new THREE.Vector3(itemInfo.modelPosition.x, itemInfo.modelPosition.y, itemInfo.modelPosition.z)
    const modelQuat = new THREE.Quaternion(itemInfo.modelRotation.x, itemInfo.modelRotation.y, itemInfo.modelRotation.z,
      itemInfo.modelRotation.w)

    const modelTransform = new THREE.Matrix4()
    modelTransform.compose(modelPos, modelQuat, scale)

    return this.createCompositionItem(itemInfo.uniqueId, modelId, placementFlags, refinedItemInfo.parentId,
      refinedItemInfo.parentType, rootLocalTransform, modelTransform)
  }

  public resolveCollisions(floorPlane: PlaneType, wallsGraph: WallsGraph): CollisionResolutionResult {
    this.syncSurfaces()
    Composition.resetWallSnap(floorPlane, wallsGraph)
    let success = true
    let obstacleItemId: string | undefined = undefined
    this.items.forEach((item) => {
      if (!success) {
        return
      }
      success = item.resolveCollisions(floorPlane, wallsGraph)
      if (!success) {
        obstacleItemId = item.getId()
      }
    })
    if (success) {
      return { success }
    }
    return {
      success: false,
      obstacleType: OBJECT_TYPE_COMPOSITION_ITEM,
      obstacleItemsIds: obstacleItemId ? [obstacleItemId] : undefined,
    }
  }

  public getItems() {
    return this.items
  }

  public getItem(id: string) {
    return this.items.get(id)
  }

  public getItemChildren(id: string) {
    const item = this.getItem(id)
    if (!item) {
      return []
    }
    const itemRoot = item.getRootObject()
    return itemRoot.children
      .filter(childObj => childObj.userData.isItemRoot)
      .map(childObj => this.getItem(childObj.userData.itemId))
      .filter((child): child is CompositionItem => !!child)
  }

  public deleteItem(id: string) {
    const item = this.getItem(id)
    if (!item) {
      return
    }
    const children = this.getItemChildren(id)
    children.forEach(child => this.deleteItem(child.getId()))
    item.dispose()
    this.items.delete(id)
  }

  public getWallItems(wallId: string) {
    const result: CompositionItem[] = []
    this.items.forEach((item) => {
      if (item.getBoundToType() === 'wall' && item.getBoundToId() === wallId) {
        result.push(item)
      }
    })
    return result
  }

  public getWallLengthLimit(wallId: string) {
    let result = 0
    this.items.forEach((item) => {
      if (item.getBoundToId() !== wallId) {
        return
      }
      result = Math.max(result, item.getSize().x)
    })
    return result
  }

  // Get current furniture transforms in the format expected by composition save API.
  public getFurnitureSaveData(): FurnitureSaveData[] {
    const result: FurnitureSaveData[] = []
    this.rootNodes.forEach((object, uniqueId) => {
      const compositionItem = this.items.get(uniqueId)
      if (!compositionItem) {
        return
      }
      const surfaceType = compositionItem.getBoundToType()
      const parentUniqueId = compositionItem.getBoundToId()
      result.push({
        uniqueId,
        x: object.position.x,
        y: object.position.y,
        z: object.position.z,
        heading: object.quaternion.w,
        headingI: object.quaternion.x,
        headingJ: object.quaternion.y,
        headingK: object.quaternion.z,
        parentType: surfaceType,
        parentUniqueId,
      })
    })
    return result
  }

  private static resetWallSnap(floorPlane: PlaneType, wallsGraph: WallsGraph) {
    const fxh = new THREE.Vector3(floorPlane.rot[0][0], floorPlane.rot[0][1], floorPlane.rot[0][2])
    const fyh = new THREE.Vector3(floorPlane.rot[1][0], floorPlane.rot[1][1], floorPlane.rot[1][2])

    const floorLines = [...wallsGraph.getWalls().values()].map((wall) => {
      const v1 = wallsGraph.getVertexPosition(wall.vertexIds[0])
      const v2 = wallsGraph.getVertexPosition(wall.vertexIds[1])
      const len = v1.distanceTo(v2)
      const dir = new THREE.Vector2().subVectors(v2, v1).normalize()

      // Following WallSnap conventions:
      const tangent = [dir.x, dir.y]
      const normal = [dir.y, -dir.x]
      const normal3D = new THREE.Vector3(
        normal[0] * fxh.x + normal[1] * fyh.x,
        normal[0] * fxh.y + normal[1] * fyh.y,
        normal[0] * fxh.y + normal[1] * fyh.z
      )

      const WALL_SHIFT = 0.02125

      const line = [[v1.x, v1.y], [v2.x, v2.y]]
      line[0][0] += WALL_SHIFT * normal[0]
      line[0][1] += WALL_SHIFT * normal[1]

      line[1][0] += WALL_SHIFT * normal[0]
      line[1][1] += WALL_SHIFT * normal[1]


      return {
        len,
        n: normal3D,
        n2: normal,
        points: line,
        t2: tangent,
      }
    })

    const planes = [floorPlane]
    const intrinsics = gvPositioningConext()?.getCamera()?.getIntrinsics()
    const legacyIntrinsics: number[] = intrinsics
      ? [
        intrinsics.focalLengthX,
        intrinsics.focalLengthY,
        intrinsics.principalPointX,
        intrinsics.principalPointY,
      ]
      : []
    WallSnap.init(legacyIntrinsics, planes, floorLines)
  }

  private initSurfaces(roomMesh: RoomMesh) {
    if (!this.root) {
      return
    }
    this.root.clear()

    const floorMesh = roomMesh.getFloorMesh()
    const wallMeshes = roomMesh.getWallMeshes()

    if (floorMesh) {
      const floorId = roomMesh.getMeshSurfaceId(floorMesh)
      if (floorId !== undefined) {
        const floorNode = new THREE.Group()
        this.root.add(floorNode)
        this.comspositionSurfaces.set(String(floorId), { node: floorNode, type: `floor` })
        Composition.syncSurface(floorMesh, floorNode)
      }
    }
    wallMeshes.forEach((wallMesh) => {
      const wallId = roomMesh.getMeshSurfaceId(wallMesh)
      if (wallId === undefined) {
        return
      }
      this.addWallSurface(String(wallId), wallMesh)
    })
  }

  private addWallSurface(wallId: string, wallMesh: THREE.Object3D) {
    if (!this.root) {
        return
    }
    const wallNode = new THREE.Group()
    this.root.add(wallNode)
    this.comspositionSurfaces.set(wallId, { node: wallNode, type: `wall` })
    Composition.syncSurface(wallMesh, wallNode)

    this.surfaceLinks.push({
      roomSurfaceMesh: wallMesh,
      compositionSurfaceNode: wallNode,
    })
  }

  private syncSurfaces() {
    this.surfaceLinks.forEach((link) => Composition.syncSurface(link.roomSurfaceMesh, link.compositionSurfaceNode))
  }

  private static syncSurface(surfaceMesh: THREE.Object3D, compositionNode: THREE.Object3D) {
    surfaceMesh.updateMatrixWorld(true)
    compositionNode.matrix.copy(surfaceMesh.matrix)
    compositionNode.matrix.decompose(compositionNode.position, compositionNode.quaternion, compositionNode.scale)
    compositionNode.updateMatrixWorld()

    if (surfaceMesh.userData.originX !== undefined && surfaceMesh.userData.originY !== undefined) {
      compositionNode.userData.originX = surfaceMesh.userData.originX
      compositionNode.userData.originY = surfaceMesh.userData.originY
    }
  }

  public onWallSplit(wallId: string, newWallId: string, wallMesh: THREE.Object3D, newWallMesh: THREE.Object3D,
    worldDistance: number) {
    this.addWallSurface(newWallId, newWallMesh)
    const wallNode = this.comspositionSurfaces.get(wallId)?.node
    if (!wallNode) {
      return
    }
    this.items.forEach((item) => {
      if (item.getBoundToType() !== 'wall' || item.getBoundToId() !== wallId) {
        return
      }
      const itemId = item.getId()
      const itemRootNode = this.rootNodes.get(itemId)
      if (!itemRootNode) {
        return
      }
      const itemPosition1D = itemRootNode.position.x - (wallMesh.userData.originX || 0.0)
      if (itemPosition1D > worldDistance) {
        item.setParentSurface(newWallId)
      }
    })
  }

  public onWallDeleted(retainedWall: string, deletedWallId: string) {
    this.items.forEach((item) => {
      if (item.getBoundToType() !== 'wall' || item.getBoundToId() !== deletedWallId) {
        return
      }
      item.setParentSurface(retainedWall)
    })
    const surface = this.comspositionSurfaces.get(deletedWallId)
    if (this.root && surface) {
      this.root.remove(surface.node)
      const linkIndex = this.surfaceLinks.findIndex(link => link.compositionSurfaceNode === surface.node)
      if (linkIndex !== -1) {
        this.surfaceLinks.splice(linkIndex, 1)
      }
    }
    this.comspositionSurfaces.delete(deletedWallId)
    this.syncSurfaces()
  }

  private onItemSurfaceSwitch(itemId: string, surfaceId: string) {
    const itemRootNode = this.rootNodes.get(itemId)
    const newSurface = this.comspositionSurfaces.get(surfaceId)?.node
    if (!itemRootNode || !newSurface) {
      return
    }
    const worldMatrix = itemRootNode.matrixWorld.clone()
    if (itemRootNode.parent) {
      itemRootNode.parent.remove(itemRootNode)
    }
    newSurface.add(itemRootNode)
    newSurface.updateMatrixWorld(true)

    const parentMatrixWorldInv = newSurface.matrixWorld.clone().invert()
    itemRootNode.matrix.copy(worldMatrix.premultiply(parentMatrixWorldInv))
    itemRootNode.matrix.decompose(itemRootNode.position, itemRootNode.quaternion, itemRootNode.scale)
    itemRootNode.updateWorldMatrix(false, true)
  }

  private refineParentType(itemInfo: CompositionFurnitureItem<GeneralParentType>)
    : CompositionFurnitureItem<RefinedParentType> {
    let refinedType: RefinedParentType = `floor`
    if (itemInfo.parentType === 'item') {
      refinedType = `item`
    } else {
      const surface = this.comspositionSurfaces.get(itemInfo.parentId)
      if (surface) {
        refinedType = surface.type
      }
    }
    return {
      ...itemInfo,
      parentType: refinedType,
    }
  }

  public createSnapshot() {
    this.clearSnapshot()
    this.snapshot = {
      items: new Map()
    }
    for (const [id, item] of this.items) {
      this.snapshot.items.set(id, item.createSnapshot())
    }
  }

  public restoreSnaphot() {
    if (!this.snapshot) {
      return
    }
    const toDelete: string[] = []
    for (const [id] of this.items) {
      if (!this.snapshot.items.has(id)) {
        toDelete.push(id)
      }
    }
    toDelete.forEach(id => this.deleteItem(id))

    this.snapshot.items.forEach((itemSnapshot) => {
      const item = this.items.get(itemSnapshot.id)
      if (item) {
        item.restoreSnaphot(itemSnapshot)
      } else {
        this.createItemFromSnapshot(itemSnapshot)
      }
    })
  }

  public clearSnapshot() {
    this.snapshot = null
  }

  private createItemFromSnapshot(itemSnapshot: CompositionItemSnaphot) {
    const itemId = itemSnapshot.id
    const modelId = itemSnapshot.modelId
    const boundToType = itemSnapshot.boundToType
    const boundToId = itemSnapshot.boundToId
    const placementConfig = itemSnapshot.placementConfig
    const localTransform = itemSnapshot.localTransform
    const modelTransform = itemSnapshot.modelTransform

    return this.createCompositionItem(itemId, modelId, placementConfig, boundToId, boundToType, localTransform,
      modelTransform)
  }

  private createCompositionItem(itemId: string, modelId: string, placementFlags: PlacementFlags,
    boundToId: string, boundToType: RefinedParentType, rootLocalTransform: THREE.Matrix4,
    modelTransform: THREE.Matrix4) {
    if (!this.floorPlane) {
      return undefined
    }

    const gltf = this.modelManager.getLoadedModelByUuidOrUrl(modelId)
    if (!gltf) {
      return undefined
    }

    let parentNode: THREE.Object3D | null = null
    switch(boundToType) {
      case 'floor':
      case 'wall':
        parentNode = this.comspositionSurfaces.get(boundToId)?.node ?? null
        break
      case 'item':
        parentNode = this.rootNodes.get(boundToId) ?? null
        break
      default:
        break
    }
    if (!parentNode) {
      return undefined
    }

    const rootNode = new THREE.Group()
    rootNode.name = `item-root-${itemId}`
    rootNode.userData.isItemRoot = true
    rootNode.userData.itemId = itemId
    this.rootNodes.set(itemId, rootNode)
    parentNode.add(rootNode)

    gltf.matrix.copy(modelTransform)
    gltf.matrix.decompose(gltf.position, gltf.quaternion, gltf.scale)

    const bbox = new THREE.Box3().setFromObject(gltf)
    const size = bbox.getSize(new THREE.Vector3())

    rootNode.matrix.copy(rootLocalTransform)
    rootNode.matrix.decompose(rootNode.position, rootNode.quaternion, rootNode.scale)
    rootNode.add(gltf)
    gltf.updateMatrixWorld()
    const placementConfig = {
      ...placementFlags,
      targetSizeX: size.x,
      targetSizeY: size.y,
      targetSizeZ: size.z,
    }
    const placementParams = {
      placementConfig,
      boundToId,
      boundToType,
    }
    const newItem = new CompositionItem(itemId, modelId, rootNode, bbox, modelTransform, placementParams,
      this.floorPlane, this.scene)
    this.items.set(itemId, newItem)
    this.scene.initCompositionItem(newItem)
    newItem.addEventListener(plannerConstants.EVENT_ITEM_SURFACE_SWITCHED,
      evt => this.onItemSurfaceSwitch(evt.uniqueId, evt.toSurfaceId))

    return {
      uuid: rootNode.uuid,
      item: newItem,
    }
  }
}