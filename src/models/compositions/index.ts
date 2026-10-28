import type { Scene } from 'models/scenes'
import {
    ROOM_SOURCE_USERCAPTURED,
    ROOM_SOURCE_STOCK,
    TRACK_LOCATION_DESIGN_HEADER,
    TRACK_LOCATION_SHARE_PANEL,
    TRACK_LOCATION_DESIGN_SUMMARY,
    TRACK_LOCATION_SAVE_MODAL,
    TRACK_LOCATION_NOT_SET,
    TRACK_LOCATION_DASHBOARD,
    TRACK_LOCATION_EXPERT_CHECK,
    TRACK_LOCATION_EDIT_ROOM_BUTTON,
    TRACK_LOCATION_ROOM_BUILDER_BRIDGE,
    RoomViewType,
} from 'models/tracking/constants'
import {
    FEATURE_VERSIONS,
    TRACK_NEW_COMPOSITION,
    TRACK_EDIT_COMPOSITION,
    TRACK_COPY_COMPOSITION,
    TRACK_RENAME_COMPOSITION,
} from 'models/compositions/constants'
import { SceneState } from 'models/scenes/constants'
import * as RenderItemTypes from 'constants/renderItemTypes'
import { ArtFrameData, ProductData } from 'models/furniture'
import { RoomSourceType } from 'models/tracking'

export type Point2D = [number, number]
export type Point3D = [number, number, number]
export type Quat4D = [number, number, number, number]

// Each value is a percentage relative to 0-1, but can be negative or greater than 1
export type Corners = [Point2D, Point2D, Point2D, Point2D]

export type CompositionSaveType =
    | typeof TRACK_NEW_COMPOSITION
    | typeof TRACK_EDIT_COMPOSITION
    | typeof TRACK_COPY_COMPOSITION
    | typeof TRACK_RENAME_COMPOSITION

export type CompositionSavedFrom =
    | typeof TRACK_LOCATION_DESIGN_HEADER
    | typeof TRACK_LOCATION_SHARE_PANEL
    | typeof TRACK_LOCATION_DESIGN_SUMMARY
    | typeof TRACK_LOCATION_SAVE_MODAL
    | typeof TRACK_LOCATION_NOT_SET
    | typeof TRACK_LOCATION_DASHBOARD
    | typeof TRACK_LOCATION_EXPERT_CHECK
    | typeof TRACK_LOCATION_EDIT_ROOM_BUTTON
    | typeof TRACK_LOCATION_ROOM_BUILDER_BRIDGE

export type CompositionSaveTrackingInfo = {
    SavedFrom: CompositionSavedFrom
    SaveType?: CompositionSaveType
}

export type SavedProperties = {
    erasedSegments?: number[]
    wallPaint?: Record<string, string | number | undefined>
    wallPaintInpaint?: Record<string, string | number | undefined>
    lastSavedOn?: string
    clientVersion?: string
    clientLibVersions?: string
    camera?: object
    features?: Partial<typeof FEATURE_VERSIONS>
}

export interface PlacedFurniture {
    id: number
    composition: number
    furnitureId: number
    localProductId: number
    localProduct: unknown | null
    uniqueId: string
    x: number
    y: number
    z?: number
    heading: number
    headingI?: number
    headingJ?: number
    headingK?: number
    parentId?: string
    parentAttachment: number
    gfxAttributes: {
        artData?: {
            frameId?: number
            sizeId?: number
            colorId?: number
            matteId?: number
            customHeight?: number
        }
        stackedPlane?: string
        combinablePlacement?: Record<string, unknown>
        mirrorOptionEnabled?: boolean
        placeables?: unknown
        anchorCombinationIndex?: number
        placingBehavior?: string // TODO narrow
        parentId?: number
        position?: { x: number; y: number; z: number }
        additionalContacts?: []
    } | null
    createdAt: string
    lastModifiedTs: string
    socketSet?: string
    socket?: string
}

interface CompositionGLTF {
    asset: {
        generator: string
        version: string
    }
    extras: {
        geomagical: {
            erasedIds: number[]
            geomagicalInstances: { localProductId: number }[]
            geomagicalSurfaces: { type: string; id: number }[]
        }
    }
    nodes: {
        name: string
        translation: Point3D
        rotation: Quat4D
        children: number[]
        extras: { geomagicalSurface: number }
    }[]
    scenes: { nodes: number[] }[]
}

