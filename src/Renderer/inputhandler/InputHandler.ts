import * as THREE from 'three'
import Renderer, { StackableSurfaceQueryResult } from "Renderer";
import {
  UiEventPayload,
  SceneItemUpdateNotification,
  ViewerStateUpdateNotification,
} from "Renderer/geomviewer/geom_notifications";
import { NOTIFY_SCENE_ITEM_UPDATE, NOTIFY_VIEWER_STATE_UPDATE } 
from "Renderer/geomviewer/geom_constants";
import { SceneItemParameters, Point2D, PointXY, Placement } from "Renderer/geomviewer/geom_types";
import { GrandCentral } from "Renderer/GrandCentral";
import { gvCurrentScene, gvViewManager } from "Renderer/foundation/geom_app"
import { FLOOR_STACKABLE_SURFACE_ID, EXTRA_HINT_STACKABLE } from 'Renderer/constants';
import * as pu from 'Renderer/positioning/positioning_utilities'
import type { RenderItem3D } from 'Renderer/model/RenderItem3D';
import { isFurnitureItem3D, showAllSurfacesExcept, getStackingSurface } from "Renderer/rendering/scene_utils";
import { getHasPointChanged } from "Renderer/geometry/utilities";
import { getRelXY, PlacementModeStatus } from "./input_utils";
import { MultiTouchHandler } from "./MultiTouchHandler";
import { createInteractiveItem } from "./decorators";
import { 
    FurnitureOrientationInterface,
    InputState,
    PlacementBeginMode,
    PlacementStoppageMode,
} from "./types";

type PendingStackableInfo = {
  id: string,
  parameters: SceneItemParameters
}

// Optional properties that can be used to call <notify> with named arguments.
type NotificationPayloadBuildOptions = {
    discardNewItem?: boolean
    isDragDestinationValid?: boolean
    surfaceHit?: Pick<StackableSurfaceQueryResult, 'worldPoint' | 'parentPoint' | 'localPoint'>
    hasStackableChangedSurface?: boolean
} 

/**
 * Listens to mouse, pointer & keyboard events from the UI, coming through
 * GeomViewer API, uses Renderer to place stackables, reposition items,
 * select/deselect, hover items.
 */
class InputHandler {
  private readonly renderer: Renderer;

  // This controls how far pointer has to move in pixels before input is
  // considered 'Dragging' instead of click.
  private hoverThresholdPixelsSq = 9;

  private inputState: InputState = InputState.Idle;
  private activeItemId?: string;
  private selectedItemId?: string;
  private mouseDownPos?: [number, number];
  private dragOffset: [number, number] = [0, 0];
  private pendingStackable?: PendingStackableInfo;
  // Mouse down events doesn't immediately start a drag sequence. Instead we monitor the <distToMouseDownSq> traveled
  // and only if it exceeds the <hoverThresholdPixelsSq> we go into Dragging state. 
  private isEvaluatingSwitchFromHoverToDrag = false

  // Used to indicate that the input states are changing in response to cancelling placing
  // a stackable item in the scene.
  private placementModeInfo: PlacementModeStatus = new PlacementModeStatus()

  // To notify ValidOrInvalidDestinationCursor on the first <handlePlacingMove> call.
  private isDestValidUpdatedOnFirstMove = false
  // These <OnDragStart> variables are for the stackables surface switching while dragging.Aka StackableDragging mode.
  // To keep state at the drag start to restore position in case of cancel.
  private placementOnDragStart: Placement | null = null
  private headingOnDragStart: number | null = null
  // To detect surface changes for the telemetry.
  private parentIdAtPlacementModeOrDragStart: string | null = null
  // Detects multiple touches for multi-touch gestures.
  private multiTouchHandler: MultiTouchHandler;

  constructor(renderer: Renderer) {
    this.renderer = renderer
    this.multiTouchHandler = new MultiTouchHandler();
  }

  // Returns current input handling state.
  getCurrentState() {
    return this.inputState
  }

  // Returns pending stackable data in stackable placement mode,
  // undefined in other states.
  getPendingStackable(): PendingStackableInfo | undefined {
    return this.pendingStackable
  }

  // Returns currently selected item's id.
  getSelectedItemId(): string | undefined {
    return this.selectedItemId
  }

  // =======================================================================
  // Listeners for mouse/keyboard events.
  // =======================================================================

  public onClick = (event: MouseEvent) => {
    switch (this.inputState) {
      case InputState.MagicEraser:
        this.handleMagicEraserClick(event);
        break;
      case InputState.Placing:
        this.handlePlacingClick(event);
        break;
      case InputState.Idle:
      case InputState.Hovering:
        // For touch devices we need to handle teleported pointer.
        this.handleMove(event);
        break;
      default:
        this.deselectItem();
        break;
    }
  }

