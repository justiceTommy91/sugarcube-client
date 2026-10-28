import type {
  TemplateAssetInfo,
  FloorTemplate,
  CeilingTemplate,
  TemplateVertex,
  TemplateWall,
  TemplateWallElement,
} from 'Planner/room_template/room_template_types'
import { CeilingTemplateV0 } from './versions/ceiling'
import { FloorTemplateV0 } from './versions/floor'
import { TemplateWallV0 } from './versions/wall'


export type RoomTemplateV0 = {
  assets: TemplateAssetInfo[]
  floor: FloorTemplateV0
  ceiling: CeilingTemplateV0
  vertices: TemplateVertex[]
  walls: TemplateWallV0[]
  wallElements: TemplateWallElement[]
}

export type RoomTemplateV1 = {
  version: string
  assets: TemplateAssetInfo[]
  floor: FloorTemplate
  ceiling: CeilingTemplate
  vertices: TemplateVertex[]
  walls: TemplateWall[]
  wallElements: TemplateWallElement[]
}

export type AnyTemplate = RoomTemplateV0 | RoomTemplateV1
export type RoomTemplate = RoomTemplateV1