/** A composition from the backend API. */
export interface APIComposition {
    compositionId: number
    name: string
    baseImageUrl: string
    thumbnailUrl: string
    pinterestInfo: never | null
    sceneId: number
    wid: number
    placedwallartSet: never[]
    placedfurnitureSet: PlacedFurniture[]
    createdAt: string
    lastModifiedTs: string
    uuid: string
    isShared: boolean
    publicCompositionImageUrl: string
    isStock: boolean
    geoProperties: Record<string, unknown> | null
    savedProperties: SavedProperties
    sceneUuid: string
    thumbnails: {
        url: string
    }
    adminUrl: string | null
    isPopular: boolean | null
    shareUrl: string | null
    sceneIsStock: boolean
    enableRemix: boolean
    sendNotifications: boolean
    gltf: CompositionGLTF
}

export interface RenderItem {
    id: number
    uniqueId: number
    x: number | null
    y: number | null
    z?: number
    corners: Corners
    heading: number
    headingI?: number
    headingJ?: number
    headingK?: number
    mirrorOptionEnabled: boolean
    stackedPlane?: string
    combinablePlacement?: Record<string, unknown> // TODO
    metrics: Record<string, unknown> | null
    readyAndRendered: boolean
    placingBehavior?: string // TODO narrow string type
    swappedOutPlacingBehavior?: string
    parentId?: number | null
    placeables?: unknown
    anchorCombinationIndex?: unknown
    p3?: { x: number; y: number; z: number }
    placement?: PlacementType
    smartaPlacement?: unknown
    rawPlacement3d?: {
        location3: {
            localPos: { x: number; y: number; z: number }
            bindTo: string
        }
        rotation?: Quat4D
    }
    parentIdOrSurface?: string
    parentAttachment?: number
    additionalContacts?: number[]
    swapChainPosition?: Point2D
    pin: {
        x: number
        y: number
        hidePin: boolean
        itemIsHidden: boolean
    }
    isAddedFromDuplicate?: boolean
    smartaPlacementState?: string
    isLoading?: boolean
    assemblyFlip?: string
    socket?: string
    socketSet?: string
    collisionState?: string[]
    // TODO artData keys
}

export type ArtProductData = {
    artAssetUrls: string[]
    displayWidthCm: number
    displayHeightCm: number
}

export type MatteOption = {
    id: number
    hex: string
}

export type ColorOption = {
    id: number
    hex: string
}

export type ArtRenderItemComplete = RenderItem &
    ProductData &
    ArtProductData & {
        renderType: typeof RenderItemTypes.ART_ITEM
        selected: boolean
        frame: ArtFrameData & {
            id: number
            name: string
            thumbUrl: string
            mattes?: Record<number, MatteOption>
            colors?: Record<number, ColorOption>
        }
        size: {
            height: number
        }
        frameId: number
        colorId: number
        matteId: number
        rootCorners: Corners
    }

export type FurnitureRenderItemComplete = RenderItem &
    ProductData & {
        renderType: typeof RenderItemTypes.FURNITURE_ITEM
        selected: boolean
        isCombinableChild: boolean
        rootCorners: Corners
    }

export type RenderItemComplete = ArtRenderItemComplete | FurnitureRenderItemComplete

export type Composition = Omit<CompositionDataItem, 'renderItems'> & {
    scene: Scene
    renderItems: RenderItemComplete[]
    hasStackableSurfaces: boolean
    isMissingItems: boolean
    canMagicErase: boolean
}

export interface CompositionSharingData {
    isShared: boolean
    enableRemix: boolean
    sendNotifications: boolean
}

export interface CompositionSharingWithIdData extends CompositionSharingData {
    compositionId: string
}

export type SelectedCompositionTrackingRoomInfo =
    | Record<string, unknown>
    | {
          DesignId: Composition['id'] | null
          DesignSource: 'Stock' | 'UserDesigned' | null
          DesignTitle: Composition['name'] | null
          RoomTitle: Scene['name']
          RoomId: Scene['sceneId']
          RoomSource: typeof ROOM_SOURCE_STOCK | typeof ROOM_SOURCE_USERCAPTURED
          RoomSourceType?: string
      }

