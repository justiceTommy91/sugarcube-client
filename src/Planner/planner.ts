import * as THREE from 'three'

import { WasmLoader, WasmInterop } from '@geomagical/sugarcube-shared'
import { withPrefix } from 'gatsby'

import type { PlannerSettings, PartialPlannerSettings } from 'Planner/planner_types'
import { IOffscreenRenderContext } from 'Renderer/rendering/OffscreenRenderer'
import type {
  RoomInfo,
  WallElementSizeMetadata,
  WallElementSize,
  CompositionFurnitureItem,
} from 'Planner/api_types'
import { isGlbModelInfo } from 'Planner/api_types'
import { Room } from 'Planner/room'
import { RoomBuilder } from 'Planner/room_builder'
import { RoomExporter } from 'Planner/rendering/room_exporter'
import { MaterialManager } from 'Planner/rendering/material_manager'
import { GltfModelManager } from 'Planner/rendering/model_manager'
import type { GLTf } from 'Renderer/gltf/gltf'
import { ERROR_PLANNER_NOT_READY, ERROR_COULD_NOT_PLACE_WALL_ELEMENT } from 'Planner/api_constants'
import { getDefaultSettings } from 'Planner/default_settings'
import type { TemplateWallElementType } from 'Planner/room_template/room_template_types'

// For legacy art item support.
import { gvInitRenderLibrary } from 'Renderer/renderingLibrary/gfxGlobal'
import ThreejsRenderingLibrary from 'Renderer/renderingLibrary/ThreejsLibrary/ThreejsGraphicsLibrary'
import { createArtItemModel, createArtMaterial } from 'Renderer/model/art_item_util'

export class Planner {
  private instanceId = -1
  private static currentInstance: Planner | null = null
  private settings: PlannerSettings

  private currentRoom: Room | null = null
  private materialManager: MaterialManager | null = null
  private gltfModelManager: GltfModelManager | null = null
  private wasmInterop: WasmInterop | null = null
  private isShutdown = false

  constructor(id: number) {
    this.instanceId = id
    this.settings = getDefaultSettings()
  }

  public static newInstance(id: number) {
    Planner.currentInstance = new Planner(id)
    return Planner.currentInstance
  }

  public async initialize(roomInfo: RoomInfo) {
    gvInitRenderLibrary(new ThreejsRenderingLibrary())
    this.materialManager = new MaterialManager()
    this.gltfModelManager = new GltfModelManager()
    this.wasmInterop = await new WasmLoader().init(withPrefix('/wasm/'))
    this.currentRoom = await RoomBuilder.buildRoom(roomInfo, this.wasmInterop, this.materialManager,
      this.gltfModelManager, this.settings)
    return this.instanceId
  }

  public getId() {
    return this.instanceId
  }

  public async exportCurrentRoom(binary: boolean, download: boolean) {
    if (!this.currentRoom) {
      return null
    }
    return RoomExporter.exportRoom(this.currentRoom, binary, download)
  }

  public async exportCurrentRoomAsTemplate(download: boolean) {
    if (!this.currentRoom) {
      return null
    }
    return RoomExporter.exportRoomAsTemplate(this.currentRoom, download)
  }

  public async exportCurrentRoomEnvMap(offscreenRenderCtx: IOffscreenRenderContext,
    exportAsEquirect: boolean, download: boolean) {
    if (!this.currentRoom) {
      return null
    }
    return RoomExporter.exportEnvMap(this.currentRoom, offscreenRenderCtx,
      exportAsEquirect, download)
  }

  public shutDown() {
    this.currentRoom = null
    if (this.wasmInterop) {
      this.wasmInterop.destroy()
      this.wasmInterop = null
    }
    Planner.currentInstance = null
    this.isShutdown = true
  }

  public getCurrentRoom() {
    return this.currentRoom
  }

  public applySettings(settings: PartialPlannerSettings) {
    this.settings = {
      ...this.settings,
      ...settings,
    }
    this.currentRoom?.applySettings(this.settings)
  }

  public getCurrentSettings() {
    return { ...this.settings }
  }

  public setFloorMaterialFromUrl(assetUuid: string, url: string) {
    if (!this.materialManager) {
      throw new Error(ERROR_PLANNER_NOT_READY, { cause: `setFloorMaterialFromUrl - material manager not ready` })
    }
    return this.materialManager.loadMaterialFromUrl(assetUuid, url)
      .then(() => {
        if (this.isShutdown) {
          return
        }
        if (!this.currentRoom) {
          throw new Error(ERROR_PLANNER_NOT_READY, { cause: `setFloorMaterialFromUrl - room not ready` })
        }
        this.currentRoom.setFloorMaterial(assetUuid)
    })
  }

