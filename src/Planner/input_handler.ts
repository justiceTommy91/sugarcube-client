import * as THREE from 'three'

import { Planner } from 'Planner/planner'
import { rayCastToPlane, worldToPlane } from 'Planner/room_geometry'
import type {
  InputState,
  RayCastResultObjectType,
  WallElementDraggingParams,
} from 'Planner/planner_types'
import type { Vector2Like, InteractableItemType, CollisionResolutionResult } from 'Planner/api_types'

import { getRelXY } from 'Renderer/inputhandler/input_utils'
import type { PlannerViewer } from 'Planner/planner_viewer'
import {
  INPUT_STATE_IDLE,
  INPUT_STATE_DRAGGING,
  INPUT_STATE_DRAGGING_EXTERNAL,
  INPUT_HANDLER_HOVER_START,
  INPUT_HANDLER_HOVER_END,
  INPUT_HANDLER_SELECT_START,
  INPUT_HANDLER_SELECT_END,
  INPUT_HANDLER_EVENT_DRAG_START,
  INPUT_HANDLER_EVENT_DRAG_END,
  INPUT_HANDLER_EVENT_DRAG_DIR_CHANGED,
  BASEBOARD_HEIGHT,
  WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED,
  WALL_ELEMENT_DRAGGING_AXIS_STATE_ENABLED,
  WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED,
  WALL_EL_DRAGGING_AUTO_SNAP_DISTANCE,
  WALL_EL_DRAGGING_AXIS_MIN_PROJ_SIZE,
  INPUT_HANDLER_EVENT_ITEM_DELETED
} from 'Planner/planner_constants'

import {
  OBJECT_TYPE_COMPOSITION_ITEM,
  OBJECT_TYPE_WALL,
  OBJECT_TYPE_WALL_ELEMENT,
  OBJECT_TYPE_WALL_VERTEX,
} from 'Planner/api_constants'
import { gvPositioningConext } from 'Renderer/positioning/positioning_context'
import { PlannerPositioningContext } from './composition/planner_positioning_context'


const isHoverable = (type: RayCastResultObjectType | undefined | null): type is InteractableItemType => {
  let result = false
  switch (type) {
    case OBJECT_TYPE_WALL_ELEMENT:
    case OBJECT_TYPE_COMPOSITION_ITEM:
      result = true
      break
    default:
      break
  }
  return result
}

const isSelectable = (type: RayCastResultObjectType | undefined | null): type is InteractableItemType => {
  let result = false
  switch (type) {
    case OBJECT_TYPE_WALL_ELEMENT:
    case OBJECT_TYPE_COMPOSITION_ITEM:
      result = true
      break
    default:
      break
  }
  return result
}

const isDraggable = (type: RayCastResultObjectType | undefined | null): type is InteractableItemType => {
  let result = false
  switch (type) {
    case OBJECT_TYPE_WALL:
    case OBJECT_TYPE_WALL_ELEMENT:
    case OBJECT_TYPE_COMPOSITION_ITEM:
      result = true
      break
    default:
      break
  }
  return result
}

type InteractableEntity = {
  id: string
  type: InteractableItemType
}

export class InputHandler {
  private planner: Planner
  private viewer: PlannerViewer

  private state: InputState = `idle`

  private selectedEntity: InteractableEntity | null = null
  private hoverEntity: InteractableEntity | null = null
  private draggingEntity: InteractableEntity | null = null
  private hoverForcedExternally = false

  private dragStartWorldPoint: THREE.Vector3 | null = null
  private dragOffset = new THREE.Vector2(0, 0)
  private draggingParams: WallElementDraggingParams | null = null

  private uiDragOffset: THREE.Vector2 | null = null

  private wallsDragEnabled = true
  private wallElementsDragEnabled = true

  constructor(planner: Planner, parentViewer: PlannerViewer) {
    this.viewer = parentViewer
    this.planner = planner
  }

  public setWallsDragEnabled(enable: boolean) {
    this.wallsDragEnabled = enable
  }

  public setWallElementsDragEnabled(enable: boolean) {
    this.wallElementsDragEnabled = enable
  }

  public getWallsDragEnabled() {
    return this.wallsDragEnabled
  }

  public getWallElementsDragEnabled() {
    return this.wallElementsDragEnabled
  }

  public getHoverEntityId() {
    return this.hoverEntity?.id ?? null
  }

