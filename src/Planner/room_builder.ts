import * as THREE from 'three'

import { WasmInterop } from '@geomagical/sugarcube-shared'

import { gvInitPositioningContext } from 'Renderer/positioning/positioning_context'

import { Room } from 'Planner/room'
import type { RoomInfo } from 'Planner/api_types'
import type { PlannerSettings } from 'Planner/planner_types'
import type { RoomTemplate } from 'Planner/room_template/room_template'
import type { MaterialManager } from 'Planner/rendering/material_manager'
import type { GltfModelManager } from 'Planner/rendering/model_manager'
import { PlannerPositioningContext } from 'Planner/composition/planner_positioning_context'
import { migrateTemplate } from 'Planner/room_template/migrate'

export class RoomBuilder {
  public static async buildRoom(roomInfo: RoomInfo, wasmInterop: WasmInterop,
    materialManager: MaterialManager, modelManager: GltfModelManager, settings: PlannerSettings): Promise<Room> {
    const newRoom = new Room(settings, materialManager, modelManager)
    const roomTemplate = migrateTemplate(roomInfo.roomTemplate)
    await RoomBuilder.loadTemplateResources(roomTemplate, materialManager, modelManager)
    newRoom.initializeFromJson(wasmInterop, roomTemplate, roomInfo.composition?.floorId,
      roomInfo.composition?.ceilingId)
    await RoomBuilder.createWallElements(newRoom, roomTemplate, modelManager)
    gvInitPositioningContext(new PlannerPositioningContext(newRoom))
    return newRoom
  }

  private static loadTemplateResources(roomTemplate: RoomTemplate, materialManager: MaterialManager,
    modelManager: GltfModelManager) {
    const promises: Promise<unknown>[] = []
    roomTemplate.assets.forEach((assetInfo) => {
      if (assetInfo.asset) {
        switch(assetInfo.type) {
          case 'material':
            promises.push(materialManager.loadMaterialFromGltfObject(assetInfo.uuid, assetInfo.asset.data,
              assetInfo.asset.baseUrl))
            break
          case 'wall-element':
            promises.push(modelManager.loadModelGltfJson(assetInfo.asset.data, assetInfo.asset.baseUrl, assetInfo.uuid))
            break
          default:
            break
        }
      }
    })
    return Promise.all(promises)
  }

  private static createWallElements(room: Room, roomTemplate: RoomTemplate, modelManager: GltfModelManager) {
    return roomTemplate.wallElements.map((templateElement) => {
      const asset = roomTemplate.assets[templateElement.asset]
      return modelManager.getModelByUuidOrUrl(asset.uuid)
        .then(() => {
          room.createWallElement(asset.uuid, String(templateElement.wallId),
            new THREE.Vector2(templateElement.position.x, templateElement.position.y),
            new THREE.Vector2(templateElement.size.w, templateElement.size.h), templateElement.class)
        })
    })
  }
}