  public deselectAll = () => {
    switch (this.inputState) {
      case InputState.Hovering:
      case InputState.Idle:
      case InputState.Dragging:
        this.deselectItem();
        break;
      default: break;
    }
  }

  public onPointerMove = (event: PointerEvent) => {
    this.multiTouchHandler.onPointerMove(event);
    switch (this.inputState) {
      case InputState.MagicEraser:
        this.handleMagicEraserMove(event);
        break;
      case InputState.Idle:
        this.handleMove(event);
        break;
      case InputState.Hovering:
        this.handleHover(event);
        break;
      case InputState.Dragging:
        this.handleDrag(event);
        break;
      case InputState.Placing:
        this.handlePlacingMove(event);
        break;
      default: break;
    }
  }

  public onPointerDown = (event: PointerEvent) => {
    this.multiTouchHandler.onPointerDown(event);
    // We only care about primary mouse button.
    // This prevents accidental 'sticking' with right mouse click.
    if (event.buttons > 1) {
      return;
    }

    if (
      this.inputState !== InputState.MagicEraser &&
      this.inputState !== InputState.Noop) {
      // For touch devices we need to handle teleported pointer.
      this.onPointerMove(event);
    }

    switch (this.inputState) {
      case InputState.Idle:
        // When inspector is active, we don't want to deselect item by clicking away.
        if (!this.renderer.debugSettings.enableObjectInspector) {
          this.deselectItem();
        }
        break;
      case InputState.Hovering:
        this.mouseDownPos = [event.clientX, event.clientY];
        // Prevents onPointerLeave call for the specific case of click in a pin border and hover inside. 
        this.isEvaluatingSwitchFromHoverToDrag = !!(this.pickObject(getRelXY(event)));
        // On touch, select immediately on finger-down rather than waiting for pointerup.
        // This gives instant visual feedback compared to the latency of waiting for lift.
        if (event.pointerType === 'touch') {
          this.selectItem();
        }
        break;
      default: break;
    }
  }

  public onPointerUp = (event: PointerEvent) => {
    this.multiTouchHandler.onPointerUp(event);
    this.mouseDownPos = undefined;

    switch (this.inputState) {
      case InputState.Hovering:
        this.selectItem();
        break;
      case InputState.Dragging:
        // Only once all touches are released do we want to select the item
        if (this.multiTouchHandler.getIsZeroTouches()) {
          this.selectItem();
          this.handleDragUp(event);
        }
        break;
      default: break;
    }
  }

  public onPointerLeave = (event: PointerEvent) => {
    this.multiTouchHandler.onPointerUp(event);
    const switchFromHoverToIdle = this.inputState === InputState.Hovering && !this.isEvaluatingSwitchFromHoverToDrag
    if (this.inputState === InputState.Dragging || switchFromHoverToIdle) {
      // Browsers fire pointerleave immediately after pointerup for touch pointers.
      // If other touch pointers are still active, don't exit the drag state — the
      // remaining finger should be able to keep interacting with the item.
      if (!this.multiTouchHandler.getIsZeroTouches()) {
        return;
      }
      this.mouseDownPos = undefined;
      if (this.getActiveStackableItem()) {
        this.stopStackableDraggingMode()
      } else {
        this.switchState(InputState.Idle)
      }
    }
  }

  public onPointerOver = (event: PointerEvent) => {
    this.mouseDownPos = undefined;

    switch (this.inputState) {
      case InputState.Dragging:
        if (event.buttons === 0) {
          // This means pointerdown happened in canvas then pointerup happened
          // outside canvas, so we consider this same as drag up event.
          this.handleDragUp(event);
        }
        break;
      case InputState.Placing:
        this.handlePlacingMove(event);
        break;
      default: break;
    }
  }

  public onKeyDown = (event: KeyboardEvent) => {
    this.mouseDownPos = undefined;

    switch (this.inputState) {
      case InputState.Idle:
      case InputState.Hovering:
      case InputState.Dragging:
        this.handleKeyDown(event);
        break;
      default: break;
    }
  }

  // =======================================================================
  // Other public UI commands.
  // =======================================================================

  public startMagicEraser() {
    switch (this.inputState) {
      case InputState.Idle:
        this.switchState(InputState.MagicEraser);
        break;
      default: break;
    }
  }

  public stopMagicEraser() {
    switch (this.inputState) {
      case InputState.MagicEraser:
        this.switchState(InputState.Idle);
        break;
      default: break;
    }
  }

