import { gvCurrentScene } from 'Renderer/foundation/geom_app'
import type { RenderItem3D } from 'Renderer/model/RenderItem3D'
import type FurnitureItem3D from 'Renderer/model/FurnitureItem3D'
import type StackableSurfaceItem3D from 'Renderer/model/StackableSurfaceItem3D'
import { PolygonType } from 'Renderer/assets/Types'
import * as pu from 'Renderer/positioning/positioning_utilities'
import Renderer from "Renderer"
import type ArtItem3D from 'Renderer/model/ArtItem3D'

export function getRenderItem3D(id: string): RenderItem3D | null {
  const scene = gvCurrentScene()
  if (!scene) {
    return null
  }
  const renderItem = scene.getRenderItem(id) || scene.getStackableSurfaceItem(id)
  return renderItem || null
}

export function getFurnitureItem3D(id: string): FurnitureItem3D | null {
  const renderItem = gvCurrentScene()?.getRenderItem(id)
  if (renderItem?.isFurnitureItem()) {
    return renderItem as FurnitureItem3D
  }
  return null
}

export function getStackableSurfaceItem3D(id: string): StackableSurfaceItem3D | null {
  const renderItem = gvCurrentScene()?.getStackableSurfaceItem(id)
  if (renderItem?.isStackableSurfaceItem()) {
    return renderItem as StackableSurfaceItem3D
  }
  return null
}

export function isStackableSurfaceItem3D(item: RenderItem3D | undefined | null): item is StackableSurfaceItem3D {
  return item !== null && item !== undefined && item.isStackableSurfaceItem()
}

export function isFurnitureItem3D(item: RenderItem3D | undefined | null): item is FurnitureItem3D {
  return item !== null && item !== undefined && item.isFurnitureItem()
}

export function isArtItem3D(item: RenderItem3D | undefined | null): item is ArtItem3D {
  return item !== null && item !== undefined && item.isArtItem()
}

/**
 * Determines if product dimensions should be shown for a render item.
 * Returns false for combinable child items (e.g., duvet covers, pillow covers).
 * @param item The render item to check
 * @returns true if dimensions should be shown, false otherwise
 */
export function shouldShowProductDimensions(item: RenderItem3D | undefined | null): boolean {
  return !(isFurnitureItem3D(item) && item.isCombinableChild())
}

// TODO: replace all callers simply with 3d implementation method
// when legacy renderItems are deprecated.
export function getParentAttachmentPolygon(item: RenderItem3D): PolygonType | undefined {
  const polygonId = Number(item.getLocation().bindTo)
  if (polygonId == null) {
    return undefined
  }
  return pu.getPolygonById(polygonId)
}

// TODO (luis): https://geomagical.atlassian.net/browse/GFX-3996
export function showAllSurfacesExcept(show: boolean, except: string[] = []) {
  const scene = gvCurrentScene()
  const renderer = Renderer.getInstance() // Undesired. Will get rid of this in GFX-3996.
  if (!scene || !renderer) {
    return  
  }

  for (const sceneObject of scene.getAllStackableSurfaces().values()) {
    if (!renderer?.getIsSurfaceErased(sceneObject.getId()) && !except.includes(sceneObject.getId())) {
      sceneObject.setVisible(show);
    }
  }
}

export function getStackingSurface(surfaceId: string) {
  return gvCurrentScene()?.getStackableSurfaceItem(surfaceId?.toString())
}

// Return an array of stackable surfaces - i.e. surfaces on which other items likes
// accessories can be stacked -- for item with ID <itemId>. Returns an empty array if there
// is no such stackable surface.
export function getStackableSurfacesForRenderItem(itemId: number | string ) {
  return gvCurrentScene()?.getStackableSurfacesForRenderItem(itemId?.toString())
}
