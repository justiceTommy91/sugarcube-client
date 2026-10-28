import FurnitureItem3D from "Renderer/model/FurnitureItem3D";
import type { PointXY } from "Renderer/geomviewer";
import { RenderItem3DDecorator } from "./RenderItem3DDecorator";

export class FurnitureItem3DDecorator extends RenderItem3DDecorator<FurnitureItem3D> {
  // For combinables in sockets, we target the root parent for repositioning,
  // even if the actual target is the combinable child.
  getRealTarget = () => {
    if (this.renderItem.usesSockets()) {
      return (this.renderItem.getRootFurnitureParent() || this.renderItem) as FurnitureItem3D
    }
    return this.renderItem
  }

  // FurnitureItem only, optional orientation methods.
  toNextSnapRotation = () => this.getRealTarget().toNextSnapRotation();
  setOrientation = (heading: number) => this.getRealTarget().setOrientation(heading)
  getOrientation = () => this.getRealTarget().getOrientation()
  onDragFinish = () => this.getRealTarget().onDragFinish();
  dragTargetToScreenPoint = (xy: PointXY, dragOffset?: PointXY) => 
    this.getRealTarget().dragTargetToScreenPoint(xy, dragOffset)
  
  onDragStart = () => this.getRealTarget().onDragStart();
  getDragReferencePointOnScreen = () => this.getRealTarget().getDragReferencePointOnScreen()

  // eslint-disable-next-line class-methods-use-this
  get supportsOrientation() { return true }

  onHover = () => {
    this.renderItem.onHover()
    this.renderItem.getLinkedSiblings().forEach(sibling => sibling.onHover())
  }

  onHoverEnd = () => {
    this.renderItem.onHoverEnd()
    this.renderItem.getLinkedSiblings().forEach(sibling => sibling.onHoverEnd())
  }
  
  onSelect = () => {
    this.renderItem.onSelect()
    this.renderItem.getLinkedSiblings().forEach(sibling => sibling.onSelect())
  }

  onSelectEnd = () => {
    this.renderItem.onSelectEnd()
    this.renderItem.getLinkedSiblings().forEach(sibling => sibling.onSelectEnd())
  }

  getProductId = () => this.renderItem.getFurnitureData().id
}
