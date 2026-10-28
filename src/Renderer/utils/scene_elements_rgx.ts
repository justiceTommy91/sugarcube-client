
const WINDOW_ELEMENT_NAME_TAG = 'window'
const DOOR_ELEMENT_NAME_TAG = 'door'
const OPENING_ELEMENT_NAME_TAG = 'opening'

const WALL_ELEMENT_FRAME_NAME_TAG = 'frame'
const WALL_ELEMENT_HANDLE_NAME_TAG = 'handle'
const WALL_ELEMENT_GLASS_NAME_TAG = 'glass'
const WALL_ELEMENT_MESH_NAME_TAG = 'mesh'
const WALL_ELEMENT_OTHER_NAME_TAG = 'other'

const DOOR_ELEMENT_MISC_NAME_TAG = 'door1door'

const BASEBOARD_NAME_TAG = 'baseboard'

const FLOOR_OBJ_NAME_TAG = 'floor'
const WALL_OBJ_NAME_TAG = 'wall'
const CEILING_OBJ_NAME_TAG = 'ceiling'

const VIEW_OBJ_NAME_TAG = 'view'

export const floorObjPattern = `^(?=.*${FLOOR_OBJ_NAME_TAG}).*$`
export const wallObjPattern = `^(?=.*${WALL_OBJ_NAME_TAG})(?!.*${VIEW_OBJ_NAME_TAG}).*$`
export const ceilingObjPattern = `^(\\d*)(${CEILING_OBJ_NAME_TAG})(\\d*)$`
export const wallViewObjPattern = `^(?=.*${VIEW_OBJ_NAME_TAG}).*$`

export const baseboardObjPattern = `^(?=.*${BASEBOARD_NAME_TAG}).*$`

export const doorProxyObjPattern = `^(\\d+)(${DOOR_ELEMENT_NAME_TAG})(\\d+)?$`
export const windowProxyObjPattern = `^(\\d+)(${WINDOW_ELEMENT_NAME_TAG})(\\d+)?$`
export const openingProxyObjPattern = `^(\\d+)(${OPENING_ELEMENT_NAME_TAG})(\\d+)?$`

export const windowFrameObjPattern = `^(?=.*${WINDOW_ELEMENT_NAME_TAG}${WALL_ELEMENT_FRAME_NAME_TAG}).*$`
export const doorFrameObjPattern = `^(?=.*${DOOR_ELEMENT_NAME_TAG}${WALL_ELEMENT_FRAME_NAME_TAG}).*$`

// ^(?=.*(?:window\d+window|frame\d+window)).*$
export const windowBodyObjPattern = `^(?=.*(?:`
    + `${WINDOW_ELEMENT_NAME_TAG}(\\d+)${WINDOW_ELEMENT_NAME_TAG}`
    + `|${WALL_ELEMENT_FRAME_NAME_TAG}(\\d+)${WINDOW_ELEMENT_NAME_TAG}`
    + `)).*$`

// ^(?=.*(?:door\d+door|doordoor\d+|meshdoor)).*$
export const doorBodyObjPattern = `^(?=.*(?:`
    + `${DOOR_ELEMENT_NAME_TAG}(\\d+)${DOOR_ELEMENT_NAME_TAG}`
    + `|${DOOR_ELEMENT_NAME_TAG}${DOOR_ELEMENT_NAME_TAG}(\\d+)`
    + `|${WALL_ELEMENT_MESH_NAME_TAG}${DOOR_ELEMENT_NAME_TAG}`
    + `)).*$`

// ^(?=.*window)(?!.*frame)(?!.*handle).*$
export const windowGlassObjPattern = `^`
    + `(?=.*${WINDOW_ELEMENT_NAME_TAG})`
    + `(?!.*${WALL_ELEMENT_FRAME_NAME_TAG})`
    + `(?!.*${WALL_ELEMENT_HANDLE_NAME_TAG})`
    + `.*$`

// ^(?=.*glass)(?=.*door)(?!.*frame)(?!.*handle)(?!.*mesh)(?!.*other)(?!.*door1door).*$
export const doorGlassObjPattern = `^`
    + `(?=.*${WALL_ELEMENT_GLASS_NAME_TAG})`
    + `(?=.*${DOOR_ELEMENT_NAME_TAG})`
    + `(?!.*${WALL_ELEMENT_FRAME_NAME_TAG})`
    + `(?!.*${WALL_ELEMENT_HANDLE_NAME_TAG})`
    + `(?!.*${WALL_ELEMENT_MESH_NAME_TAG})`
    + `(?!.*${WALL_ELEMENT_OTHER_NAME_TAG})`
    + `(?!.*${DOOR_ELEMENT_MISC_NAME_TAG})`
    + `.*$`