  public startPlacementMode(uniqueId: string, furnitureData: SceneItemParameters) {
    // We know if we are on add or move mode depending on if there is a placement to keep.
    // In a brand new added item, there is no position we need to keep in case user cancels. 
    const isAddOrMoveMode = furnitureData.placement
        ? PlacementBeginMode.Move
        : PlacementBeginMode.Add
    this.placementModeInfo.setBeginMode(isAddOrMoveMode)

    switch (this.inputState) {
      case InputState.Idle:
      case InputState.Hovering:
        this.pendingStackable = {
          id: uniqueId,
          parameters: furnitureData
        }
        this.switchState(InputState.Placing);
        this.notify(`BeginPlacementModeWithItem`);
        break;
      default: break;
    }
  }

  public stopPlacementMode(cancelling: boolean) {
    if (cancelling) {
      this.placementModeInfo.setCancellingMode();
    } else {
      this.placementModeInfo.setSuccessfulPlacement(PlacementStoppageMode.SuccessfulPlacementUI)
    }
    switch (this.inputState) {
      case InputState.Placing:
        this.switchState(InputState.Idle);
        break;
      default: break;
    }
    this.placementModeInfo.reset();
  }

  private stopStackableDraggingMode(isStackableDragCancel = false) {
    const stackableItem = this.getActiveStackableItem()
    if (!stackableItem) {
      return
    }

    if (this.placementOnDragStart && this.headingOnDragStart !== null) {
      if (!stackableItem.getIsVisible() || isStackableDragCancel) {
        stackableItem.setPlacement(this.placementOnDragStart);
        stackableItem.setOrientation(this.headingOnDragStart)
        stackableItem.setVisible(true)
      }
    }
    
    const surfChildIds = stackableItem.getChildren()
      .filter(child => child.isStackableSurfaceItem()).map(surf => surf.getId())
    showAllSurfacesExcept(false, surfChildIds);
    this.switchState(InputState.Idle);
  }

  public startNoop() {
    this.switchState(InputState.Noop);
  }

  public stopNoop() {
    this.switchState(InputState.Idle);
  }

  // Performs snap rotation action on the selected item
  // if available & fires SnapRotated notification on completion.
  public doSnapRotateSelected() {
    if (this.selectedItem?.toNextSnapRotation) {
      this.selectedItem.toNextSnapRotation();
    }
  }

  // Selects an item directly without click or tap event.
  // This is useful when scene is loaded with an already selected item,
  // or an item has to be selected externally.
  public doSelectItem(itemId: string) {
    this.activeItemId = itemId;
    this.selectItem();
  }

  // =======================================================================
  private get activeItem() {
    if (this.activeItemId) {
      // Renderer.getObjectIdAtPoint returns a numeric id but
      // Renderer.getRenderItem expects a string.
      const renderItem = this.renderer.getRenderItem(this.activeItemId) as RenderItem3D;
      if (renderItem) {
        return createInteractiveItem(renderItem);
      }
    }

    return undefined;
  }

  private get selectedItem() {
    if (this.selectedItemId) {
      const renderItem = this.renderer.getRenderItem(this.selectedItemId) as RenderItem3D;
      if (renderItem) {
        return createInteractiveItem(renderItem);
      }
    }

    return undefined;
  }

  private get hoveredStackableSurface() {
    if (this.activeItemId) {
      return getStackingSurface(this.activeItemId);
    }

    return undefined;
  }

  private pickObject(relXY: Point2D) {
    const numericId = this.renderer.getObjectIdAtPoint(relXY[0], relXY[1])
    if (numericId) {
      return String(numericId);
    }

    return undefined;
  }

  private switchState(newState: InputState, targetItemId?: string,
    event?: PointerEvent | KeyboardEvent) {
    // Before setting the new activeItemId or new inputState, we use the old
    // values for any exit state handling.
    switch (this.inputState) {
      case InputState.Placing:
        this.onPlacementModeExit();
        break;
      case InputState.Hovering:
        this.onHoveringExit();
        break;
      case InputState.Dragging:
        this.onDraggingExit();
        break;
      default: break;
    }

    this.inputState = newState;
    this.activeItemId = targetItemId;

    switch (this.inputState) {
      case InputState.Placing:
        this.onPlacementModeEnter();
        break;
      case InputState.Hovering:
        this.onHoveringEnter();
        break;
      case InputState.Dragging:
        this.onDraggingEnter(event as PointerEvent);
        break;
      default: break;
    }
  }

