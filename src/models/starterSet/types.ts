import { ProductData } from 'models/furniture'

export type StarterSetState = {
    allRoomsData: Record<string, StarterSetPayload[]>
    roomCategories: (keyof StarterSetByRoomType)[]
    loading: boolean
    error: string | null
    loadingSetId: string | null
    setByIdError: string | null
}

export type StarterSetPlacementError = {
    error: true
    placementId: string
    errorCode: string
    errorText?: string
}

export type StarterSetPlacementSuccess = {
    error: false
    placementId: string
    placedFurniture: {
        x: number
        y: number
        z: number
        headingI: number
        headingJ: number
        headingK: number
        heading: number
        parentId: string
        parentAttachment: number
        uniqueId: string
        gfxAttributes: Record<string, unknown>
    }
}

export type StarterSetPlacement = StarterSetPlacementError | StarterSetPlacementSuccess

export type StarterSetItem = {
    headingI: number
    headingJ: number
    headingK: number
    headingW: number
    macroproduct: string
    product: ProductData
    uuid: string
    x: number
    y: number
    z: number
    placement?: StarterSetPlacement
}

type Placeable = {
    anchors: Array<{
        category: string
        matrixModel: {
            params: number[]
        }
    }>
    version: number
    combinations: Array<{
        anchorIndex: number[]
    }>
}

export type StarterSetMacroProducts = {
    maxX: number
    maxY: number
    maxZ: number
    minX: number
    minY: number
    minZ: number
    placeables: Placeable
    smartaClass: string
    stackables: string[]
    uuid: string
}

type RoomTypes =
    | 'BEDROOM'
    | 'BATHROOM'
    | 'DINING_ROOM'
    | 'KIDS_ROOM'
    | 'LIVING_ROOM'
    | 'OFFICE'
    | 'OUTDOOR'
    | 'UTILITY_ROOM'
    | 'NONE'

export type StarterSetPayload = {
    internalName: string
    items: StarterSetItem[]
    macroproducts: StarterSetMacroProducts[]
    name: string
    roomType: RoomTypes
    thumbnailUrl: string
    type: string
    uuid: string
}

export type StarterSetByRoomType = {
    [key in RoomTypes]?: StarterSetPayload[]
}
