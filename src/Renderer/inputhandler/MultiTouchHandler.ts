import type { Point2D } from 'Renderer/geomviewer/geom_types';

class MultiTouchHandler {
  private activeTouches: Map<number, Point2D> = new Map();
  private originalDeltaAngle = 0;
  /**
   * Tracks when a user started a multi-touch gesture and have now finished it (by lifting all fingers)
   */
  private isMultiTouchFinished = true;
  /**
   * Set to true when the active touch count drops from ≥2 to exactly 1.
   * Signals that the drag offset should be re-anchored on the next move so
   * the item doesn't snap to the remaining finger's position.
   */
  private justTransitionedFromMultiTouch = false;

  public onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      this.activeTouches.set(event.pointerId, [event.clientX, event.clientY]);
    }
    if (this.activeTouches.size > 1) {
      // The user has started a multi-touch gesture
      this.setIsMultiTouchFinished(false);
      this.setOriginalDeltaAngle(this.getMultiTouchDeltaAngle());
    }
  }

  public onPointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch' && this.activeTouches.has(event.pointerId)) {
      this.activeTouches.set(event.pointerId, [event.clientX, event.clientY]);
    }
  }

  public onPointerUp(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      this.activeTouches.delete(event.pointerId);
      if (!this.getIsMultiTouch()) {
        // Dropped below multi-touch threshold — gesture is complete
        this.setIsMultiTouchFinished(true);
        if (this.activeTouches.size === 1) {
          // Exactly one finger remains: flag so the drag offset is re-anchored
          // on the next move to prevent the item snapping to the finger position.
          this.justTransitionedFromMultiTouch = true;
        }
      }
    }
  }

  public getIsZeroTouches(): boolean {
    return this.activeTouches.size === 0;
  }

  public getIsMultiTouch(): boolean {
    return this.activeTouches.size > 1;
  }

  public getOriginalDeltaAngle(): number {
    return this.originalDeltaAngle;
  }

  public setOriginalDeltaAngle(angle: number) {
    this.originalDeltaAngle = angle;
  }

  public getIsMultiTouchFinished(): boolean {
    return this.isMultiTouchFinished;
  }

  public setIsMultiTouchFinished(isFinished: boolean) {
    this.isMultiTouchFinished = isFinished;
    if (!isFinished) {
      // A new multi-touch gesture is starting; clear any pending re-anchor flag.
      this.justTransitionedFromMultiTouch = false;
    }
  }

  public getJustTransitionedFromMultiTouch(): boolean {
    return this.justTransitionedFromMultiTouch;
  }

  public clearJustTransitionedFromMultiTouch(): void {
    this.justTransitionedFromMultiTouch = false;
  }

  /**
   * @returns the angle (in radians) between the two touch points
   */
  public getMultiTouchDeltaAngle(): number {
    const [point1, point2] = this.activeTouches.values();
    const dx = point2[0] - point1[0];
    const dy = point2[1] - point1[1];
    return Math.atan2(dy, dx);
  }

  /**
   * @returns the change in angle (in radians) between the two touch points
   */
  public getMultiTouchDeltaAngleChange(): number {
    return this.getMultiTouchDeltaAngle() - this.originalDeltaAngle;
  }
}

export { MultiTouchHandler };