  public getHoverEntityType() {
    return this.hoverEntity?.type ?? null
  }

  public getSelectedEntityId() {
    return this.selectedEntity?.id ?? null
  }

  public getSelectedEntityType() {
    return this.selectedEntity?.type ?? null
  }

  public getDraggingEntityId() {
    return this.draggingEntity?.id ?? null
  }

  public getDraggingEntityType() {
    return this.draggingEntity?.type ?? null
  }

  public getVerticalDraggingAxisState() {
    return this.draggingParams?.verticalAxisState
  }

  public getHorizontalDraggingAxisState() {
    return this.draggingParams?.horizontalAxisState
  }

  public getState() {
    return this.state
  }

  public onPointerMove(event: PointerEvent) {
    const context = gvPositioningConext()
    if (context && context instanceof PlannerPositioningContext) {
      context.setViewer(this.viewer.getContext())
    }

    let result = false
    switch(this.state) {
      case INPUT_STATE_DRAGGING:
        result = this.handleDragging(event)
        break
      case INPUT_STATE_IDLE:
        result = this.handleIdlePointerMove(event)
        break
      case INPUT_STATE_DRAGGING_EXTERNAL:
        break
      default:
        break
    }
    if (!result) {
      result = this.viewer.getCameraManager()?.onPointerMove(event) || false
    }
    return result
  }

