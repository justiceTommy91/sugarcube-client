import type { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'
import type { RenderEngine } from 'Renderer/rendering/RenderEngine'

import type { OnFirstRenderCallback } from 'Renderer/rendering/rendering_types'
import { AssetManager } from 'Renderer/assets/AssetManager'
import { AssetsList } from 'Renderer/assets/AssetsList'

/**
 * Scene builder class is used to create a scene with all its dependencies) and a render engine.
 * Usage example, assuming ConcreteBuilder is a class implementing SceneBuilder interface:
 * const builder = new ConcreteBuilder(params)
 * const renderEngine = builder.buildRenderEngine(canvas, ...)
 * const scene = await builder.buildScene(renderEngine)
 */

export type SceneCreateCallback<SceneType extends GeomBaseScene> = (scene: SceneType) => void

export interface SceneBuilder<
    SceneType extends GeomBaseScene,
    RenderEngineType extends RenderEngine<SceneType>
  > {
  buildRenderEngine: (
    canvas: HTMLCanvasElement,
    onFirstRenderCallback: OnFirstRenderCallback,
  ) => RenderEngineType
  buildScene: (renderEngine: RenderEngineType, assetsList: AssetsList, 
    assetManager: AssetManager, sceneCreateCallback?: SceneCreateCallback<SceneType>) => Promise<SceneType>
}