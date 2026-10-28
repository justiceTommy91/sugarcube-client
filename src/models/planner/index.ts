import type { ValueOf } from 'utils/object'
import type { GLTf } from 'Renderer/gltf/gltf'
import type { RoomTemplate, TemplateAssetInfo } from 'Planner/api_types'

type AssetType = 'ENV_MAP' | 'MATERIAL' | 'MODEL'

export type MaterialType =
    | 'FABRIC'
    | 'CERAMIC'
    | 'PAINT'
    | 'STONE_SPECULAR'
    | 'CONCRETE'
    | 'FABRIC'
    | 'RUBBER'
    | 'STONE_ROUGH'
    | 'WOOD'
    | 'GLASS'
    | 'METAL'
    | 'PAPER'
export type SemanticType = 'FLOOR' | 'WALL' | 'CEILING' | 'WINDOW' | 'DOOR' | 'LIGHT'

export type RoomAssetsParams = {
    asset_type: AssetType
    material_class?: MaterialType
    semantic_class: SemanticType
}

export type JsonTemplate = {
    roomShape: string
    uuid: string
    name: string
    data: RoomTemplate
    lastModifiedTs: string
}

export type JsonTemplateResolvedAssets = {
    templateUuid: string
    assets: TemplateAssetInfo[]
}

export type MaterialDescription = {
    baseUrl: string
    uuid: string
    name: string
    internalName: string
    uri: string
    thumbnail: string
    data: GLTf
    semanticClass: SemanticType[]
    materialClass: MaterialType[]
    materialPattern: string
    assetType: AssetType
    lastModifiedTs: string
    createdAt: string
    sortOrder?: number
}

export type RoomAssetSlotsDescription = {
    createdAt: string
    lastModifiedTs: string
    name: string
    uuid: string
    roomAssets: MaterialDescription[]
}
export type Asset = {
    assetType: AssetType
    baseUrl: string
    createdAt: string
    lastModifiedTs: string
    internalName: string
    name: string
    materialPattern: null
    readyToTranslate: boolean
    semanticClass: SemanticType[]
    thumbnail: string
    uuid: string
    uri: string
    variantType: string
    data: GLTf | null
}

export type DoorAndWindowDescription = Asset & {
    sortOrder?: number
}

export const STEPS = {
    template: 1,
    dimensions: 2,
    doorWindow: 3,
    materials: 4,
} as const

export type Step = ValueOf<typeof STEPS>

export type TemplateState = Record<string, JsonTemplate>
export type MaterialsState = Record<string, MaterialDescription>
export type DoorsState = Record<string, DoorAndWindowDescription>
export type WindowsState = Record<string, DoorAndWindowDescription>
export type AssetState = Record<string, Asset>

export type SelectedRoomBuilderChoices = {
    TemplateUuid: string
    MaterialUuid: string
    ColorIndex: number
}

export type PlannerSessionTrackingState = {
    compositionItemsMovedByUser: string[]
    compositionItemsMovedIndirectly: string[]
    wallElementsMovedByUser: Array<{ id: string, type: SemanticType }>
    wallElementsMovedIndirectly: string[]
    nodesMoved: string[]
    numCompositionItemsMovementsByUser: number
    numWallElementItemMovementsByUser: number
    numCompositionItemsMovementsIndirect: number
    numWallElementItemMovementsIndirect: number

    wallColorChanged: boolean
    numWallEdits: number
    floorMaterialChanged: boolean

    numWindowsAdded: number
    numDoorsAdded: number
    numWindowsDeleted: number
    numDoorsdeleted: number

    numCompositionItemsDeleted: number

    numNodesAdded: number
    numNodesDeleted: number
}

export type PlannerSessionStats = {
    WallSummary: {
        WallColor: {
            Changed: boolean // true if the wall color was changed from its original/default
        },
        NumWallEdits: number // total number of walls that were changed vs original/default. NOTE: for RB edit, this just refers to the number of wall was manually moved. It does not refer to adjacent walls that were resized because of a wall move
        NumItemsMoved: number // total number of product items that were moved because of all the wall edits
        NumItemsMovements: number // total number of item movements (each item can be move multiple times)
        NumWallElementsMoved: number // total number of doors/windows moved because of wall edits -- tho I don't think this is possible today
        NumWallElementsMovements: number // total number of wall element movements (each item can be move multiple times)
    },
    NodeSummary: {
        NumNodesAdded: number,
        NumNodesDeleted: number,
        NumNodesMoved: number,
    },
    FloorSummary: {
        Material: {
            Changed: boolean // true if the floor material was changed from its original or default
        }
    },
    WallElementsSummary: {
        MumWindowsAdded: number // number of new windows added compared to original/default
        NumDoorsAdded: number // number of new doors added compared to original/default
        NumWindowsRemoved: number // number of windows removed compared to original/default. NOTE: does not include new windows added and then subsequently removed before save
        NumDoorsRemoved: number
        NumWindowsMoved: number // number of windows manually moved/edited from its original/default
        NumDoorsMoved: number // number of doors manually moved/edited from its original/default
        NumWallElementsMovements: number // total number of wall element movements (each item can be move multiple times)
    },
    ProductItemSummary: { // re-edit only
        NumItemsDeleted: number // number of products deleted compared to original/default
        NumItemsMoved: number // number of unique products manually moved/edited from the original/default (i.e. does not include items auto-moved as a result of a room change)
        NumItemsMovements: number // total number of item movements (each item can be move multiple times)
    }
}