  public onPointerDown(event: PointerEvent) {
    const context = gvPositioningConext()
    if (context && context instanceof PlannerPositioningContext) {
      context.setViewer(this.viewer.getContext())
    }

    let result = false
    const sampleResult = this.pickEntity(event)
    if (!sampleResult ||
      sampleResult.id !== this.getSelectedEntityId() ||
      sampleResult.objectType !== this.getSelectedEntityType()) {
      this.stopSelect()
    }

    if (sampleResult &&
      isDraggable(sampleResult.objectType) &&
      this.isDragEnabledForType(sampleResult.objectType)) {
      this.dragStartWorldPoint = sampleResult.worldPosition
      this.startDrag(sampleResult.id, sampleResult.objectType)
      if (sampleResult.objectType === OBJECT_TYPE_WALL_ELEMENT) {
        this.initWallElementDraggingParams(sampleResult.id, sampleResult.worldPosition)
      }
      if (sampleResult.objectType === OBJECT_TYPE_COMPOSITION_ITEM) {
        this.calcDragOffset(event)
      }
      result = true
    }

    if (!result) {
      result = this.viewer.getCameraManager()?.onPointerDown(event) || false
    }
    return result
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  public onPointerUp(event: PointerEvent) {
    const context = gvPositioningConext()
    if (context && context instanceof PlannerPositioningContext) {
      context.setViewer(this.viewer.getContext())
    }

    let result = false
    if (this.getDraggingEntityId()) {
      this.stopDrag()
      this.state = INPUT_STATE_IDLE
      result = true
    }
    if (!result) {
      result = this.viewer.getCameraManager()?.onPointerUp() || false
    }
    return result
  }

  public onKeyDown(event: KeyboardEvent) {
    const currentRoom = this.planner?.getCurrentRoom()
    const currentSelectedId = this.getSelectedEntityId()
    if (!currentRoom || !currentSelectedId) {
      return false
    }
    const context = gvPositioningConext()
    if (context && context instanceof PlannerPositioningContext) {
      context.setViewer(this.viewer.getContext())
    }
    const currentSelectedType = this.getSelectedEntityType()
    let result = false
    switch (event.key) {
      case "Delete": {
          switch(currentSelectedType) {
            case OBJECT_TYPE_WALL_ELEMENT:
              currentRoom.deleteWallElement(currentSelectedId)
              this.onWallElementDeleted(currentSelectedId, true)
              result = true
              break
            case OBJECT_TYPE_COMPOSITION_ITEM:
              currentRoom.deleteCompositionItem(currentSelectedId)
              this.onCompositionItemDeleted(currentSelectedId, true)
              result = true
              break
            case OBJECT_TYPE_WALL_VERTEX: {
              const deletionResult = currentRoom.deleteVertex(currentSelectedId)
              if (deletionResult.success) {
                this.onWallVertexDeleted(currentSelectedId, true)
              }
              break
            }
            default:
              break
        }
        break;
      }
      default:
        break
    }
    return result
  }

  public forceHoverEntity(entityId: string | null, entityType: InteractableItemType) {
    const currentHoverId = this.getHoverEntityId()
    if (currentHoverId !== entityId) {
      if (currentHoverId) {
        this.stopHover()
      }
      if (entityId) {
        this.startHover(entityId, entityType)
      }
    }
    this.hoverForcedExternally = !!entityId
  }

  public forceSelectEntity(entityId: string | null, entityType?: InteractableItemType) {
    const currentSelectedId = this.getSelectedEntityId()
    const currentSelectedType = this.getSelectedEntityType()
    if (currentSelectedId === entityId && currentSelectedType === entityType) {
      return
    }
    if (currentSelectedId) {
      this.stopSelect()
    }
    if (entityId && entityType) {
      this.startSelect(entityId, entityType)
    }
  }

  public forceDraggedEntity(entityId: string | null, entityType: InteractableItemType) {
    const currentDraggingId = this.getDraggingEntityId()
    if (currentDraggingId) {
      this.stopDrag(true)
    }
    if (entityId) {
      if (currentDraggingId !== entityId) {
        this.stopSelect()
        this.startSelect(entityId, entityType)
      }
      if (entityType === OBJECT_TYPE_WALL_ELEMENT) {
        this.initWallElementDraggingParams(entityId)
      }
      this.startDrag(entityId, entityType, true)
      this.state = INPUT_STATE_DRAGGING_EXTERNAL
    } else if (this.state === INPUT_STATE_DRAGGING_EXTERNAL) {
      this.stopDrag(true)
      this.state = INPUT_STATE_IDLE
    }
  }

  private pickEntity(event: PointerEvent) {
    const room = this.planner.getCurrentRoom()
    const ray = this.getCameraRay(event)
    if (!room || !ray) {
      return null
    }
    const sceneSampleResult = room.sampleScene(ray)
    const itemSampleResult = room.sampleCompositionItem(ray)
    if (sceneSampleResult && itemSampleResult) {
      return sceneSampleResult.distance <= itemSampleResult.distance ? sceneSampleResult : itemSampleResult
    }
    return sceneSampleResult ?? itemSampleResult
  }

  private relPointToCeilingPlane(relPoint: Vector2Like) {
    const room = this.planner.getCurrentRoom()
    const cameraManager = this.viewer.getCameraManager()
    const ceilingPlane = room?.getCeilingPlane()
    if (!room || !ceilingPlane || !cameraManager) {
      return undefined
    }

    const camera = cameraManager.getCamera()
    const ray = camera.getScreenPointRay([relPoint.x, relPoint.y])
    const worldPoint = rayCastToPlane(ray, ceilingPlane)
    return worldPoint
  }

  public handleWallUIStartDrag(wallId: string, grabPoint: Vector2Like) {
    const room = this.planner.getCurrentRoom()
    if (!room) {
      return
    }
    this.uiDragOffset = null
    const info = room.getWallInformation(wallId)
    if (info) {
      const vertex1Rel = this.viewer.projectWorldPosition(info.vertex2Pos)
      const vertex2Rel = this.viewer.projectWorldPosition(info.vertex1Pos)
      if (vertex1Rel && vertex2Rel) {
        const wallSpan = new THREE.Vector3().subVectors(vertex2Rel, vertex1Rel)
        const middlePoint = vertex1Rel.clone().add(wallSpan.multiplyScalar(0.5))
        this.uiDragOffset = new THREE.Vector2(middlePoint.x - grabPoint.x, middlePoint.y - grabPoint.y)
      }
    }
  }

  public handleWallUIEndDrag() {
    this.uiDragOffset = null
  }

  public handleWallUIDrag(wallId: string, toRelPoint: Vector2Like): CollisionResolutionResult {
    const room = this.planner.getCurrentRoom()
    if (!room) {
      return { success: false }
    }

    const destPoint = { ...toRelPoint }
    if (this.uiDragOffset) {
      destPoint.x += this.uiDragOffset.x
      destPoint.y += this.uiDragOffset.y
    }

    // GraphView lays in the ceiling plane, ui elements are projected on it.
    const toWorldPoint = this.relPointToCeilingPlane(destPoint)
    if (!toWorldPoint) {
      return { success: false }
    }
    return room.dragWallToPoint(wallId, toWorldPoint)
  }

  public handleVertexUIDrag(vertexId: string, toRelPoint: Vector2Like) {
    const room = this.planner.getCurrentRoom()
    if (!room) {
      return { success: false }
    }

    // GraphView lays in the ceiling plane, ui elements are projected on it.
    const toWorldPoint = this.relPointToCeilingPlane(toRelPoint)
    if (!toWorldPoint) {
      return { success: false }
    }
    return room.dragVertexToPoint(vertexId, toWorldPoint)
  }

  private snapWallElementToDraggingAxes(elementPos: THREE.Vector2,
                                        destinationWallId: string,
                                        wallElementClass: string) {
    const wallInfo = this.planner.getCurrentRoom()?.getWallInformation(destinationWallId)
    const roomHeight = this.planner.getCurrentRoom()?.getRoomHeight()
    if (!this.draggingEntity || !this.draggingParams || !wallInfo || !roomHeight) {
      return
    }

    // Check destination wall projection sizes along horizontal and vertical axes and
    // disable dragging along an axis if wall screen projection is too short in this direction.
    const pointProjHor1 = this.viewer.projectWorldPosition(wallInfo.vertex1Pos)
    const pointProjHor2 = this.viewer.projectWorldPosition(wallInfo.vertex2Pos)
    const pointProjVert1 = this.viewer.projectWorldPosition(
      wallInfo.vertex1Pos.clone().addScaledVector(new THREE.Vector3(0, 1, 0), roomHeight)
    )

    if (!pointProjHor1 || !pointProjHor2 || !pointProjVert1) {
      return
    }

    const vWallHorizontalProj = this.viewer.relativePointToPixels({...pointProjHor2})
                                .sub(this.viewer.relativePointToPixels({...pointProjHor1}))

    const vWallVerticalProj = this.viewer.relativePointToPixels({...pointProjVert1})
                              .sub(this.viewer.relativePointToPixels({...pointProjHor1}))

    const wallScreenArea = Math.abs(vWallHorizontalProj.cross(vWallVerticalProj))

    const disableHorizontaAxis = (wallScreenArea / vWallVerticalProj.length()) < WALL_EL_DRAGGING_AXIS_MIN_PROJ_SIZE
    const disableVerticalAxis = wallElementClass === 'door' ||
                                (wallScreenArea / vWallHorizontalProj.length()) < WALL_EL_DRAGGING_AXIS_MIN_PROJ_SIZE

    // Auto-snap wall element to an axis when element position is close to it.
    const snapHorizontally =
      Math.abs(elementPos.y - this.draggingParams.startElementPos2D.y) < WALL_EL_DRAGGING_AUTO_SNAP_DISTANCE

    const snapVertically =
      destinationWallId === this.draggingParams.startWallId &&
      wallElementClass !== 'door' &&
      Math.abs(elementPos.x - this.draggingParams.startElementPos2D.x) < WALL_EL_DRAGGING_AUTO_SNAP_DISTANCE

    const horizontalAxisState = disableHorizontaAxis ? WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED :
                                disableVerticalAxis || snapHorizontally ? WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED :
                                WALL_ELEMENT_DRAGGING_AXIS_STATE_ENABLED

    const verticalAxisState = disableVerticalAxis ? WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED :
                              disableHorizontaAxis || snapVertically ? WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED :
                              WALL_ELEMENT_DRAGGING_AXIS_STATE_ENABLED

    if (verticalAxisState === WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED) {
      elementPos.y = this.draggingParams.prevElementPos2D.y
    }
    else if (horizontalAxisState === WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED) {
      elementPos.y = this.draggingParams.startElementPos2D.y
    }

    if (horizontalAxisState === WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED) {
      // When an element is dragged to a wall with horizontal dragging disabled
      // we set it's X coordinate to the center of the wall.
      elementPos.x = destinationWallId !== this.draggingParams.prevWallId ?
                     wallInfo.length / 2 :
                     this.draggingParams.prevElementPos2D.x
    }
    else if (verticalAxisState === WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED) {
      elementPos.x = this.draggingParams.startElementPos2D.x
    }

    if (horizontalAxisState !== this.draggingParams.horizontalAxisState ||
        verticalAxisState !== this.draggingParams.verticalAxisState) {
      this.viewer.dispatchEvent({
        type: INPUT_HANDLER_EVENT_DRAG_DIR_CHANGED,
        id: this.draggingEntity.id,
        objectType: OBJECT_TYPE_WALL_ELEMENT,
        verticalDraggingState: verticalAxisState,
        horizontalDraggingState: horizontalAxisState
      })

      this.draggingParams.horizontalAxisState = horizontalAxisState
      this.draggingParams.verticalAxisState = verticalAxisState
    }

    this.draggingParams.prevElementPos2D = elementPos
    this.draggingParams.prevWallId = destinationWallId
  }

  private dragWallElementTo(toPoint: THREE.Vector3, destinationWallId: string) {
    const room = this.planner.getCurrentRoom()
    if (!room || !this.draggingEntity || !this.draggingParams) {
      return
    }

    const dragToGrabPoint = room.transformWallElementWorldPointToPlane(toPoint, this.draggingEntity.id,
                                                                       destinationWallId)
    if (!dragToGrabPoint) {
      return
    }

    const finalPosition = new THREE.Vector2().addVectors(dragToGrabPoint, this.draggingParams.dragStartOffset2D)

    const wallElement = room.getWallsGraph()?.getWallElementByGlobalId(this.draggingEntity.id)
    if (!wallElement) {
      return
    }

    finalPosition.y = Math.min(finalPosition.y, room.getRoomHeight() - wallElement.size.y / 2)
    finalPosition.y = Math.max(finalPosition.y, BASEBOARD_HEIGHT + wallElement.size.y / 2)

    this.snapWallElementToDraggingAxes(finalPosition, destinationWallId, wallElement.class)

    room.dragWallElementTo(this.draggingEntity.id, destinationWallId, finalPosition)
  }

  public handleWallElementUIDrag(elementId: string, toRelPoint: Vector2Like) {
    const room = this.planner.getCurrentRoom()
    const wallElementInfo = room?.getWallElementInformation(elementId)
    const cameraManager = this.viewer.getCameraManager()
    if (!room || !wallElementInfo || !cameraManager) {
      return
    }
    const wallPlane = room.getRoomMesh()?.getWallPlane(wallElementInfo.wallId)
    if (!wallPlane) {
      return
    }

    const camera = cameraManager.getCamera()
    const rayTo = camera.getScreenPointRay([toRelPoint.x, toRelPoint.y])
    const destination = this.smartWallRaycast(rayTo, wallElementInfo.wallId)
    if (!destination) {
      return
    }
    const toWorldPoint = destination.targetPosition
    if (toWorldPoint) {
      this.dragWallElementTo(toWorldPoint, destination.targetWallId)
    }
  }

  public onCompositionItemDeleted(itemId: string, internally = false) {
    this.onItemDeleted(itemId, internally)
  }

  public onWallElementDeleted(elementId: string, internally = false) {
    this.onItemDeleted(elementId, internally)
  }

  public onWallVertexDeleted(vertexId: string, internally = false) {
    this.onItemDeleted(vertexId, internally)
  }

  private onItemDeleted(entityId: string, internally: boolean) {
    if (!this.selectedEntity) {
      return
    }
    const id = this.selectedEntity.id
    const objectType = this.selectedEntity.type
    this.stopTracking(entityId)
    this.viewer.dispatchEvent({
      type: INPUT_HANDLER_EVENT_ITEM_DELETED,
      id,
      objectType,
      isInternal: internally,
    })
  }

  private stopTracking(entityId: string) {
    if (entityId === this.getHoverEntityId()) {
      this.stopHover()
    }
    if (entityId === this.getDraggingEntityId()) {
      this.stopDrag()
    }
    if (entityId === this.getSelectedEntityId()) {
      this.stopSelect()
    }
  }

  private getCameraRay(event: PointerEvent) {
    const cameraManager = this.viewer.getCameraManager()
    if (!cameraManager) {
      return undefined
    }
    const camera = cameraManager.getCamera()
    const relativeCoords = getRelXY(event)
    return camera.getScreenPointRay(relativeCoords)
  }

  private handleDragging(event: PointerEvent) {
    let result = false
    switch (this.draggingEntity?.type) {
      case OBJECT_TYPE_WALL:
        result = this.handleDraggingWall(event)
        break
      case OBJECT_TYPE_WALL_ELEMENT:
        result = this.handleDraggingWallElement(event)
        break
      case OBJECT_TYPE_COMPOSITION_ITEM:
        result = this.handleDraggingCompositionItem(event)
        break
      default:
        break
    }
    return result
  }

  private handleDraggingWall(event: PointerEvent) {
    if (!this.draggingEntity || !this.dragStartWorldPoint) {
      return false
    }
    const room = this.planner.getCurrentRoom()
    const floorPlane = room?.getFloorPlane()
    const cameraRay = this.getCameraRay(event)
    if (!room || !floorPlane || !cameraRay) {
      return false
    }
    const dragStartPlaneSpacePoint = worldToPlane(floorPlane, this.dragStartWorldPoint)
    const z = dragStartPlaneSpacePoint.z
    // A plane parallel to the floor, that is passing through the drag point.
    const draggingPlane = {
      id: -1,
      d: floorPlane.d - z,
      rot: floorPlane.rot,
      class: floorPlane.class,
    }
    const dragToWorldSpace = rayCastToPlane(cameraRay, draggingPlane)
    if (dragToWorldSpace) {
      room.dragWallToPoint(this.draggingEntity.id, dragToWorldSpace)
    }

    this.dragStartWorldPoint = dragToWorldSpace || null
    return this.dragStartWorldPoint !== null
  }

  private handleDraggingWallElement(event: PointerEvent) {
    const room = this.planner.getCurrentRoom()
    const cameraRay = this.getCameraRay(event)
    if (!room || !this.draggingEntity || !cameraRay) {
      return false
    }
    const wallElementInfo = room.getWallElementInformation(this.draggingEntity.id)
    if (!wallElementInfo) {
      return false
    }
    const destination = this.smartWallRaycast(cameraRay, wallElementInfo.wallId)
    if (!destination) {
      return false
    }

    const { targetPosition, targetWallId } = destination
    this.dragWallElementTo(targetPosition, targetWallId)

    return true
  }

  private handleDraggingCompositionItem(event: PointerEvent) {
    const room = this.planner.getCurrentRoom()
    if (!room || !this.draggingEntity) {
      return false
    }
    const compositionItem = room.getComposition().getItem(this.draggingEntity.id)
    if (!compositionItem) {
      return false
    }
    const dimensions = this.viewer.getRenderDimensions()
    const [screenX, screenY] = getRelXY(event, [dimensions.width, dimensions.height])
    const dragResult = compositionItem.dragTargetToScreenPoint(screenX + this.dragOffset.x,
      screenY + this.dragOffset.y, this.dragOffset)
    if (dragResult.referencePointChanged) {
      this.calcDragOffset(event, compositionItem.getDragReferencePointOnScreen())
    }
    room.setSceneDirty()
    return dragResult.success
  }

  private calcDragOffset(event: PointerEvent, newPos?: Vector2Like) {
    const room = this.planner.getCurrentRoom()
    if (!room || !this.draggingEntity) {
      return
    }
    const compositionItem = room.getComposition().getItem(this.draggingEntity.id)
    if (!compositionItem) {
      return
    }
    const dimensions = this.viewer.getRenderDimensions()
    const pixelXY = getRelXY(event, [dimensions.width, dimensions.height])
    const objectPosition = newPos || compositionItem.getDragReferencePointOnScreen() || new THREE.Vector2()
    this.dragOffset.set(objectPosition.x - pixelXY[0], objectPosition.y - pixelXY[1])
  }

  private handleIdlePointerMove(event: PointerEvent) {
    if (!this.wallElementsDragEnabled || this.hoverForcedExternally) {
      return false
    }
    const result = this.pickEntity(event)
    if (this.hoverEntity &&
      (result?.objectType !== this.hoverEntity.type || result?.id !== this.hoverEntity.id)) {
      this.stopHover()
    }
    if (result && result.id !== this.hoverEntity?.id && isHoverable(result.objectType)) {
      this.startHover(result.id, result.objectType)
    }
    return false
  }

  // Get ray-walls intersection info, with improved result in cases when the ray hits floor/ceiling,
  // or misses the room mesh entirely.
  private smartWallRaycast(cameraRay: THREE.Ray, initialWallId: string) {
    const room = this.planner.getCurrentRoom()
    if (!room) {
      return undefined
    }

    const intersectionInfo = room.sampleScene(cameraRay)
    const isWall = intersectionInfo?.objectType === `wall`

    let targetWallId: string | undefined = initialWallId
    let targetPosition: THREE.Vector3 | undefined = undefined
    if (intersectionInfo && isWall) {
      targetWallId = intersectionInfo.id
    }

    if (intersectionInfo) {
      targetPosition = intersectionInfo.worldPosition
      if (intersectionInfo.objectType === `floor` || intersectionInfo.objectType === `ceiling`) {
        targetPosition = room.projectPointOnWall(intersectionInfo.worldPosition, targetWallId)
      }
    } else {
      targetPosition = room.sampleWallPlane(cameraRay, targetWallId, true)
    }
    if (!targetPosition) {
      return undefined
    }
    return {
      targetPosition,
      targetWallId,
    }
  }

  private startDrag(id: string, objectType: InteractableItemType, external = false) {
    this.draggingEntity = {
      id,
      type: objectType
    }
    this.state = INPUT_STATE_DRAGGING
    if (isSelectable(objectType)) {
      this.startSelect(id, objectType)
    }
    this.viewer.dispatchEvent({
      type: INPUT_HANDLER_EVENT_DRAG_START,
      id,
      objectType,
      isInternal: !external,
    })
  }

  private stopDrag(external = false) {
    const id = this.draggingEntity?.id
    const objectType = this.draggingEntity?.type
    this.draggingEntity = null
    this.draggingParams = null
    this.planner.refreshLights()
    this.viewer.dispatchEvent({
      type: INPUT_HANDLER_EVENT_DRAG_END,
      id,
      objectType,
      isInternal: !external,
    })
  }

  private initWallElementDraggingParams(elementId: string, dragStartPointWorld?: THREE.Vector3) {
    const room = this.planner.getCurrentRoom()
    const startElementPos2D = room?.getWallsGraph()?.getWallElementPosition(elementId)
    const wallElement = room?.getWallsGraph()?.getWallElementByGlobalId(elementId)

    if (!startElementPos2D || !wallElement) {
      return
    }

    let dragStartOffset2D = new THREE.Vector2(0, 0)

    if (dragStartPointWorld) {
      const dragStartPos2D = room?.transformWallElementWorldPointToPlane(dragStartPointWorld, elementId)
      if (dragStartPos2D) {
        dragStartOffset2D = new THREE.Vector2().subVectors(startElementPos2D, dragStartPos2D)
      }
    }

    this.draggingParams = {
      startWallId: wallElement.wallId,
      startElementPos2D,
      dragStartOffset2D,
      prevElementPos2D: startElementPos2D,
      prevWallId: wallElement.wallId,
      horizontalAxisState: WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED,
      verticalAxisState: WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED
    }

    this.snapWallElementToDraggingAxes(startElementPos2D, wallElement.wallId, wallElement.class)
  }

  private startHover(entityId: string, entityType: InteractableItemType) {
    this.hoverEntity = {
      id: entityId,
      type: entityType,
    }

    this.viewer.dispatchEvent({
      type: INPUT_HANDLER_HOVER_START,
      id: entityId,
      objectType: entityType,
      isSelected: entityId === this.selectedEntity?.id,
    })
  }

  private stopHover() {
    const isSelected = this.selectedEntity?.id === this.hoverEntity?.id
    const id = this.hoverEntity?.id
    const objectType = this.hoverEntity?.type
    this.hoverEntity = null
    this.viewer.dispatchEvent({
      type: INPUT_HANDLER_HOVER_END,
      id,
      objectType,
      isSelected,
    })
  }

  private startSelect(entityId: string, entityType: InteractableItemType) {
    this.selectedEntity = {
      id: entityId,
      type: entityType,
    }
    this.viewer.dispatchEvent({
      id: entityId,
      objectType: entityType,
      type: INPUT_HANDLER_SELECT_START,
    })
  }

  private stopSelect() {
    if (!this.selectedEntity) {
      return
    }
    const id = this.selectedEntity.id
    const objectType = this.selectedEntity.type
    this.selectedEntity = null
    this.viewer.dispatchEvent({
      type: INPUT_HANDLER_SELECT_END,
      id,
      objectType,
    })
  }

  private isDragEnabledForType(type: InteractableItemType) {
    let result = true
    switch(type) {
      case OBJECT_TYPE_WALL:
        result = this.wallsDragEnabled
        break
      case OBJECT_TYPE_WALL_ELEMENT:
        result = this.wallElementsDragEnabled
        break
      default:
        break
    }
    return result
  }
}