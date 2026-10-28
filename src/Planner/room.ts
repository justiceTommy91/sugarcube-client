import * as THREE from 'three'

import { WasmInterop } from '@geomagical/sugarcube-shared'

import { DEG_TO_RAD, EPSILON } from 'Renderer/geometry'

import { RoomScene } from 'Planner/rendering/room_scene'
import { RoomMesh } from 'Planner/rendering/room_mesh'
import { Composition } from 'Planner/composition/composition'

import { worldToPlane, planeToWorld, projectPointOnPlane } from 'Planner/room_geometry'
import { type Wall, type WallElement, WallsGraph, WallVertex } from 'Planner/editor/walls_graph'
import { SnapSystem } from 'Planner/editor/snap_system'
import type { SnapLine } from 'Planner/editor/snap_rules'
import { RoomUserProps } from 'Planner/room_user_props'
import type {
  WallInfo,
  WallElementInfo,
  ColorMap,
  MaybeVector3,
  PlannerSettings,
  WallElementAxisDraggingState,
  CompositionItemInfo,
  Corners8,
  VertexInfo,
  WallsGraphMutationResult,
} from 'Planner/planner_types'
import type { RoomTemplate } from 'Planner/room_template/room_template'
import type { TemplateWallElementType } from 'Planner/room_template/room_template_types'
import type {
  CameraViewName,
  WallElementSizeMetadata,
  WallElementSize,
  CompositionFurnitureItem,
  DeleteVertexResult,
  InteractableItemType,
  CollisionResolutionResult,
} from 'Planner/api_types'

import type { PlaneType, SurfaceClass } from 'Renderer/geomviewer/geom_types'
import type { MaterialManager } from 'Planner/rendering/material_manager'
import type { GltfModelManager } from 'Planner/rendering/model_manager'
import {
  EVENT_ITEM_SURFACE_SWITCHED,
  MUTATION_FAIL_REASON_UNKNOWN,
  MUTATION_FAIL_REASON_WALL_MIN_LENGTH,
  MUTATION_FAIL_REASON_WALL_ELEMENTS,
  WALLS_GRAPH_MIN_WALL_LENGTH,
} from 'Planner/planner_constants'
import { RoomSampler } from 'Planner/room_sampler'
import type { CompositionItem } from 'Planner/composition/composition_item'
import { WallElementObject } from 'Planner/rendering/wall_element_object'
import { OBJECT_TYPE_COMPOSITION_ITEM, OBJECT_TYPE_WALL_ELEMENT } from 'Planner/api_constants'

export type CameraView = {
  name: CameraViewName
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  up: THREE.Vector3
  fov: number
}

