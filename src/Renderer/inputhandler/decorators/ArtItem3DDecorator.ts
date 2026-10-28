import ArtItem3D from "Renderer/model/ArtItem3D";
import { RenderItem3DDecorator } from "./RenderItem3DDecorator";

export class ArtItem3DDecorator extends RenderItem3DDecorator<ArtItem3D> {
  onHover = () => this.renderItem.onHover()
  onHoverEnd = () => this.renderItem.onHoverEnd()
  onSelect = () => this.renderItem.onSelect()
  onSelectEnd = () => this.renderItem.onSelectEnd()
}