  private handleMove(event: MouseEvent) {
    const relXY = getRelXY(event);
    const itemUnderPointer = this.pickObject(relXY);
    if (itemUnderPointer) {
      const differentItem = this.activeItemId !== itemUnderPointer
      const differentState = this.inputState !== InputState.Hovering
      if (differentItem || differentState) {
        this.switchState(InputState.Hovering, itemUnderPointer)
      }
    }
    const currentScene = gvCurrentScene()
    if (currentScene) {
      currentScene.handleMouseMove(relXY[0], relXY[1])
    }
  }

  private deselectItem() {
    const selected = this.selectedItem;
    if (selected) {
      selected.onSelectEnd();
      // We must send notification before we delete the selection id
      // because notify uses selectedItemId.
      this.notify(`Deselected`);
      this.selectedItemId = undefined;
    }
  }

  private selectItem() {
    // Reselecting is possible and expected, but we don't deselect
    // if already selected.
    if (this.selectedItemId !== this.activeItemId) {
      this.deselectItem(); // This is needed to deselect any existing selection.
      this.selectedItemId = this.activeItemId;
    }
    this.selectedItem?.onSelect();
    this.notify(`Selected`);
  }

  private handleHover(event: PointerEvent) {
    const relXY = getRelXY(event);
    const itemUnderPointer = this.pickObject(relXY);

    this.isEvaluatingSwitchFromHoverToDrag = false;
    if (this.mouseDownPos) {
      const dx = event.clientX - this.mouseDownPos[0];
      const dy = event.clientY - this.mouseDownPos[1];
      const distToMouseDownSq = dx * dx + dy * dy
      this.isEvaluatingSwitchFromHoverToDrag = distToMouseDownSq < this.hoverThresholdPixelsSq

      // In inspector mode, objects are handled by their debug controls.
      if (!this.renderer.debugSettings.enableObjectInspector && !this.isEvaluatingSwitchFromHoverToDrag) {
        this.mouseDownPos = undefined; // clear after use
        this.switchState(InputState.Dragging, this.activeItemId, event);
      }

    } else if (!itemUnderPointer) {
      this.switchState(InputState.Idle);
    } else if (this.activeItemId !== itemUnderPointer) {
      // We are reentering Hovering state but switching the active item id.
      // This means user was already hovering but jumped on to another item.
      this.switchState(InputState.Hovering, itemUnderPointer);
    }
  }

  private handleDrag(event: PointerEvent) {
    const dragged = this.activeItem;
    const selected = this.selectedItem;
    if (!dragged) return;
    const isMultiTouch = this.multiTouchHandler.getIsMultiTouch();

    if (event.shiftKey && dragged.supportsOrientation) {
      const draggedOrientable = dragged as FurnitureOrientationInterface;

      const deltaX = event.movementX;
      const orientation = draggedOrientable.getOrientation();

      // This is the empirically set magic number from existing React UI
      // used for scaling mouse movement in pixels to angle change.
      const scale = 0.01;

      draggedOrientable.setOrientation(orientation + deltaX * scale);

      this.calcDragOffset(event)
    } else if (isMultiTouch && selected?.supportsOrientation) {
      // we only want to rotate the selected item with multi touch gesture
      const selectedOrientable = selected as FurnitureOrientationInterface;
      const currentOrientation = selectedOrientable.getOrientation();
      const currentDeltaAngle = this.multiTouchHandler.getMultiTouchDeltaAngle();
      const deltaAngleChange = this.multiTouchHandler.getMultiTouchDeltaAngleChange();
      selectedOrientable.setOrientation(currentOrientation - deltaAngleChange);
      this.multiTouchHandler.setOriginalDeltaAngle(currentDeltaAngle);
    } else {
      // If transitioning from a 2-finger rotate to a single finger, the stored
      // dragOffset is stale (it was never updated during rotation). Re-anchor it
      // so the item stays at its current rendered position on the first move and
      // then follows the finger naturally from there.
      if (this.multiTouchHandler.getJustTransitionedFromMultiTouch()) {
        this.calcDragOffset(event);
        this.multiTouchHandler.clearJustTransitionedFromMultiTouch();
      }
      const renderDim = this.renderer.getRenderDimensions();
      const relXYPixel = getRelXY(event, renderDim);
      const screenPos = { x: relXYPixel[0] + this.dragOffset[0], y: relXYPixel[1] + this.dragOffset[1] }
      const dragOffset = { x: this.dragOffset[0], y: this.dragOffset[1] }
      // <stackableItem>, <visibleBeforeDrag> only used if the active item is stackable.
      const stackableItem = this.getActiveStackableItem()
      const visibleBeforeDrag = stackableItem?.getIsVisible()
      // If a user has not fully completed with multitouch (not all fingers are off the screen)
      // we want to prevent dragging the item
      if (this.multiTouchHandler.getIsMultiTouchFinished()) {
        const dragResult = dragged.dragTargetToScreenPoint(screenPos, dragOffset)
        if (dragResult.referencePointChanged) {
          this.calcDragOffset(event, dragged.getDragReferencePointOnScreen())
        }
      }
      // While dragging <WallSnap> changes the orientation. Restore if item comes back to visible.
      if (!stackableItem) {
        return
      }

      if (this.headingOnDragStart !== null) {
        const stackableComesBackToVisible = !visibleBeforeDrag && visibleBeforeDrag !== stackableItem?.getIsVisible();
        if (stackableComesBackToVisible) {
          stackableItem.setOrientation(this.headingOnDragStart)
        }
      }
    }
  }

