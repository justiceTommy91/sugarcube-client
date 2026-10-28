import * as THREE from 'three'

import type { Matrix3x3, PlaneType, PointXY, PointXYZ } from 'Renderer/geomviewer/geom_types'
import type { BehaviorTarget } from 'Renderer/positioning/positioning_system'
import { fromThreeMatrix4, extractQuaternionFromMat3 } from 'Renderer/geometry/utilities'
import { Vector3Pod } from 'Renderer/geometry/Vector3'
import { gvPositioningConext } from 'Renderer/positioning/positioning_context'
import { PositioningBehavior3D, type Behavior3DConfig } from 'Renderer/positioning/positioning_behavior_3d'
import { toMat3x3 } from 'Renderer/geometry/ThreeUtils'
import { disposeMeshes } from 'Renderer/rendering/rendering_utils'

import type { WallsGraph } from 'Planner/editor/walls_graph'
import { WallSnapProxy } from "Planner/composition/wall_snap_proxy"
import { planeToWorld3, worldToPlane } from 'Planner/room_geometry'
import type { RefinedParentType } from 'Planner/planner_types'
import * as plannerConstants from 'Planner/planner_constants'
import { ObjectBlink } from 'Planner/rendering/object_blink'
import type { RoomScene } from 'Planner/rendering/room_scene'

export type CompositionItemSnaphot = {
  id: string
  modelId: string
  localTransform: THREE.Matrix4
  modelTransform: THREE.Matrix4
  posRelativeToOrigin: THREE.Vector2
  wallSnapBodyPos: number[]
  wallSnapBodyRot: number
  placementConfig: Behavior3DConfig
  boundToId: string
  boundToType: RefinedParentType
}

export type CompositionItemPlacementParams = {
  placementConfig: Behavior3DConfig
  boundToId: string
  boundToType: RefinedParentType
}

export class CompositionItem extends THREE.EventDispatcher<plannerConstants.PlannerEventMap> implements BehaviorTarget {
  private id = ''
  private modelId = ''
  private rootObject: THREE.Object3D
  private wallsnapProxy: WallSnapProxy
  private boundToId = ''
  private boundToType: RefinedParentType = `floor`
  private bbox = new THREE.Box3()
  private size = new THREE.Vector3()
  private positioningBehavior: PositioningBehavior3D
  private dragReferencePoint = new THREE.Vector3(0, 0, 0)
  private blink: ObjectBlink
  private placementConfig: Behavior3DConfig
  private modelTransform: THREE.Matrix4

  // Relevant only for wall items - since wall polygon's vertices can move around the infinite wall plane as the
  // wall moves/rotates, we want to maintain item's position in respect to one of wall's floor corners,
  // which is called "origin" in the wall mesh's userData.
  private posRelativeToOrigin = new THREE.Vector2()

  constructor(id: string, modelId: string, rootObject: THREE.Object3D, bbox: THREE.Box3, modelTransform: THREE.Matrix4,
    placementParams: CompositionItemPlacementParams, floorPlane: PlaneType, scene: RoomScene) {
    super()

    this.id = id
    this.modelId = modelId
    this.rootObject = rootObject
    this.bbox.copy(bbox)
    this.size = this.bbox.getSize(this.size)
    this.modelTransform = new THREE.Matrix4().copy(modelTransform)
    this.blink = new ObjectBlink(this.rootObject, scene)

    this.boundToId = placementParams.boundToId
    this.boundToType = placementParams.boundToType
    this.placementConfig = placementParams.placementConfig

    this.wallsnapProxy = new WallSnapProxy(this.rootObject, floorPlane, this.size)
    this.positioningBehavior = new PositioningBehavior3D(this, this.placementConfig)
    this.updatePosRelativeToOrigin()
  }

  // When our position changed intentionally, update our position relative to the parent wall's corner as well.
  private updatePosRelativeToOrigin() {
    if (!this.rootObject.parent || this.boundToType !== 'wall') {
      return
    }

    const originX = this.rootObject.parent.userData.originX ?? 0.0
    const originY = this.rootObject.parent.userData.originY ?? 0.0
    this.posRelativeToOrigin.set(this.rootObject.position.x - originX, this.rootObject.position.y - originY)
  }

  // When the parent wall moved/rotated, its "origin" (lower corner) may shift along its infinite plane.
  // Update our world position to remain in the same place visually relative to wall's corner.
  private maintainPosRelativeToOrigin() {
    if (!this.rootObject.parent || this.boundToType !== 'wall') {
      return
    }
    const originX = this.rootObject.parent.userData.originX ?? 0.0
    const originY = this.rootObject.parent.userData.originY ?? 0.0
    this.rootObject.position.x = this.posRelativeToOrigin.x + originX
    this.rootObject.position.y = this.posRelativeToOrigin.y + originY
  }

  public getWallSnapAdapter() {
    return this.wallsnapProxy
  }

