import { LIVING_ROOM, OFFICE, BEDROOM, DINING_ROOM, CHILDREN_ROOM, HALLWAY } from 'models/scenes/constants'

// Rendering/Preview
export const CONTEXT_DEFAULT = 'CONTEXT_DEFAULT'
export const CONTEXT_QUICK = 'CONTEXT_QUICK'
export const CONTEXT_IOS = 'CONTEXT_IOS'

// Pages
export const CONTEXT_ROOM = 'CONTEXT_ROOM'
export const CONTEXT_DASHBOARD = 'CONTEXT_DASHBOARD'
export const CONTEXT_KREATIV_LITE = 'CONTEXT_KREATIV_LITE'
export const CONTEXT_CHOOSE_ROOM = 'chooseRoom'
export const CONTEXT_SEARCH_BROWSE = 'searchBrowse'
export const CONTEXT_PLANNER = 'planner'
export const CONTEXT_CATEGORY_LIVING_ROOM = 'living-room'

// Room planner redirect: valid `room` param values and their room type mappings
export const ROOM_PLANNER_SLUGS = [
    'living-room',
    'workspace',
    'hallway',
    'dining',
    'childrens-room',
    'bedroom',
] as const

export type RoomPlannerSlug = (typeof ROOM_PLANNER_SLUGS)[number]

export const SLUG_TO_ROOM_TYPE: Record<RoomPlannerSlug, string> = {
    'living-room': LIVING_ROOM,
    'workspace': OFFICE,
    'hallway': HALLWAY,
    'dining': DINING_ROOM,
    'childrens-room': CHILDREN_ROOM,
    'bedroom': BEDROOM,
}

export type PageContext =
    | typeof CONTEXT_ROOM
    | typeof CONTEXT_DASHBOARD
    | typeof CONTEXT_KREATIV_LITE
    | typeof CONTEXT_CHOOSE_ROOM
    | typeof CONTEXT_SEARCH_BROWSE
    | typeof CONTEXT_PLANNER
    | typeof CONTEXT_CATEGORY_LIVING_ROOM