export interface CompositionDataItem {
    adminUrl: string | null
    creationDate: string
    lastModifiedDate: string
    enableRemix: boolean
    geoProperties: Record<string, unknown>
    hiddenSurfaces: number[]
    id: string
    isShared: boolean
    isStock: boolean
    name: string
    publicCompositionImageUrl: string
    renderItems: Record<string, RenderItem>
    savedProperties: Record<string, unknown>
    sceneId: string
    sendNotifications: boolean
    shareUrl: null | string
    thumbUrl: string
    uuid: string
    wid: number
    deletedRenderItems: Record<string, RenderItem> | undefined
    wallPaint: NonNullable<SavedProperties['wallPaint']>
    wallPaintInpaint: NonNullable<SavedProperties['wallPaintInpaint']>
    // originalCompositionData is used to preserve the saved state so that
    // we can discard unsaved changes when re-opening a composition
    originalCompositionData?: Omit<CompositionDataItem, 'originalCompositionData'>
    // isGLTF marks the composition as a 3d composition vs. legacy2d
    isGLTF?: boolean
}

export type CompositionSaveData = {
    compositionId: string
    placedFurniture: RenderItem[]
    name: string
    sceneId: string
    isShared: boolean
    remixParent: string | undefined
    savedProperties: SavedProperties
    baseImageData: string | undefined
    isStock: boolean
    geo_properties?: Record<string, string>
}

export type RoomGroup = {
    id: string
    sceneId: string
    name: string
    thumbUrl: string | null
    creationDate?: string
    lastModifiedDate: string
    canDeleteScene: boolean
    roomSource: RoomSourceType
    roomViewType: RoomViewType
    compositions: CompositionDataItem[]
    sceneState?: SceneState
}

export type SmartaPlacedFurnitureBase = {
    placedFurniture: [
        {
            furnitureId: number
            localItemNumber: string
            uniqueId: string
            parentId: string
            parentAttachment: number
            x: number
            y: number
            z: number
            heading: number
            headingI: number
            headingJ: number
            headingK: number
            gfxAttributes: {
                artData?: unknown
                mirrorOptionEnabled?: boolean
                placingBehavior?: string // TODO narrow
            } | null
        },
    ]
    name?: string
    sceneId: string
    isShared?: boolean
    savedProperties: {
        camera?: Record<string, unknown>
        erasedSegments?: Array<string | number>
        lastSavedOn: string
        clientVersion: string
        clientLibVersions: string
        features: Record<string, unknown>
    }
    smartaURL: string | undefined
    ruleset: string | undefined
}

export type SmartaPlacedFurnitureSingle = SmartaPlacedFurnitureBase & {
    localProductIdToPlace: number
}

export type SmartaPlacedFurnitureMulti = SmartaPlacedFurnitureBase & {
    localItemNumbersToPlace: {
        placementId: string
        localItemNumber: string
    }[]
}

export type SmartaPlacedFurnitureSet = {
    placedFurniture: SmartaPlacedFurnitureBase['placedFurniture']
    name?: string
    sceneId: string
    isShared?: boolean
    savedProperties: {
        camera?: Record<string, unknown>
        erasedSegments?: Array<string | number>
        lastSavedOn: string
        clientVersion: string
        clientLibVersions: string
        features: Record<string, unknown>
    }
    smartaURL: string | undefined
    ruleset: string | undefined
    to_place: string
}

export type DashboardRoom = {
    sceneName: string
    sceneId: string
    roomSource: RoomSourceType
    roomViewType: RoomViewType
    compositionId?: string
    rank?: number
    furnishingType?: string
    subCatalog?: string
    roomType?: string
}

type PointXYZ = { x: number; y: number; z: number }
type PlacementType =
    | {
          kind: 'location3'
          location3: { localPos: PointXYZ; bindTo: string }
          rotation?: Quat4D
      }
    | {
          kind: 'location3Legacy'
          location3: { localPos: PointXYZ; bindTo: string }
          rotation: Quat4D
          parentId?: string
      }
    | {
          kind: 'location2Legacy'
          location2: Point2D
          location3: { localPos: PointXYZ; bindTo: string }
          rotation?: Quat4D
          heading: number
      }
