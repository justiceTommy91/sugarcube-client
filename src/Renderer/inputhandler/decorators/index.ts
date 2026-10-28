import FurnitureItem3D from "Renderer/model/FurnitureItem3D"
import ArtItem3D from "Renderer/model/ArtItem3D";
import { RenderItem3D } from "Renderer/model/RenderItem3D";
import { InteractiveItem } from "../types";
import { RenderItem3DDecorator } from "./RenderItem3DDecorator"
import { FurnitureItem3DDecorator } from "./FurnitureItem3DDecorator"
import { ArtItem3DDecorator } from "./ArtItem3DDecorator";

// A factory function to generate an InteractiveItem. This is done by decorating
// a RenderItem with additional input handling features. The appropriate
// decorator is chosen based on whether the RenderItem is a FurnitureItem.
export function createInteractiveItem(item: RenderItem3D): InteractiveItem {
  if (item instanceof FurnitureItem3D) {
    return FurnitureItem3DDecorator.create(item, FurnitureItem3DDecorator);
  }
  if (item instanceof ArtItem3D) {
    return ArtItem3DDecorator.create(item, ArtItem3DDecorator);
  }
  return RenderItem3DDecorator.create(item, RenderItem3DDecorator);
}
