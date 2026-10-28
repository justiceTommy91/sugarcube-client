import { ImageBasedScene } from 'Renderer/rendering/ImageBasedScene'
import { ImageBasedSceneSampler } from 'Renderer/rendering/ImageBasedSceneSampler'
import type { PixelData } from 'Renderer/assets/AssetManager'
import type { SceneSampler } from 'Renderer/rendering/SceneSampler'

/**
 * MaskBasedScene is a scene type which uses normals segmentation mask and ImageBasedSampler for items positioning.
 */
export class MaskBasedScene extends ImageBasedScene {
  protected wallsMask: PixelData | null = null

  protected createSceneSampler(): SceneSampler {
    return new ImageBasedSceneSampler(this)
  }

  setWallsMask(wallsMask: PixelData) {
    this.wallsMask = wallsMask
  }

  getWallsMask() {
    return this.wallsMask
  }
}