  private calcDragOffset(event: PointerEvent, newPos?: PointXY) {
    const dragged = this.activeItem;
    if (!dragged)
      return;

    // We need to save the offset amount from objects distance
    // to the current mouse location.
    const renderDim = this.renderer.getRenderDimensions();
    const relXYPixel = getRelXY(event, renderDim);
    const objectPosition = newPos || dragged.getDragReferencePointOnScreen();
    this.dragOffset = [
      objectPosition.x - relXYPixel[0],
      objectPosition.y - relXYPixel[1]
    ];
  }

  private handleSurfaceExit() {
    this.hoveredStackableSurface?.onDragFinish();
    this.hoveredStackableSurface?.setHighlighted(false);
    this.notify(`HoverEnd`);
    this.activeItemId = undefined;
  }

  private handleSurfaceEnter(id: string) {
    this.activeItemId = id;
    this.hoveredStackableSurface?.setHighlighted(true);
    this.hoveredStackableSurface?.onDragStart();
    this.notify(`HoverStart`);
  }

  // hoveredSurfId is passed in to check if it is the activeItemId. If its not this means hover state has changed
  // to a different surface. This method tracks the surface changes while hovering between 3 type of surfaces. 
  // These 3 type of surfaces are the 3 things hoveredSurfId can be. This is:
  // 1.- A StackableSurfaceItem id when hover is over a StackableSurface item.
  // 2.- FLOOR_STACKABLE_SURFACE_ID when hover is over a valid position in the floor.
  // 3.- undefined when hovered over any other. undefined id means hover is taking place over any other place
  // than a StackableSurfaceItem or a valid portion of the the floor.  
  // While hovering over the same surface, nothing happens. 
  private handleSurfaceChange(hoveredSurfId?: string) {
    const isSurfChange = this.activeItemId !== hoveredSurfId
    if (isSurfChange) {
      this.handleSurfaceExit();
      if (hoveredSurfId) {
        this.handleSurfaceEnter(hoveredSurfId);
      }
    }
  }

  private handlePlacingMove(event: PointerEvent) {
    const ghostItem = gvViewManager()?.getCurrentViewScene()?.getGhostItem()
    if (ghostItem) {
        const renderDim = this.renderer.getRenderDimensions();
        const relXYPixel = getRelXY(event, renderDim);
        const isPosValidBeforeSetPos = ghostItem.getIsVisible()
        const hoveredSurfId = ghostItem.setGhostPosition(relXYPixel)
        const isDestinationPosValid = !!hoveredSurfId
        ghostItem.setVisible(isDestinationPosValid)
        this.handleSurfaceChange(hoveredSurfId)
        if (isPosValidBeforeSetPos !== !!hoveredSurfId || !this.isDestValidUpdatedOnFirstMove) {
          this.notify(`ValidOrInvalidDestinationCursor`, {isDragDestinationValid: !!hoveredSurfId})
          this.isDestValidUpdatedOnFirstMove = true
        }
    }
  }