  public setFloorMaterialFromGltfObject(assetUuid: string, gltf: GLTf, baseUrl: string) {
    if (!this.materialManager) {
      throw new Error(ERROR_PLANNER_NOT_READY, { cause: `setFloorMaterialFromGltfObject - material manager not ready` })
    }
    return this.materialManager.loadMaterialFromGltfObject(assetUuid, gltf, baseUrl)
      .then(() => {
        if (this.isShutdown) {
          return
        }
        if (!this.currentRoom) {
          throw new Error(ERROR_PLANNER_NOT_READY, { cause: `setFloorMaterialFromGltfObject - room not ready` })
        }
        this.currentRoom.setFloorMaterial(assetUuid)
    })
  }

  public addWallElement(gltf: GLTf, baseUrl: string, uuid: string, type: TemplateWallElementType,
    cameraPosition?: THREE.Vector3, initialSize?: WallElementSize) {
    if (!this.gltfModelManager) {
      throw new Error(ERROR_PLANNER_NOT_READY, { cause: `addWallElement - model manager not ready` })
    }
    return this.gltfModelManager.loadModelGltfJson(gltf, baseUrl, uuid)
      .then(() => {
        if (this.isShutdown) {
          return ``
        }
        if (!this.currentRoom) {
          throw new Error(ERROR_PLANNER_NOT_READY, { cause: `addWallElement - room not ready` })
        }
        const result = this.currentRoom.addWallElement(uuid, type, cameraPosition, initialSize)
        if (!result) {
          throw new Error(ERROR_COULD_NOT_PLACE_WALL_ELEMENT)
        }
        return result
      })
  }

  public setWallElementSize(elementId: string, width: number, height: number,
    metadata?: WallElementSizeMetadata) {
    if (!this.currentRoom) {
      return false
    }
    return this.currentRoom.setWallElementSize(elementId, new THREE.Vector2(width, height), metadata)
  }

  public setLightFixtureObject(gltf: GLTf, baseUrl: string, uuid: string) {
    if (!this.gltfModelManager) {
      throw new Error(ERROR_PLANNER_NOT_READY, { cause: `setLightFixtureObject - model manager not ready` })
    }
    return this.gltfModelManager.loadModelGltfJson(gltf, baseUrl, uuid)
      .then((model) => {
        if (this.isShutdown) {
          return
        }
        if (!this.currentRoom) {
          throw new Error(ERROR_PLANNER_NOT_READY, { cause: `setLightFixtureObject - room manager not ready` })
        }
        this.currentRoom.setLightFixtureObject(model)
      })
  }

  public setSnapModeEnabled(enabled: boolean) {
    this.currentRoom?.setSnapModeEnabled(enabled)
  }

  public hideLights() {
    this.currentRoom?.hideLights()
  }

  public refreshLights() {
    this.currentRoom?.refreshLights()
  }

  public getFurnitureSaveData() {
    return this.currentRoom?.getFurnitureSaveData() || []
  }

  public addCompositionItem(itemInfo: CompositionFurnitureItem) {
    if (!this.gltfModelManager) {
      throw new Error(ERROR_PLANNER_NOT_READY, { cause: `addCompositionItem - planner not ready` })
    }
    return this.createCompositionItemModel(itemInfo)
      .then(() => {
        if (!this.currentRoom) {
          throw new Error(ERROR_PLANNER_NOT_READY, { cause: `loadComposition - room is not ready` })
        }
        return this.currentRoom.addCompositionItem(itemInfo)
      })
  }

  private async createCompositionItemModel(itemInfo: CompositionFurnitureItem) {
    if (!this.gltfModelManager) {
      throw new Error(ERROR_PLANNER_NOT_READY, { cause: `resolveCompositionFurnitureItem - planner not ready` })
    }
    if (isGlbModelInfo(itemInfo.model)) {
      const model = await this.gltfModelManager.loadModelGlbFromUrl(itemInfo.model.glbUrl)
      return model
    }
    let frame = this.gltfModelManager.getLoadedModelByUuidOrUrl(itemInfo.model.imageUrl)
    if (!frame) {
      const ratio = parseFloat((itemInfo.model.artImageData.width / itemInfo.model.artImageData.height).toFixed(2))
      const artSize: [number, number] = [(itemInfo.model.size * ratio), itemInfo.model.size]
      const art = createArtItemModel({
        artSize,
        material: createArtMaterial(itemInfo.model.artImageData),
        frameData: itemInfo.model.frameData,
        useFilmicLUT: true,
      })
      frame = art.frame
      this.gltfModelManager.cacheProceduralModel(itemInfo.model.imageUrl, frame)
    }
    return frame
  }
}