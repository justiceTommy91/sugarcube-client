export const ART_ITEM = 'ART_ITEM'
export const FURNITURE_ITEM = 'FURNITURE_ITEM'
export type RenderType = typeof ART_ITEM | typeof FURNITURE_ITEM

// TODO study decouple furniture items from wall placeables.
// For the moment WALL_PLACEABLE can be distinguished with the placeable json data
// and only differ in the placement behavior.
// Until items are totally decupled based on their geometry type
// WALL_PLACEABLE set of items is within the FURNITURE_ITEM set of items.
export const ART_ITEM_GEOMETRY_TYPE = '2d_wall'
// This constant is unused, but included to show all the possible geometryTypes
export const FURNITURE_ITEM_GEOMETRY_TYPES = ['3d', 'wall_placeable', 'debug', 'unknown']