  private handlePlacingClick(event: MouseEvent) {
    this.placementModeInfo.setSuccessfulPlacement(PlacementStoppageMode.SuccessfulPlacementSurface);

    const relXY = getRelXY(event);
    const surfaceHit = gvCurrentScene()?.getStackableSurfaceAtPoint(relXY[0], relXY[1])
    const surfaceAvailable = !this.renderer?.getIsSurfaceErased(surfaceHit?.stackablePlaneId);

    // Find the correct hit. First check for stackable surface hit, if not check for floor hit.
    let hit: Pick<StackableSurfaceQueryResult, 'worldPoint' | 'parentPoint' | 'localPoint'> | null = null
    if (surfaceHit && surfaceAvailable ) {
      hit = {
        localPoint: surfaceHit?.localPoint,
        parentPoint: surfaceHit?.parentPoint,
        worldPoint: surfaceHit?.worldPoint,
      }
    }

    if (!hit) {
      const ghost = gvViewManager()?.getCurrentViewScene()?.getGhostItem()
      if ((ghost && ghost.isGhostItem())) {
        const renderDim = this.renderer.getRenderDimensions();
        const relXYPixel = getRelXY(event, renderDim);
        const hoveredSurfId = ghost.setGhostPosition(relXYPixel)
        const worldPosition = ghost.getWorldPosition()
        if (hoveredSurfId && worldPosition) {
          hit = {
            worldPoint: new THREE.Vector3(worldPosition.x, worldPosition.y, worldPosition.z),
            parentPoint: null,
            localPoint: null,
          }
        }
      } 
    }

    if (hit) {
      gvViewManager()?.getCurrentViewScene()?.hideGhost();
      this.notify(`PlacementModeSurfaceClicked`, {discardNewItem: false, surfaceHit: hit});
      this.switchState(InputState.Idle);
    } else {
      this.notify(`PlacementModeCanvasClicked`);
    }

    this.placementModeInfo.reset()
  }

  private handleMagicEraserClick(event: MouseEvent) {
    const relXY = getRelXY(event);
    this.renderer.onClick(relXY);
  }

  private handleMagicEraserMove(event: PointerEvent) {
    const relXY = getRelXY(event);
    this.renderer.onMouseMove(relXY);
  }

  private onPlacementModeEnter() {
    const scene =  gvCurrentScene()
    if (!scene) {
      return
    }

    showAllSurfacesExcept(true)

    // If placement mode was entered using an item in the scene (aka change surfaces),
    // we hide it, then unhide it when mode exits.
    const pendingItem = this.pendingStackable
      && this.renderer.getRenderItem(this.pendingStackable.id);
    if (pendingItem) {
      pendingItem.setVisible(false)
      this.parentIdAtPlacementModeOrDragStart = pendingItem.getParentId()
    }
  }

  private onPlacementModeExit() {
    // hide surfaces
    showAllSurfacesExcept(false)

    // hide ghost
    gvViewManager()?.getCurrentViewScene()?.hideGhost();

    // If placement mode was entered using an item in the scene (aka change surfaces),
    // we unhide it.
    const pendingItem = this.pendingStackable
      && this.renderer.getRenderItem(this.pendingStackable.id);
    pendingItem?.setVisible(true);

    // If we're cancelling placement and we're not working with an item already in the
    // scene, then the item is discarded. We need to let the UI know.
    const discardNewItem = this.placementModeInfo.isCancelling && !pendingItem;
    const hasStackableChangedSurface = pendingItem?.getParentId() !== this.parentIdAtPlacementModeOrDragStart
    this.notify(`EndPlacementModeWithItem`, {discardNewItem, hasStackableChangedSurface});
    this.notify(`ValidOrInvalidDestinationCursor`, {isDragDestinationValid: true})
    
    this.pendingStackable = undefined;
    this.activeItemId = undefined;
    this.isDestValidUpdatedOnFirstMove = false
    this.parentIdAtPlacementModeOrDragStart = null
  }

  private onHoveringEnter() {
    this.activeItem?.onHover();
    this.notify(`HoverStart`);
  }

  private onHoveringExit() {
    this.activeItem?.onHoverEnd();
    this.notify(`HoverEnd`);
    this.activeItemId = undefined;
  }

  private onDraggingEnter(event: PointerEvent) {
    this.activeItem?.onDragStart();
    this.calcDragOffset(event);
    const stackableItem = this.getActiveStackableItem()
    if (stackableItem) {
      this.placementOnDragStart = stackableItem.getPlacement()
      this.headingOnDragStart = stackableItem.orientation
      this.parentIdAtPlacementModeOrDragStart = stackableItem.getParentId()
    }
    this.notify(`DragStart`);

    if (stackableItem) {
      const surfChildIds = stackableItem.getChildren()
      .filter(child => child.isStackableSurfaceItem()).map(surf => surf.getId())
      showAllSurfacesExcept(true, surfChildIds)
      this.notify(`BeginStackableDraggingMode`)
    }
  }

  private onDraggingExit() {
    this.activeItem?.onDragFinish();
    const stackableItem = this.getActiveStackableItem()
    const hasStackableChangedSurface = !!stackableItem && 
      stackableItem.getParentId() !== this.parentIdAtPlacementModeOrDragStart
    this.notify(`DragEnd`, {hasStackableChangedSurface});
    if (stackableItem) {
      showAllSurfacesExcept(false);
      this.notify(`EndStackableDraggingMode`)
      this.notify(`ValidOrInvalidDestinationCursor`, {isDragDestinationValid: true})
      this.placementOnDragStart = null
      this.headingOnDragStart = null
      this.parentIdAtPlacementModeOrDragStart = null
    }
  }

