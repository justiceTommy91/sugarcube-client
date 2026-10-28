export type TemplateWallV0 = {
  id: number,
  vertices: [number, number]
  material: number
  color:
  {
      r: number
      g: number
      b: number
  }
}

export type TemplateWallV1 = {
  id: number,
  vertices: [number, number]
  asset: number
  color:
  {
      r: number
      g: number
      b: number
  }
}

export type TemplateWall = TemplateWallV1
