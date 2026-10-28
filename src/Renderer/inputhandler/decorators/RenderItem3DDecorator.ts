/* eslint-disable class-methods-use-this */
import { PointXY } from "Renderer/geomviewer/geom_types";
import { RenderItem3D } from "Renderer/model/RenderItem3D";
import { InteractiveItem } from "../types";

/*
  The RenderItemDecorator class serves as a base class for 'decorators',
  implementing the InteractiveItem interface which is a subset of RenderItem
  interface.

  All interface methods from InteractiveItem are delegated to the
  underlying FurnitureItem instance without additional logic.

  The class maintains a WeakMap to store previously created instances,
  allowing for efficient retrieval of existing wrappers without creating duplicates.
*/
export class RenderItem3DDecorator<T extends RenderItem3D> implements InteractiveItem {
  protected renderItem: T;

  protected constructor(renderItem: T) {
    this.renderItem = renderItem;
  }

  // WeakMap to store (weakly) previously created instances.
  private static decoratedInstances = new WeakMap<RenderItem3D, RenderItem3DDecorator<RenderItem3D>>();

  // Factory method to create a wrapped RenderItem instance.
  static create<T extends RenderItem3D>(original: T,
    DecoratorClass: typeof RenderItem3DDecorator<T>): RenderItem3DDecorator<T> {
    const cachedItem = RenderItem3DDecorator.decoratedInstances.get(original);
    if (cachedItem) {
      return cachedItem as RenderItem3DDecorator<T>;
    }

    const wrapper = new DecoratorClass(original);
    RenderItem3DDecorator.decoratedInstances.set(original, wrapper);
    return wrapper;
  }

  // Delegate remaining interface methods that do not require
  // additional logic.
  onDragFinish = () => this.renderItem.onDragFinish();
  dragTargetToScreenPoint = (xy: PointXY, dragOffset?: PointXY) => 
    this.renderItem.dragTargetToScreenPoint(xy, dragOffset)

  onHover = () => {};
  onHoverEnd = () => {};
  onSelect = () => {};
  onSelectEnd = () => {};
  onDragStart = () => this.renderItem.onDragStart();
  setVisible = (shouldBeVisible: boolean) => this.renderItem.setVisible(shouldBeVisible);
  getDragReferencePointOnScreen = () => this.renderItem.getDragReferencePointOnScreen()

  get supportsOrientation() { return false }
}