  private switchToHoverOrIdle(itemUnderPointer: string | undefined, event: PointerEvent) {
    const switchToHover = itemUnderPointer && event.pointerType !== 'touch'
    if (switchToHover) {
      this.switchState(InputState.Hovering, itemUnderPointer);
    } else {
      this.switchState(InputState.Idle);
    }
  }

  private handleDragUp(event: PointerEvent) {
    const relXY = getRelXY(event);
    const itemUnderPointer = this.pickObject(relXY);
    const stackableItem = this.getActiveStackableItem()
    // Current dragged stackableItem available means we are in StackableDraggingMode.
    if (stackableItem) {
      if (stackableItem.getIsVisible()) {
        this.switchToHoverOrIdle(itemUnderPointer, event)
      } else {
        this.stopStackableDraggingMode()
      }
    } else {
      this.switchToHoverOrIdle(itemUnderPointer, event)
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'c':
        if (this.renderer.debugSettings.enableFocus) {
          this.notify(`ToggleFocus`);
        }
        return;
      case 'Escape': 
        if (this.inputState === InputState.Dragging) {
          if (this.getActiveStackableItem()) {
            this.stopStackableDraggingMode(true)
          }
        }
        break;
      default:
        break;
    }

    const item = this.selectedItem;
    if (!item) return;

    const curPos = item.getDragReferencePointOnScreen();
    const moveBy = 10; // Same value defined in ReactUI for arrow key movement.
    const move = {
      x: curPos.x,
      y: curPos.y,
      timeStamp: event.timeStamp,
      event
    }
    let shouldMove = false;

    switch (event.key) {
      case 'ArrowUp':
        move.y -= moveBy;
        shouldMove = true;
        break;
      case 'ArrowDown':
        move.y += moveBy;
        shouldMove = true;
        break;
      case 'ArrowLeft':
        move.x -= moveBy;
        shouldMove = true;
        break;
      case 'ArrowRight':
        move.x += moveBy;
        shouldMove = true;
        break;
      default:
        break;
    }

    if (shouldMove)
      item.dragTargetToScreenPoint({ x: move.x, y: move.y });
  }

  // Get the active FurnitureItem3D. Aditionally tells if the active item is a <Furniture3D> and if it stacks.
  private getActiveStackableItem() {
    if (!this.activeItemId) {
      return null
    }

    const furnitureItem = this.renderer.getRenderItem(this.activeItemId)
    if (!isFurnitureItem3D(furnitureItem) || !furnitureItem.getCanStack()) {
      return null
    }

    return furnitureItem
  }

  private isLocalPosChanged() {
    const stackableItem = this.getActiveStackableItem()
    if (!stackableItem || !this.placementOnDragStart) {
      return false
    }
    const currentPos = stackableItem.getLocation().localPos
    const dragStartPos = this.placementOnDragStart.location3.localPos

    return getHasPointChanged(currentPos, dragStartPos)
  }