  public dragTargetToScreenPoint(pixelX: number, pixelY: number, dragOffset?: PointXY) {
    const mousePointArray: [number, number] | undefined = dragOffset && [pixelX - dragOffset.x, pixelY - dragOffset.y]
    const result = this.positioningBehavior.dragTargetToScreenPoint([pixelX, pixelY], mousePointArray)
    return result
  }

  public getHeading() {
    return this.wallsnapProxy.orientation
  }

  public setHeading(value: number) {
    this.wallsnapProxy.orientation = value
  }

  public getLocation() {
    // Non-stackable furniture objects in Geomviewer are children of the scene,
    // i.e. their local and world positions are the same.
    const position = this.rootObject.getWorldPosition(new THREE.Vector3())
    return {
      localPos: { ...position },
      bindTo: this.boundToId,
    }
  }

  public getWorldTransform() {
    return fromThreeMatrix4(this.rootObject.matrixWorld)
  }

  public setPosRelative(pos: PointXYZ) {
    this.rootObject.position.set(pos.x, pos.y, pos.z)
    this.updatePosRelativeToOrigin()
  }

  public setPosAbsolute(pos: PointXYZ) {
    if (this.rootObject.parent) {
      const localPosition = this.rootObject.parent.worldToLocal(new THREE.Vector3(pos.x, pos.y, pos.z))
      this.rootObject.position.copy(localPosition)
    } else {
      this.rootObject.position.set(pos.x, pos.y, pos.z)
    }
    this.updatePosRelativeToOrigin()
  }

  public setRotRelative(rotation: Matrix3x3) {
    const quaterion = extractQuaternionFromMat3(rotation)
    this.rootObject.quaternion.set(quaterion[0], quaterion[1], quaterion[2], quaterion[3])
  }

  public setRotAbsolute(rotation: Matrix3x3) {
    const q = extractQuaternionFromMat3(rotation)
    const quaternion = new THREE.Quaternion(q[0], q[1], q[2], q[3])
    if (this.rootObject.parent) {
        const parentWorldQuaternion = new THREE.Quaternion()
        this.rootObject.parent.getWorldQuaternion(parentWorldQuaternion)
        const localQuaternion = parentWorldQuaternion.invert().multiply(quaternion)
        this.rootObject.quaternion.copy(localQuaternion)
    } else {
        this.rootObject.quaternion.copy(quaternion)
    }
  }

  public getPosRelative(): PointXYZ {
    return { ...this.rootObject.position }
  }

  public getPosAbsolute(): PointXYZ {
    const worldPosition = this.rootObject.getWorldPosition(new THREE.Vector3())
    return { ...worldPosition }
  }

  public getRotRelative(): Matrix3x3 {
    const rot = this.rootObject.matrix.extractRotation(new THREE.Matrix4())
    return toMat3x3(rot)
  }

  public getRotAbsolute(): Matrix3x3 {
    const rot = this.rootObject.matrixWorld.extractRotation(new THREE.Matrix4())
    return toMat3x3(rot)
  }

