import type { GLTf } from 'Renderer/gltf/gltf'

export type { TemplateWall } from 'Planner/room_template/versions/wall'
export type { FloorTemplate } from 'Planner/room_template/versions/floor'
export type { CeilingTemplate } from 'Planner/room_template/versions/ceiling'

// Types that are so far unversioned.

export type TemplateResolvedAsset = {
  data: GLTf
  baseUrl: string
}

export type TemplateAssetType = 'material' | 'wall-element'

export type TemplateAssetInfo = {
  uuid: string
  type: TemplateAssetType
  asset?: TemplateResolvedAsset
}

export type TemplateVertex = {
  id: number
  position: {
    x: number
    y: number
  }
}

export type TemplateWallElementType = 'door' | 'window'

export type TemplateWallElement = {
  id: number
  wallId: number
  position:
  {
      x: number
      y: number
  }
  size:
  {
      w: number
      h: number
  }
  class: TemplateWallElementType
  asset: number
}