  private notify(stateInfo: UiEventPayload['stateInfo'], payloadBuildOptions?: NotificationPayloadBuildOptions) { 
    const { 
      discardNewItem = false, 
      isDragDestinationValid = true,  
      surfaceHit, 
      hasStackableChangedSurface = false 
    } = payloadBuildOptions || {};

    let notification: SceneItemUpdateNotification | ViewerStateUpdateNotification | undefined;
    let itemId = this.activeItemId;

    if (stateInfo === 'Deselected' || stateInfo === 'Selected') {
      itemId = this.selectedItemId;
    }

    switch (stateInfo) {
      case 'BeginPlacementModeWithItem':
      case 'PlacementModeCanvasClicked':
        if (this.pendingStackable?.id) {
          notification = {
            what: NOTIFY_SCENE_ITEM_UPDATE,
            payload: {
              stateInfo,
              itemId: this.pendingStackable.id,
            }
          }
        }
        break;
      case 'EndPlacementModeWithItem':
        if (this.pendingStackable?.id && this.placementModeInfo.stoppageMode !== PlacementStoppageMode.None) {
          const placementModeInfo = this.placementModeInfo.getSuccessfulPlacementModeStatus()
          const stackablePlacementTelemetry = placementModeInfo && {
            ...placementModeInfo,
            hasStackableChangedSurface
          }
          notification = {
            what: NOTIFY_SCENE_ITEM_UPDATE,
            payload: {
              itemId: this.pendingStackable.id,
              stateInfo,
              itemData: {
                discardItem: discardNewItem,
              },
              stackablePlacementTelemetry
            }
          }
        }
        break;
      case 'PlacementModeSurfaceClicked':
        if (itemId && surfaceHit?.worldPoint) {
          // Here we fire the StackableSurfaceClicked or FloorClicked notification which indicates
          // stackable placement session ended with user clicking on a surface, with
          // the intent of placing the item.
          //
          // pendingStackableItem at this point still has the original scene item parameters,
          // we need to modify it to reflect user's clicked surface and location on that surface.
          if (this.pendingStackable?.parameters.itemKind === 'furniture-item') {
            // Compute legacy 2D position from world position.
            // TODO (cang): This would be a good place to use our own geometry/Vector3 and Matrix4
            // implementations instead of threejs.
            const projectedPos = surfaceHit.worldPoint.clone().project(this.renderer.getCamera());
            const [canvasWidth, canvasHeight] = this.renderer.getRenderDimensions();

            // Convert NDC to screen coordinates.
            this.pendingStackable.parameters.legacyPosition = [
              (projectedPos.x + 1.0) * 0.5 * canvasWidth,
              (1.0 - projectedPos.y) * 0.5 * canvasHeight
            ];

            if (surfaceHit.parentPoint) {
              this.pendingStackable.parameters.restoredPosition = [
                surfaceHit.parentPoint.x,
                surfaceHit.parentPoint.y,
                surfaceHit.parentPoint.z
              ];
            }

            const stackOnSurfaceId = itemId === FLOOR_STACKABLE_SURFACE_ID ? undefined : itemId
            this.pendingStackable.parameters.itemOptions = {
              ...this.pendingStackable.parameters.itemOptions,
              // stackOnSurfaceId undefined means the item is on the floor.
              stackOnSurfaceId,
            };

            // Setup 3D placement.
            const localPoint = surfaceHit.localPoint || surfaceHit.worldPoint
            const localPos = {
              x: localPoint.x,
              y: localPoint.y,
              z: localPoint.z,
            }
            const floorId = String(pu.getFloorPlane()?.id)
            if (this.pendingStackable.parameters.placement) {
              this.pendingStackable.parameters.placement.location3.localPos = localPos
              if (stackOnSurfaceId) {
                this.pendingStackable.parameters.placement.location3.bindTo = stackOnSurfaceId
                this.pendingStackable.parameters.placement.location3.hintExtraBindTo = EXTRA_HINT_STACKABLE
              } else {
                this.pendingStackable.parameters.placement.location3.bindTo = floorId
                delete this.pendingStackable.parameters.placement.location3.hintExtraBindTo
              }
            } else {
              this.pendingStackable.parameters.placement = {
                kind: `location3`,
                location3: {
                  localPos,
                  bindTo: stackOnSurfaceId || floorId,
                },
              }
              if (stackOnSurfaceId) {
                this.pendingStackable.parameters.placement.location3.hintExtraBindTo = EXTRA_HINT_STACKABLE
              }
            }
          }

          notification = {
            what: NOTIFY_SCENE_ITEM_UPDATE,
            payload: {
              itemId,
              stateInfo,
              itemData: {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                pendingStackableItem: this.pendingStackable!.parameters,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                pendingStackableUniqueId: this.pendingStackable!.id
              }
            }
          }
        }
        break;
      case 'ToggleFocus':
          notification = {
            what: NOTIFY_VIEWER_STATE_UPDATE,
            payload: {
              itemId: this.selectedItemId,
              stateInfo,
            }
          }
        break;
      case `ValidOrInvalidDestinationCursor`: 
        notification = {
          what: NOTIFY_VIEWER_STATE_UPDATE,
          payload: {
            stateInfo,
            isDragDestinationValid,
          }
        }
        break
      case `EndStackableDraggingMode`:
      case `BeginStackableDraggingMode`: 
        notification = {
          what: NOTIFY_VIEWER_STATE_UPDATE,
          payload: {
            stateInfo,
          }
        }
        break
      case `DragEnd`:   
        if (itemId) {
          const dragSuccessfull = hasStackableChangedSurface || this.isLocalPosChanged() 
          const stackablePlacementTelemetry = dragSuccessfull ? {hasStackableChangedSurface} : undefined
          notification = {
            what: NOTIFY_SCENE_ITEM_UPDATE,
            payload: {
              itemId,
              stateInfo,
              stackablePlacementTelemetry
            }
          }
        }   
        break
      default:
        if (itemId) {
          notification = {
            what: NOTIFY_SCENE_ITEM_UPDATE,
            payload: { itemId, stateInfo }
          }
        }
        break;
    }

    if (notification) {
      GrandCentral.getDispatcher().dispatchNotification(notification);
    }
  }
}

export { InputHandler }