  public getTargetObjectMatrixWorld(): THREE.Matrix4 {
    return this.rootObject.matrixWorld.clone()
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars, @typescript-eslint/no-unused-vars
  public setDragReferencePoint(position: Vector3Pod) {
    this.dragReferencePoint.set(position.dx, position.dy, position.dz)
  }

  public localToWorld(localPoint: PointXYZ) {
    return this.rootObject.localToWorld(new THREE.Vector3(localPoint.x, localPoint.y, localPoint.z))
  }

  public getLocalPointProjectionOnScreen(localPoint: PointXYZ) {
    const camera = gvPositioningConext()?.getCamera()
    if (!camera) {
      return undefined
    }
    const worldPoint = this.localToWorld(localPoint)
    return camera.worldToScreenFloat(worldPoint)
  }

  getDragReferencePointOnScreen() {
    return this.getLocalPointProjectionOnScreen(this.dragReferencePoint)
  }

  // eslint-disable-next-line class-methods-use-this
  public setParent() {
    return false
  }

  // eslint-disable-next-line class-methods-use-this
  public setParentBySurfaceId() {
    return false
  }

  // eslint-disable-next-line class-methods-use-this
  public setParentByRenderItemId() {
    return false
  }

  // eslint-disable-next-line class-methods-use-this
  public setParentSurface(id: string) {
    if (this.boundToId === id) {
      return
    }
    const previousId = this.boundToId
    const previousType = this.boundToType
    this.boundToId = id
    const plane = gvPositioningConext()?.getSurfaceById(+id)
    if (plane && (plane.class === `floor` || plane.class === `wall`)) {
      this.boundToType = plane.class
      this.dispatchEvent({
        type: plannerConstants.EVENT_ITEM_SURFACE_SWITCHED,
        uniqueId: this.getId(),
        fromSurfaceId: previousId,
        toSurfaceId: this.boundToId,
        fromType: previousType,
        toType: this.boundToType,
      })
      this.updatePosRelativeToOrigin()
    }
  }

  public getId() {
    return this.id
  }

  public getBoundToId() {
    return this.boundToId
  }

  public getBoundToType() {
    return this.boundToType
  }

  public getSize() {
    return this.size
  }

  public getBbox() {
    return this.bbox
  }

  public getRootObject() {
    return this.rootObject
  }

  public isBoundToRoomSurface() {
    return this.boundToType === `floor` || this.boundToType === `wall`
  }

  public resolveCollisions(floorPlane: PlaneType, wallsGraph: WallsGraph): boolean {
    switch(this.boundToType) {
      case `floor`:
        return this.wallsnapProxy?.pushOut() ?? true
      case `wall`:
        this.maintainPosRelativeToOrigin()
        this.clampPositionToWallBounds(floorPlane, wallsGraph)
        return true
      default:
        return true
    }
  }

  private clampPositionToWallBounds(floorPlane: PlaneType, wallsGraph: WallsGraph) {
    const wall = wallsGraph.getWallById(this.boundToId)
    if (!wall || !this.rootObject.parent) {
      return
    }
    const worldPos = this.rootObject.getWorldPosition(new THREE.Vector3)
    const floorPoint = worldToPlane(floorPlane, worldPos)
    const floorPoint2d = new THREE.Vector2(floorPoint.x, floorPoint.y)

    const v0 = wallsGraph.getVertexPosition(wall.vertexIds[0])
    const v1 = wallsGraph.getVertexPosition(wall.vertexIds[1])

    const dir = v1.clone().sub(v0)
    const lenSq = dir.lengthSq()
    if (lenSq === 0) {
      return
    }
    const unitDir = dir.clone().normalize()
    const bound1 = floorPoint2d.clone().sub(unitDir.clone().multiplyScalar(this.size.x * 0.5))
    const bound2 = floorPoint2d.clone().add(unitDir.clone().multiplyScalar(this.size.x * 0.5))

    const t = dir.dot(floorPoint2d.clone().sub(v0)) / lenSq
    const t1 = dir.dot(bound1.clone().sub(v0)) / lenSq
    const t2 = dir.dot(bound2.clone().sub(v0)) / lenSq

    const projectedOnWall = v0.clone().add(dir.clone().multiplyScalar(t))
    const positionOffset = new THREE.Vector2().subVectors(floorPoint2d, projectedOnWall)

    let displacementNeed = 0.0
    const relativeLen = t2 - t1
    if (relativeLen > 1) {
      displacementNeed = 0.5 - (t1 + t2) * 0.5
    } else {
      const lower = -t1
      const upper = 1 - t2
      if (lower > 0) {
        displacementNeed = lower
      }
      if (upper < 0) {
        displacementNeed = upper
      }
    }
    const newT = t + displacementNeed
    const newProjectedOnWall = v0.clone().add(dir.clone().multiplyScalar(newT))
    const newFloorPoint2d = newProjectedOnWall.add(positionOffset)
    const newFloorPoint = new THREE.Vector3(newFloorPoint2d.x, newFloorPoint2d.y, floorPoint.z)
    const newWorldPos = planeToWorld3(floorPlane, newFloorPoint)

    const localPos = this.rootObject.parent.worldToLocal(newWorldPos)
    this.rootObject.position.copy(localPos)
    this.updatePosRelativeToOrigin()
  }

  public dispose() {
    this.blink.dispose()
    this.rootObject.parent?.remove(this.rootObject)
    disposeMeshes(this.rootObject)
  }

  public createSnapshot(): CompositionItemSnaphot {
    return {
      id: this.id,
      modelId: this.modelId,
      localTransform: this.rootObject.matrix.clone(),
      modelTransform: this.modelTransform.clone(),
      posRelativeToOrigin: this.posRelativeToOrigin.clone(),
      wallSnapBodyPos: [...this.wallsnapProxy.body.pos],
      wallSnapBodyRot: this.wallsnapProxy.body.rot,
      placementConfig: this.placementConfig,
      boundToId: this.boundToId,
      boundToType: this.boundToType,
    }
  }

  public restoreSnaphot(snapshot: CompositionItemSnaphot) {
    this.rootObject.matrix.copy(snapshot.localTransform)
    this.rootObject.matrix.decompose(this.rootObject.position, this.rootObject.quaternion, this.rootObject.scale)
    this.rootObject.updateMatrixWorld()
    this.posRelativeToOrigin.copy(snapshot.posRelativeToOrigin)
    this.wallsnapProxy.body.pos = [...snapshot.wallSnapBodyPos]
    this.wallsnapProxy.body.rot = snapshot.wallSnapBodyRot
  }

  public doBlink() {
    this.blink.start(0.25)
  }
}