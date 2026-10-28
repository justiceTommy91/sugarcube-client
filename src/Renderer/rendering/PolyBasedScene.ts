import { ImageBasedScene } from 'Renderer/rendering/ImageBasedScene'
import { PolyBasedSceneSampler } from 'Renderer/rendering/PolyBasedSceneSampler'
import type { SceneSampler } from 'Renderer/rendering/SceneSampler'

/**
 * PolyBasedScene is a scene type which uses polygon data and PolyBasedSceneSampler for items positioning.
 */
export class PolyBasedScene extends ImageBasedScene {
    protected createSceneSampler(): SceneSampler {
      return new PolyBasedSceneSampler(this)
    }
}