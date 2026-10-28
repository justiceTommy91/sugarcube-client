/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AssetsList } from 'Renderer/assets/AssetsList'
import { RoomGLTFAssets } from 'Renderer/assets/RoomGLTFAssets'
import { WholeRoomGLTFAssets } from 'Renderer/assets/WholeRoomGLTFAssets'
import type { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import type { ViewerSettings } from 'Renderer/geomviewer/geom_types'
import { MeshSceneBuilder, GLTFSceneBuilder, ManifestSceneBuilder } from 'Renderer/rendering/index'
import type { InitializationFailureCallback } from 'Renderer/rendering/rendering_types'
import { SceneBuilder } from 'Renderer/rendering/SceneBuilder'
import type { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'
import { BaseRenderEngine } from 'Renderer/rendering/BaseRenderEngine'

export const createSceneBuilder = (assetsList: AssetsList, viewerSettings: ViewerSettings, debugSettings: DebugSettings,
  maxTextureSize: number, onInitializationFailure: InitializationFailureCallback, cameraIndex: number): SceneBuilder<
    GeomBaseScene,
    BaseRenderEngine<GeomBaseScene> > => {
      if (assetsList instanceof WholeRoomGLTFAssets) {
          return new MeshSceneBuilder(viewerSettings, debugSettings, onInitializationFailure)
      }
      if (assetsList instanceof RoomGLTFAssets) {
          return new GLTFSceneBuilder(viewerSettings, debugSettings, maxTextureSize, onInitializationFailure, 
            cameraIndex)
      }
      return new ManifestSceneBuilder(viewerSettings, debugSettings, maxTextureSize, onInitializationFailure, 
        cameraIndex)
    }