const defaultFloorPlane: PlaneType = {
  id: 0,
  d: 0,
  rot: [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  class: `floor`,
}
const defaultCeilingPlane: PlaneType = {
  id: 1,
  d: 0,
  rot: [
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ],
  class: `ceiling`,
}

const line2DToWorld = (line: SnapLine, plane: PlaneType) => ({
  p1: planeToWorld(plane, new THREE.Vector2(line.p1.x, -line.p1.y)),
  p2: planeToWorld(plane, new THREE.Vector2(line.p2.x, -line.p2.y)),
})

const CONTINUOUS_WALL_MOVEMENT_STEP = 0.01 // In meters.

const INLINE_WALLS_RESULT_NOOP = 0
const INLINE_WALLS_RESULT_SUCCESS = 1
const INLINE_WALLS_RESULT_FAIL = 2
type InlineWallMoveResult = typeof INLINE_WALLS_RESULT_NOOP |
  typeof INLINE_WALLS_RESULT_SUCCESS |
  typeof INLINE_WALLS_RESULT_FAIL

export class Room {
  private scene: RoomScene
  private composition: Composition
  private materialManager: MaterialManager
  private modelManager: GltfModelManager
  private wallsGraph: WallsGraph | null = null
  private floorPlane: PlaneType | undefined
  private ceilingPlane: PlaneType | undefined
  private roomMesh: RoomMesh | null = null
  private roomSampler: RoomSampler
  private roomHeight = 0.0
  private userProps = new RoomUserProps()
  private snapSystem = new SnapSystem()

  constructor(settings: PlannerSettings, materialManager: MaterialManager, modelManager: GltfModelManager) {
    this.onCompositionItemSurfaceSwitch = this.onCompositionItemSurfaceSwitch.bind(this)

    this.materialManager = materialManager
    this.modelManager = modelManager
    this.scene = new RoomScene(settings)
    this.composition = new Composition(this.scene, this.modelManager)
    this.roomSampler = new RoomSampler(this)
  }

  public getScene() {
    return this.scene
  }

  public getRoomMesh() {
    return this.roomMesh
  }

  public getWallsGraph() {
    return this.wallsGraph
  }

  public getComposition() {
    return this.composition
  }

  public getSampler() {
    return this.roomSampler
  }

  public getFloorMaterialUuid() {
    return this.userProps.getFloorMaterialUuid()
  }

  public getCeilingMaterialUuid() {
    return this.userProps.getCeilingMaterialUuid()
  }

  public getWallsMaterialUuid() {
    return this.userProps.getWallsMaterialUuid()
  }

  public getWallsColor() {
    return this.userProps.getWallsColor()
  }

  public getFloorMaterial() {
    return this.materialManager.getLoadedMaterialByUuid(this.getFloorMaterialUuid())
  }

  public getCeilingMaterial() {
    return this.materialManager.getMaterialByUuid(this.getCeilingMaterialUuid())
  }

  public getWallsMaterial() {
    return this.materialManager.getLoadedMaterialByUuid(this.getWallsMaterialUuid())
  }

  public getWallElementAsset(elementId: string) {
    return this.userProps.getWallElementAsset(elementId)
  }

  public getFloorPlane() {
    return this.floorPlane
  }

  public getCeilingPlane() {
    return this.ceilingPlane
  }

  public getWallPlane(id: string) {
    return this.roomMesh?.getWallPlane(id)
  }

  public getRoomHeight() {
    return this.roomHeight
  }

  public applySettings(settings: PlannerSettings) {
    this.scene.applySettings(settings)
    this.wallsGraph?.applySettings(settings)
  }

  public initializeFromJson(wasmInterop: WasmInterop, template: RoomTemplate, floorId?: number, ceilingId?: number) {
    this.roomHeight = template.ceiling.height || 0.0
    this.floorPlane = { ...defaultFloorPlane }
    this.ceilingPlane = { ...defaultCeilingPlane }
    this.ceilingPlane.d = this.roomHeight

    this.loadInitialUserProps(template)

    const wallsCount = template.walls.length
    this.floorPlane.id = floorId !== undefined ? floorId : wallsCount // Wall indexes are 0 based.
    this.ceilingPlane.id = ceilingId !== undefined ? ceilingId : this.floorPlane.id + 1

    const reservedSurfaceIds = new Set([String(this.floorPlane.id), String(this.ceilingPlane.id)])
    this.wallsGraph = new WallsGraph(wasmInterop, template, reservedSurfaceIds)
    this.snapSystem.initialize(this.wallsGraph)
    this.roomMesh = new RoomMesh(this, this.wallsGraph, this.floorPlane, this.ceilingPlane)
    this.scene.initFromTemplate(wasmInterop, this.roomMesh, this.wallsGraph, this.ceilingPlane, template)
    this.initializeComposition()
  }

  private initializeComposition() {
    if (!this.floorPlane || !this.wallsGraph || !this.roomMesh) {
      return
    }
    this.composition.initialize(this.floorPlane, this.wallsGraph, this.roomMesh)
  }

  private loadInitialUserProps(template: RoomTemplate) {
    const floorMaterialInfo = template.assets[template.floor?.asset || 0]
    this.userProps.storeFloorMaterialUuid(floorMaterialInfo?.uuid || '')

    const ceilingMaterialInfo = template.assets[template.ceiling?.asset || 0]
    this.userProps.storeCeilingMaterialUuid(ceilingMaterialInfo?.uuid || '')

    // Assuming here that all walls have the same material and color.
    const wallsMaterialInfo = template.assets[template.walls[0]?.asset || 0]
    this.userProps.storeWallsMaterialUuid(wallsMaterialInfo?.uuid || '')

    const wallsColor = template.walls[0]?.color
    if (wallsColor) {
      this.userProps.storeWallsColor(wallsColor.r, wallsColor.g, wallsColor.b)
    }
  }

  public setSnapModeEnabled(enabled: boolean) {
    this.wallsGraph?.setSnapModeEnabled(enabled)
  }

  public setWallLength(wallId: string, newLength: number) {
    if (!this.wallsGraph) {
      return
    }
    const wall = this.wallsGraph.getWallById(wallId)
    if (!wall) {
      return
    }
    let distanceLeft = newLength - this.wallsGraph.getWallLength(wall)
    const originalSign = Math.sign(distanceLeft)
    distanceLeft = Math.abs(distanceLeft)
    while(distanceLeft > 0) {
      const step = Math.min(distanceLeft, CONTINUOUS_WALL_MOVEMENT_STEP)
      const currentLength = this.wallsGraph.getWallLength(wall)

      this.wallsGraph.createSnapshot()
      this.wallsGraph.setWallLength(wallId, currentLength + originalSign * step)

      const stepResult = this.onWallGraphChangeStep()
      if (!stepResult.success) {
        this.wallsGraph.restoreSnapshot()
        break
      }
      distanceLeft -= step
    }

    this.onWallGraphChangeStep()
    this.wallsGraph.clearSnapshot()
    this.onWallGraphChangeCompleted()
  }

  public testSplitWall(wallId: string, distance: number) {
    if (!this.wallsGraph) {
      return false
    }
    return this.wallsGraph.testSplitWall(wallId, distance)
  }

  public splitWall(wallId: string, distance: number) {
    if (!this.wallsGraph) {
      return null
    }
    const wall = this.wallsGraph.getWallById(wallId)
    if (!wall) {
      return null
    }
    const wallLength = this.wallsGraph.getWallLength(wall)
    const splitResult = this.wallsGraph.splitWall(wallId, distance)
    if (splitResult && this.roomMesh) {
      this.roomMesh.syncWithWallsGraph()

      const wallMesh = this.roomMesh.getWallMesh(wallId)
      const newWallMesh = this.roomMesh.getWallMesh(splitResult.newWallId)
      if (wallMesh && newWallMesh) {
        const worldDistance = wallLength * distance
        this.composition.onWallSplit(wallId, splitResult.newWallId, wallMesh, newWallMesh, worldDistance)
      }

      // Walls graph copies min length from existing wall to the new wall, we need to update it to actual value.
      // Note that the new wall may be empty, so onCompositionItemSurfaceSwitch won't be called
      // for it from this.composition.onWallSplit.
      const minLength = this.composition.getWallLengthLimit(splitResult.newWallId)
      this.wallsGraph.setWallMinLength(splitResult.newWallId, minLength)

      this.scene.refreshGraphView(this.wallsGraph)
      this.scene.setIsDirty(true)
    }
    return splitResult
  }

  public getAutoSplitDistance(wallId: string): number | undefined {
    if (!this.wallsGraph) {
      return undefined
    }
    return this.wallsGraph.getAutoSplitDistance(wallId)
  }

  public testDeleteVertex(vertexId: string): boolean {
    if (!this.wallsGraph) {
      return false
    }
    return this.wallsGraph.testDeleteVertex(vertexId)
  }

  public deleteVertex(vertexId: string): DeleteVertexResult {
    if (!this.wallsGraph || !this.floorPlane || !this.roomMesh) {
      return { success: false }
    }

    const minWallCount = 3
    if (this.wallsGraph.getWalls().size <= minWallCount) {
      return { success: false }
    }

    // Before actually deleting the vertex, first, we gradually move it to make both adjacent walls
    // lay in a straight line, to push out the furniture, or fail, if in can't be pushed out.
    const [neighbor1Pos, neighbor2Pos] = this.wallsGraph.getVertexNeighborVertices(vertexId)
      .map(vert => vert && this.wallsGraph?.getVertexPosition(vert.id))
    const initialVertexPos = this.wallsGraph.getVertexPosition(vertexId)
    if (!neighbor1Pos || !neighbor2Pos) {
      return { success: false }
    }
    const middlePoint = neighbor1Pos.clone().add(new THREE.Vector2().subVectors(neighbor2Pos, neighbor1Pos)
      .multiplyScalar(0.5))
    const moveDelta = new THREE.Vector2().subVectors(middlePoint, initialVertexPos)
    // We need the updated roomMesh to properly update wall items on each step.
    // Ideally, we need to optimize it and be able to properly position wall items independently.
    this.createSnapshot()
    const wallsGraph = this.wallsGraph
    const roomMesh = this.roomMesh

    let isInline = this.wallsGraph.isVertexInLine(vertexId)
    let result: DeleteVertexResult = { success: isInline }
    if (!isInline) {
      // Treat "displacement" here as a virtual mouse pointer.
      const virtualMousePos = initialVertexPos.clone()
      result = this.mutateWallGraphGradually(vertexId, moveDelta, (id, displacement) => {
        virtualMousePos.add(displacement)
        const from2d = wallsGraph.getVertexPosition(vertexId)
        const stepDelta = new THREE.Vector2().subVectors(virtualMousePos, from2d)
        const movementResult = wallsGraph.moveVertex(id, stepDelta, 0.0)
        if (movementResult.success) {
          roomMesh.syncWithWallsGraph()
        }
        return movementResult
      }, true)

      // The result of gradual mutation might be inconclusive and indicate partial movement even when successful.
      // Check if the vertex actually moved where we want it to be (both walls for a near straight line)
      isInline = this.wallsGraph.isVertexInLine(vertexId)
      if (!isInline) {
        this.restoreSnapshot()
        this.onWallGraphChangeCompleted()
        result.success = false
      }

      // This is needed to sync wall items transforms after vertex movement.
      this.roomMesh.syncWithWallsGraph()
      this.composition.resolveCollisions(this.floorPlane, this.wallsGraph)

      if (!result.success) {
        return result
      }
    }

    const wallsInfo = this.wallsGraph.deleteVertex(vertexId)
    if (!wallsInfo) {
      return { success: false }
    }

    this.roomMesh.syncWithWallsGraph()
    this.composition.onWallDeleted(wallsInfo.retainedWallId, wallsInfo.deletedWallId)

    this.scene.refreshGraphView(this.wallsGraph)
    this.scene.setIsDirty(true)

    return { success: true, ...wallsInfo }
  }

  public getAllWallsInformation(): WallInfo[] {
    const ret: WallInfo[] = []
    if (!this.wallsGraph) {
      return ret
    }
    this.wallsGraph.getWalls().forEach((wall) => {
      const wallInfo = this.prepareWallInfo(wall)
      if (!wallInfo) {
        return
      }
      ret.push(wallInfo)
    })
    return ret
  }

  public getWallInformation(wallId: string): WallInfo | undefined {
    if (!this.wallsGraph) {
      return undefined
    }
    const wall = this.wallsGraph.getWallById(wallId)
    if (!wall) {
      return undefined
    }
    return this.prepareWallInfo(wall)
  }

  public getAllVerticesInformation(): VertexInfo[] {
    const ret: VertexInfo[] = []
    if (!this.wallsGraph) {
      return ret
    }
    for (const id of this.wallsGraph.getVertices().keys()) {
      const vertexInfo = this.prepareVertexInfo(id)
      if (vertexInfo) {
       ret.push(vertexInfo)
      }
    }
    return ret
  }

  public getVertexInformation(vertexId: string): VertexInfo | undefined {
    return this.prepareVertexInfo(vertexId)
  }

  public getAllWallElementsInformation(): WallElementInfo[] {
    const ret: WallElementInfo[] = []
    if (!this.wallsGraph) {
      return ret
    }
    this.wallsGraph.getWallElements().forEach((element) => {
      const elementInfo = this.prepareWallElementInfo(element)
      if (!elementInfo) {
        return
      }
      ret.push(elementInfo)
    })
    return ret
  }

  public getWallElementInformation(elementId: string): WallElementInfo | undefined {
    const wallElement = this.wallsGraph?.getWallElementByGlobalId(elementId)
    if (!wallElement) {
      return undefined
    }
    return this.prepareWallElementInfo(wallElement)
  }

  public getCompositionItemsInfo(): CompositionItemInfo[] {
    const itemIds = [...this.composition.getItems().keys()]
    return itemIds.map(itemId => this.getCompositionItemInfo(itemId))
      .filter((info): info is CompositionItemInfo => !!info)
  }

  public getCompositionItemInfo(itemId: string): CompositionItemInfo | undefined {
    const compositionItem = this.composition.getItem(itemId)
    if (!compositionItem) {
      return undefined
    }
    return Room.prepareCommpositionItemInfo(compositionItem)
  }

  private prepareWallInfo(wall: Wall): WallInfo | undefined {
    if (!this.wallsGraph) {
      return undefined
    }

    const vertex1Pos = this.wallsGraph.getVertexPosition(wall.vertexIds[0])
    const vertex2Pos = this.wallsGraph.getVertexPosition(wall.vertexIds[1])
    if (!vertex1Pos || !vertex2Pos) {
      return undefined
    }
    // Since graph vertices are in floor space, we want to negate X axis, as ceiling coordinate space mirrors the floor.
    const vertex1World = this.ceilingPlane && planeToWorld(this.ceilingPlane,
      new THREE.Vector2(vertex1Pos.x, -vertex1Pos.y))
    const vertex2World = this.ceilingPlane && planeToWorld(this.ceilingPlane,
      new THREE.Vector2(vertex2Pos.x, -vertex2Pos.y))
    if (!vertex1World || !vertex2World) {
      return undefined
    }
    const neighbors = this.wallsGraph.getWallNeighborWalls(wall.id)
      .filter((w): w is Wall => !!w)
      .map(w => w.id)
    if (neighbors.length !== 2) {
      return undefined
    }

    return {
      id: wall.id,
      originalLength: wall.originalLength,
      length: this.wallsGraph.getWallLength(wall) || 0.0,
      color: new THREE.Color(wall.uiColor).getHexString(),
      vertex1Pos: vertex1World,
      vertex2Pos: vertex2World,
      vertex1Id: wall.vertexIds[0],
      vertex2Id: wall.vertexIds[1],
      neighborWallIds: [neighbors[0], neighbors[1]],
    }
  }

  private prepareVertexInfo(vertexId: string): VertexInfo | undefined {
    if (!this.wallsGraph) {
      return undefined
    }
    const vertex2DPos = this.wallsGraph.getVertexPosition(vertexId)
    const vertexWorldPos = this.ceilingPlane && planeToWorld(this.ceilingPlane,
      new THREE.Vector2(vertex2DPos.x, -vertex2DPos.y))
    if (!vertexWorldPos) {
       return undefined
    }
    const vertex = this.wallsGraph.getVertexById(vertexId)
    if (!vertex) {
      return undefined
    }
    const neighbors = this.wallsGraph.getVertexNeighborVertices(vertexId)
      .filter((v): v is WallVertex => !!v)
      .map(v => v.id)
    if (neighbors.length !== 2) {
      return undefined
    }

    return {
      id: vertexId,
      position: vertexWorldPos,
      wallIds: [vertex.wallIds[0], vertex.wallIds[1]],
      neighborVertexIds: [neighbors[0], neighbors[1]]
    }
  }

  private prepareWallElementInfo(wallElement: WallElement): WallElementInfo | undefined {
    if (!this.wallsGraph || !this.roomMesh || !wallElement || !this.floorPlane) {
      return undefined
    }
    const wall = this.wallsGraph.getWallById(wallElement.wallId)
    const elementObject = this.roomMesh.getWallElementVisualObject(wallElement.id)
    if (!elementObject || !wall) {
      return undefined
    }

    const wallsGraph = this.wallsGraph
    const [vertex1, vertex2] = wall.vertexIds.map(id => wallsGraph.getVertexById(id))
    if (!vertex1 || !vertex2) {
      return undefined
    }

    const centerWorldPos = elementObject.getWorldPosition(new THREE.Vector3())

    const up = new THREE.Vector3().setFromMatrixColumn(elementObject.matrixWorld, 1)
    const right = new THREE.Vector3().setFromMatrixColumn(elementObject.matrixWorld, 0)

    const upExtent = up.clone().multiplyScalar(0.5 * wallElement.size.y)
    const downExtent = up.clone().multiplyScalar(0.5 * wallElement.size.y).negate()
    const leftExtent = right.clone().multiplyScalar(0.5 * wallElement.size.x).negate()
    const rightExtent = right.clone().multiplyScalar(0.5 * wallElement.size.x)

    const corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
      new THREE.Vector3().addVectors(centerWorldPos, leftExtent).add(downExtent),
      new THREE.Vector3().addVectors(centerWorldPos, leftExtent).add(upExtent),
      new THREE.Vector3().addVectors(centerWorldPos, rightExtent).add(upExtent),
      new THREE.Vector3().addVectors(centerWorldPos, rightExtent).add(downExtent),
    ]
    const upRay = new THREE.Ray(centerWorldPos, up.clone())
    const downRay = new THREE.Ray(centerWorldPos, up.clone().negate())

    const leftIntersection = planeToWorld(this.floorPlane, this.wallsGraph.getVertexPosition(vertex1.id))
    leftIntersection.y = centerWorldPos.y
    const rightIntersection = planeToWorld(this.floorPlane, this.wallsGraph.getVertexPosition(vertex2.id))
    rightIntersection.y = centerWorldPos.y

    const roomIntersections: [MaybeVector3, MaybeVector3, MaybeVector3, MaybeVector3] = [
      this.sampleCeilingPlane(upRay),
      this.sampleFloorPlane(downRay),
      leftIntersection,
      rightIntersection,
    ]

    const sizeMetadata = this.userProps.getWallElementSizeMetadata(wallElement.id)

    return {
      elementId: wallElement.id,
      currentSize: wallElement.size.clone(),
      sizeMetadata,
      wallId: wallElement.wallId,
      class: wallElement.class,
      assetUuid: elementObject.userData.assetUuid,
      centerWorldPos,
      corners,
      roomIntersections,
    }
  }

  private static prepareCommpositionItemInfo(compositionItem: CompositionItem): CompositionItemInfo {
    const worldPosition = compositionItem.getPosAbsolute()
    const size = compositionItem.getSize()
    const halfX = 0.5 * size.x
    const halfZ = 0.5 * size.z
    const corners: Corners8 = [
      compositionItem.localToWorld({ x: -halfX, y: 0, z:  halfZ }),
      compositionItem.localToWorld({ x:  halfX, y: 0, z:  halfZ }),
      compositionItem.localToWorld({ x:  halfX, y: 0, z: -halfZ }),
      compositionItem.localToWorld({ x: -halfX, y: 0, z: -halfZ }),
      compositionItem.localToWorld({ x: -halfX, y: size.y, z:  halfZ }),
      compositionItem.localToWorld({ x:  halfX, y: size.y, z:  halfZ }),
      compositionItem.localToWorld({ x:  halfX, y: size.y, z: -halfZ }),
      compositionItem.localToWorld({ x: -halfX, y: size.y, z: -halfZ }),
    ]
    return {
      itemId: compositionItem.getId(),
      worldPosition: new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z),
      corners,
    }
  }

  public setFloorMaterial(assetUuid: string) {
    const material = this.materialManager.getLoadedMaterialByUuid(assetUuid)
    if (material && this.roomMesh) {
      this.roomMesh.setFloorMaterial(material)
      this.scene.setIsDirty(true)
    }
    this.userProps.storeFloorMaterialUuid(assetUuid)
  }

  public setWallColor(wallId: string, rgb255: [number, number, number]) {
    if (!this.roomMesh) {
      return
    }
    this.roomMesh.setWallColor(wallId, rgb255)
    this.scene.setIsDirty(true)
  }

  public setAllWallsColor(rgb255: [number, number, number]) {
    if (this.roomMesh) {
      this.roomMesh.setAllWallsColor(rgb255)
      this.scene.refreshLights()
      this.scene.setIsDirty(true)
    }
    this.userProps.storeWallsColor(rgb255[0], rgb255[1], rgb255[2])
  }

  public setGraphViewVisible(visible: boolean) {
    this.scene.setGraphViewVisible(visible)
  }

  public setWallGraphColors(colors: ColorMap) {
    if (!this.wallsGraph) {
      return
    }
    this.wallsGraph.setWallColors(colors)
    this.scene.refreshGraphView(this.wallsGraph)
  }

  public setWallGraphColor(rgb255: [number, number, number]) {
    if (!this.wallsGraph) {
      return
    }
    this.wallsGraph.setWallGraphColor(rgb255)
    this.scene.refreshGraphView(this.wallsGraph)
  }

  public enableWallsDoubleSide(enable: boolean) {
    this.scene.enableWallsDoubleSide(enable)
  }

  public sampleCompositionItem(ray: THREE.Ray) {
    return this.roomSampler.sampleCompositionItem(ray)
  }

  public sampleScene(ray: THREE.Ray) {
    return this.roomSampler.sampleSceneNearest(ray)
  }

  public sampleWallMeshes(ray: THREE.Ray) {
    return this.roomSampler.sampleWallMeshes(ray)
  }

  public sampleWallPlane(ray: THREE.Ray, wallId: string, clamp = false,
    bidirectional = true): THREE.Vector3 | undefined {
    return this.roomSampler.sampleWallPlane(ray, wallId, clamp, bidirectional)
  }

  public sampleFloorPlane(ray: THREE.Ray, bidirectional = true) {
    return this.roomSampler.sampleFloorPlane(ray, bidirectional)
  }

  public sampleCeilingPlane(ray: THREE.Ray, bidirectional = true) {
    return this.roomSampler.sampleCeilingPlane(ray, bidirectional)
  }

  public projectPointOnWall(point: THREE.Vector3, wallId: string) {
    const plane = this.roomMesh?.getWallPlane(wallId)
    if (!plane) {
      return point
    }
    return projectPointOnPlane(point, plane)
  }

  public transformWallElementWorldPointToPlane(worldPoint: THREE.Vector3, elementId: string,
                                          destinationWallId?: string) {
    if (!this.roomMesh || !this.wallsGraph) {
      return undefined
    }
    const wallElementInfo = this.getWallElementInformation(elementId)
    if (!wallElementInfo) {
      return undefined
    }
    const wallPlane = this.roomMesh.getWallPlane(destinationWallId ?? wallElementInfo.wallId)
    const wallMesh = this.roomMesh.getWallMesh(destinationWallId ?? wallElementInfo.wallId)
    if (!wallPlane || !wallMesh) {
      return undefined
    }
    const dragFromGrabPoint = worldToPlane(wallPlane, worldPoint)
    dragFromGrabPoint.x -= wallMesh.userData.originX
    dragFromGrabPoint.y -= wallMesh.userData.originY

    return new THREE.Vector2(dragFromGrabPoint.x, dragFromGrabPoint.y)
  }

  // Move a wall or a vertex from point to point with small increments, pushing out composition items,
  // and stop the operation when there's an item which collision can't be resolved.
  // If acceptPartialMutation is true, the operation will stop when finished, or unresolvable collision encountered,
  // leaving the room in the state reached at that moment. If acceptPartialMutation is false, then the new state will
  // be accepted only after success of the whole movement, otherwise it will be reverted to the original state.
  private mutateWallGraphGradually(entityId: string, moveDelta: THREE.Vector2,
    mutationFunc: (id: string, displacement: THREE.Vector2) => WallsGraphMutationResult,
    manualSnapshot = false): CollisionResolutionResult {

    if (!this.wallsGraph) {
      return { success: false }
    }

    let obstacleType: InteractableItemType | undefined = undefined
    let obstacleItemsIds: string[] | undefined = undefined

    const moveDirection = moveDelta.clone().normalize()
    const length = moveDelta.length()
    let distanceLeft = length
    let totalSuccess = true
    const kreativCoreSdkMinMovement = EPSILON * 10.0
    while(distanceLeft > kreativCoreSdkMinMovement) {
      const step = Math.min(distanceLeft, CONTINUOUS_WALL_MOVEMENT_STEP)
      const movement = moveDirection.clone().multiplyScalar(step)
      if (!manualSnapshot) {
        this.createSnapshot()
      }
      const stepResult = mutationFunc(entityId, new THREE.Vector2(movement.x, movement.y))
      const collisionResult = this.onWallGraphChangeStep()

      if (!stepResult.success || !collisionResult.success) {
        const obstacles = this.collectObstacleItems(stepResult, collisionResult)
        obstacleType = obstacles.type
        obstacleItemsIds = obstacles.obstacleItemsIds
        totalSuccess = false
        if (!manualSnapshot) {
          this.restoreSnapshot()
        }
        break
      }
      distanceLeft -= step
    }
    this.onWallGraphChangeStep()
    this.onWallGraphChangeCompleted()

    return { success: totalSuccess, obstacleType, obstacleItemsIds }
  }

  private createSnapshot() {
    if (this.wallsGraph) {
      this.wallsGraph.createSnapshot()
    }
    this.composition.createSnapshot()
  }

  private restoreSnapshot() {
    if (this.wallsGraph) {
      this.wallsGraph.restoreSnapshot()
    }
    this.composition.restoreSnaphot()
  }

  public dragWallToPoint(wallId: string, toWorldPoint: THREE.Vector3): CollisionResolutionResult {
    if (!this.wallsGraph || !this.ceilingPlane || !this.floorPlane) {
      return { success: false }
    }
    const wall = this.wallsGraph.getWallById(wallId)
    if (!wall) {
      return { success: false }
    }
    const wallDirNormalized = this.wallsGraph.getWallDirection(wall).normalize()
    const pointOnWall = this.wallsGraph.getVertexPosition(wall.vertexIds[0])
    const toPointFloorSpace = worldToPlane(this.floorPlane, toWorldPoint)
    const toPointFloorSpace2d = new THREE.Vector2(toPointFloorSpace.x, toPointFloorSpace.y)
    const vertexToDest = toPointFloorSpace2d.clone().sub(pointOnWall)
    const t = vertexToDest.dot(wallDirNormalized)
    const closestPoint = pointOnWall.clone().add(wallDirNormalized.clone().multiplyScalar(t))
    const normalMovement = toPointFloorSpace2d.sub(closestPoint)
    const deltaWithSnap = this.snapSystem.snapWallMovement(wallId, normalMovement)

    const inlineHandleResult = this.handleInlineWallMovement(wallId, deltaWithSnap)
    if (inlineHandleResult !== INLINE_WALLS_RESULT_NOOP) {
      return { success: inlineHandleResult === INLINE_WALLS_RESULT_SUCCESS }
    }

    const wallsGraph = this.wallsGraph
    const result = this.mutateWallGraphGradually(wallId, deltaWithSnap, (id: string, displacement: THREE.Vector2) => {
      const success = wallsGraph.moveWall(id, displacement)
      return success ? { success } : { success, reason: MUTATION_FAIL_REASON_UNKNOWN }
    })
    return { ...result }
  }

  public dragVertexToPoint(vertexId: string, toPoint: THREE.Vector3): CollisionResolutionResult {
    if (!this.wallsGraph || !this.floorPlane) {
      return { success: false }
    }
    const toPointFloorSpace = worldToPlane(this.floorPlane, toPoint)
    const from2d = this.wallsGraph.getVertexPosition(vertexId)
    const to2d = new THREE.Vector2(toPointFloorSpace.x, toPointFloorSpace.y)
    const moveDelta = new THREE.Vector2().subVectors(to2d, from2d)
    const deltaWithSnap = this.snapSystem.snapVertexMovement(vertexId, moveDelta)
    return this.mutateWallGraphGradually(vertexId, deltaWithSnap, this.wallsGraph.moveVertex.bind(this.wallsGraph))
  }

  public getVertexSnapState(vertexId: string) {
    const snapState = this.snapSystem.getVertexSnapState(vertexId)
    if (snapState && this.ceilingPlane) {
      const plane = this.ceilingPlane
      const lines = snapState.lines.map(line => line2DToWorld(line, plane))
      const anglePairs = snapState.anglePairs.map(pair => ({
        line1: line2DToWorld(pair.line1, plane),
        line2: line2DToWorld(pair.line2, plane),
        isOnVertex: pair.isOnVertex,
      }))
      const parallelPairs = snapState.parallelPairs.map(pair => ({
        line1: line2DToWorld(pair.line1, plane),
        line2: line2DToWorld(pair.line2, plane),
      }))
      return {
        lines,
        anglePairs,
        parallelPairs,
      }
    }
    return undefined
  }

  public getWallSnapState(wallId: string) {
    if (!this.ceilingPlane) {
      return []
    }
    const lines = this.snapSystem.getWallSnapState(wallId)
    const plane = this.ceilingPlane
    return lines.map(line => line2DToWorld(line, plane))
  }

  public dragWallElementTo(WallElementID: string, destinationWallId: string, positionTo: THREE.Vector2) {
    if (!this.wallsGraph) {
      return
    }

    this.wallsGraph.setWallElementPosition(WallElementID, destinationWallId, positionTo)

    this.scene.refreshGraphView(this.wallsGraph)

    const elementInfo = this.getWallElementInformation(WallElementID)
    if (elementInfo) {
      this.scene.refreshWallElementMeasurements(elementInfo)
    }
  }

  public deleteWallElement(elementId: string) {
    if (this.wallsGraph) {
      this.wallsGraph.deleteWallElement(elementId)
      this.scene.refreshGraphView(this.wallsGraph)
    }
    this.userProps.deleteWallElementData(elementId)
  }

  public deleteCompositionItem(itemId: string) {
    const item = this.composition.getItem(itemId)
    if (!item) {
      return
    }
    const boundToType = item.getBoundToType()
    const boundToId = item.getBoundToId()
    this.composition.deleteItem(itemId)
    if (this.wallsGraph && boundToType === `wall`) {
      const minLength = this.composition.getWallLengthLimit(boundToId)
      this.wallsGraph.setWallMinLength(boundToId, minLength)
    }
  }

  public isWallBackFacing(wallId: string, cameraPosition: THREE.Vector3): boolean {
    const wallMesh = this.roomMesh?.getWallMesh(wallId)
    if (!wallMesh) {
      return false
    }
    return this.scene.isWallMeshBackFacing(wallMesh, cameraPosition)
  }

  public setMeasurementsVisibility(elementId: string | null,
                                   vertical: WallElementAxisDraggingState,
                                   horizontal: WallElementAxisDraggingState) {
    this.scene.setMeasurementsVisibility(vertical, horizontal)

    const wallElementInfo = elementId ? this.getWallElementInformation(elementId) : null
    if (wallElementInfo) {
      this.scene.refreshWallElementMeasurements(wallElementInfo)
    }
  }

  private getWallElementYPos(type: SurfaceClass, elementHeight: number) {
    let ret = 0.0
    switch(type) {
      case `window`:
        ret = this.roomHeight * 0.5
        break
      case `door`:
        ret = elementHeight * 0.5
        break
      default:
        break
    }
    return ret
  }

  public addWallElement(assetUuid: string, type: TemplateWallElementType, cameraPosition?: THREE.Vector3,
    sizeOverride?: WallElementSize): string | undefined {
    const wallsGraph = this.wallsGraph
    const object = this.modelManager.getLoadedModelByUuidOrUrl(assetUuid)
    if (!wallsGraph || !this.roomMesh || !object) {
      return undefined
    }
    const walls: Wall[] = [...wallsGraph.getWalls().values()]
    if (cameraPosition) {
      walls.sort((w1, w2) => {
        const b1 = this.isWallBackFacing(w1.id, cameraPosition)
        const b2 = this.isWallBackFacing(w2.id, cameraPosition)
        if (b1 === b2) {
          return 0
        }
        return b1 ? 1 : -1
      })
    }
    const boxSize = new THREE.Box3().expandByObject(object).getSize(new THREE.Vector3())
    const size = new THREE.Vector2(Math.max(boxSize.x, boxSize.z), boxSize.y)

    const candidatePositions = walls.map((wall) => ({
      wallId: wall.id,
      positions: wallsGraph.collectElementPlacementPositions(wall.id),
    })).flatMap(candidate =>
      candidate.positions.map(position => ({
        wallId: candidate.wallId,
        position
      }))
    )

    let foundPosition = false
    let wallId: string | undefined
    let position: THREE.Vector2 | undefined
    for (let i = 0; i < candidatePositions.length; i += 1) {
      const info = candidatePositions[i]
      position = new THREE.Vector2(info.position, this.getWallElementYPos(type, size.y))
      foundPosition = wallsGraph.testAddWallElement(info.wallId, position, size)
      if (foundPosition) {
        wallId = info.wallId
        break
      }
    }
    if (!foundPosition || !wallId || !position) {
      return undefined
    }
    return this.createWallElement(assetUuid, wallId, position, size, type, sizeOverride)
  }

  public createWallElement(assetUuid: string, wallId: string, position: THREE.Vector2,
    size: THREE.Vector2, type: TemplateWallElementType, sizeOverride?: WallElementSize) {
    const object = this.modelManager.getLoadedModelByUuidOrUrl(assetUuid)
    if (!this.wallsGraph || !this.roomMesh || !object) {
      return undefined
    }
    const elementId = this.wallsGraph.addWallElement(wallId, position, size, type)
    if (elementId) {
      const wallElement = new WallElementObject(elementId, type, object, this.scene)
      this.roomMesh.setWallElementObject(elementId, wallElement)
      if (sizeOverride) {
        this.setWallElementSize(elementId, size, sizeOverride.metadata)
      }
      this.scene.refreshGraphView(this.wallsGraph)
      this.userProps.storeWallElementAsset(elementId, assetUuid)
    }
    return elementId
  }

  public setWallElementSize(elementId: string, size: THREE.Vector2, metadata?: WallElementSizeMetadata) {
    if (!this.wallsGraph) {
      return false
    }
    const result = this.wallsGraph.setWallElementSize(elementId, size)
    if (!result) {
      return false
    }
    if (metadata) {
      this.userProps.storeWallElementSizeMetadata(elementId, metadata)
    }
    this.scene.refreshGraphView(this.wallsGraph)
    return true
  }

  public setLightFixtureObject(object: THREE.Object3D) {
    this.scene.setLightFixtureObject(object)
    if (this.wallsGraph) {
      this.scene.refreshGraphView(this.wallsGraph)
    }
  }

  public hideLights() {
    this.scene.hideLights()
  }

  public setSceneDirty() {
    this.scene.setIsDirty(true)
  }

  public refreshLights() {
    this.scene.refreshLights()
  }

  public addCompositionItem(itemInfo: CompositionFurnitureItem) {
    if(!this.wallsGraph || !this.floorPlane) {
      return undefined
    }
    const result = this.composition.addCompositionItem(itemInfo)
    if (result && result.item.getBoundToType() === `wall`) {
      const minLength = this.composition.getWallLengthLimit(result.item.getBoundToId())
      this.wallsGraph.setWallMinLength(result.item.getBoundToId(), minLength)
      result.item.addEventListener(EVENT_ITEM_SURFACE_SWITCHED,
        evt => this.onCompositionItemSurfaceSwitch(evt.fromSurfaceId, evt.toSurfaceId, evt.fromType, evt.toType))
    }
    return result?.uuid
  }

  public getFurnitureSaveData() {
    return this.composition.getFurnitureSaveData()
  }

  private onWallGraphChangeStep(): CollisionResolutionResult {
    if (!this.wallsGraph || !this.floorPlane) {
      return { success: false }
    }
    return this.composition.resolveCollisions(this.floorPlane, this.wallsGraph)
  }

  private onWallGraphChangeCompleted() {
    if (!this.wallsGraph) {
      return
    }
    this.scene.refreshGraphView(this.wallsGraph)
  }

  private onCompositionItemSurfaceSwitch(fromId: string, toId: string, fromType: string, toType: string) {
    if (!this.wallsGraph) {
      return
    }
    if (fromType === `wall`) {
      const minLength = this.composition.getWallLengthLimit(fromId)
      this.wallsGraph.setWallMinLength(fromId, minLength)
    }
    if (toType === `wall`) {
      const minLength = this.composition.getWallLengthLimit(toId)
      this.wallsGraph.setWallMinLength(toId, minLength)
    }
  }

  public blinkObject(objectType: InteractableItemType, objectId: string) {
    switch(objectType) {
      case 'wall-element': {
          const element = this.roomMesh?.getWallElement(objectId)
          if (element) {
            element.doBlink()
          }
        }
        break
      case 'composition-item': {
          const item = this.composition.getItem(objectId)
          if (item) {
            item.doBlink()
          }
        }
        break
      default:
        break
    }
  }

  public collectObstacleItems(wallGraphResult: WallsGraphMutationResult,
    collisionResult: CollisionResolutionResult): { type?: InteractableItemType; obstacleItemsIds?: string[] } {
    if (!this.wallsGraph) {
      return {}
    }
    if (wallGraphResult.success === false) {
      switch(wallGraphResult.reason) {
        case MUTATION_FAIL_REASON_WALL_MIN_LENGTH:
            if (wallGraphResult.obstacleWallId !== -1) {
            const items = this.composition.getWallItems(String(wallGraphResult.obstacleWallId))
            return {
              type: OBJECT_TYPE_COMPOSITION_ITEM,
              obstacleItemsIds: items.map(item => item.getId()),
            }
          }
          break
        case MUTATION_FAIL_REASON_WALL_ELEMENTS:
          if (wallGraphResult.obstacleWallId !== -1) {
            const wall = this.wallsGraph.getWallById(String(wallGraphResult.obstacleWallId))
            if (wall) {
              return {
                type: OBJECT_TYPE_WALL_ELEMENT,
                obstacleItemsIds: [...wall.elements.keys()],
              }
            }
          }
          break
        default:
          break
      }
    }
    if (collisionResult.success === false) {
      return {
        type: collisionResult.obstacleType,
        obstacleItemsIds: collisionResult.obstacleItemsIds
      }
    }
    return {}
  }

  // Check if the moving wall is in a line (or close to it) with another wall on any end,
  // and if yes, add a vertex on that end, and perform wall extrusion in the direction of dragging.
  private handleInlineWallMovement(wallId: string, normalMovement: THREE.Vector2): InlineWallMoveResult {
    if (!this.wallsGraph || !this.floorPlane) {
      return INLINE_WALLS_RESULT_NOOP
    }
    const wall = this.wallsGraph.getWallById(wallId)
    if (!wall) {
      return INLINE_WALLS_RESULT_NOOP
    }

    const wallsGraph = this.wallsGraph
    const [vertex1, vertex2] = wall.vertexIds.map(id => wallsGraph.getVertexById(id))
    const [neighborWall1, neighborWall2] = this.wallsGraph.getWallNeighborWalls(wallId)
    if (!vertex1 || !vertex2 || !neighborWall1 || !neighborWall2) {
      return INLINE_WALLS_RESULT_NOOP
    }
    const wallDir = this.wallsGraph.getWallDirection(wall).normalize()
    const neighborWall1Dir = this.wallsGraph.getWallDirection(neighborWall1).normalize()
    const neighborWall2Dir = this.wallsGraph.getWallDirection(neighborWall2).normalize()

    const angleThreshold = Math.cos(30.0 * DEG_TO_RAD)
    const isNeighbor1Inline = Math.abs(wallDir.dot(neighborWall1Dir)) > angleThreshold
    const isNeighbor2Inline = Math.abs(wallDir.dot(neighborWall2Dir)) > angleThreshold

    if (!isNeighbor1Inline && !isNeighbor2Inline) {
      return INLINE_WALLS_RESULT_NOOP
    }

    this.composition.createSnapshot()
    this.wallsGraph.createSnapshot()

    // Overall success of the operation: up to 2 walls splits and 2 vertex moves.
    // Continue only if it stays true, otherwise halt operation and revert the state.
    let overallSuccess = true

    // Assuming here that the wall graph is well formed, i.e. vertex order is the same on all walls.
    if (isNeighbor1Inline) {
      const splitResult1 = this.wallsGraph.splitWall(neighborWall1.id, 1.0 - 10 * EPSILON)
      overallSuccess = splitResult1 !== null
    }
    if (overallSuccess && isNeighbor2Inline) {
      const splitResult2 = this.wallsGraph.splitWall(neighborWall2.id, 0.0 + 10 * EPSILON)
      overallSuccess = splitResult2 !== null
    }

    if (overallSuccess) {
      const movementDir = normalMovement.clone().normalize()
      const extrusionLength = Math.max(WALLS_GRAPH_MIN_WALL_LENGTH, normalMovement.length())
      const extrusionMove = movementDir.clone().multiplyScalar(extrusionLength)

      const moveResult1 = this.wallsGraph.moveVertex(vertex1.id, extrusionMove, 0.0)
      overallSuccess = moveResult1.success
      if (overallSuccess) {
        const moveResult2 = this.wallsGraph.moveVertex(vertex2.id, extrusionMove, 0.0)
        overallSuccess = moveResult2.success
      }
    }

    const collisionsResult = this.onWallGraphChangeStep()
    overallSuccess = overallSuccess && collisionsResult.success
    if (!overallSuccess) {
      this.wallsGraph.restoreSnapshot()
      this.wallsGraph.clearSnapshot()
      this.composition.restoreSnaphot()
    }

    this.onWallGraphChangeCompleted()
    return overallSuccess ? INLINE_WALLS_RESULT_SUCCESS : INLINE_WALLS_RESULT_FAIL
  }

  public getFloorArea(): number {
    if (!this.wallsGraph) {
      return 0
    }
    return this.wallsGraph.getFloorArea()
  }
}
