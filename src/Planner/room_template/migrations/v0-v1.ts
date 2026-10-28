import { RoomTemplateV0, RoomTemplateV1 } from 'Planner/room_template/room_template'

export const migrateV0toV1 = (template: RoomTemplateV0): RoomTemplateV1 => {
  const result: RoomTemplateV1 = {
    version: '1.0',
    assets: template.assets.map(asset => ({ ...asset })),
    floor: {
      asset: template.floor.material,
    },
    ceiling: {
      height: template.ceiling.height,
      asset: template.ceiling.material,
    },
    vertices: template.vertices.map(vertex => ({ ...vertex })),
    walls: template.walls.map(wall => ({
      id: wall.id,
      vertices: [...wall.vertices],
      asset: wall.material,
      color: { ...wall.color },
    })),
    wallElements: template.wallElements.map(element => ({ ...element }))
  }
  return result
}
