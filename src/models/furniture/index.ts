import type { QAStatus } from 'constants/stateTypes'
import type { RenderType } from 'constants/renderItemTypes'
import type { AvailabilityStatus } from 'models/furniture/constants'

export type ProductAvailability = {
    online: AvailabilityStatus | null
    store: AvailabilityStatus | null
    pickup: boolean | null
}

export type Socket = {
    name: string
    defaultProductId: number
    headingI: number
    headingJ: number
    headingK: number
    headingW: number
    isCartIgnored: boolean
    isNullable: boolean
    linkGroupName: string
    type: { size: string; category: string }
    x: number
    y: number
    z: number
}

export type SocketSet = {
    name: string
    sockets: Socket[]
}

export type ProductGeometry = {
    id: number
    modelUrl: string
    minX: number
    minY: number
    minZ: number
    maxX: number
    maxY: number
    maxZ: number
    scale: number
    rotX: number
}

export type ProductData = {
    id: number
    localItemNumber: string
    globalProductId: string
    qaStatus: QAStatus
    stacks: boolean
    renderType: RenderType
    localProductAdminUrl?: string
    localProductStudioAdminUrl?: string
    globalProductAdminUrl?: string
    salesEndDateGlobal?: string
    name: string
    region: string
    collections: string[]
    rootCategories?: string[]
    categories?: string[]
    subCategoryIds?: string[]
    subCategories: string[]
    subCatalogs?: string[]
    ecommerceUrl?: string
    imageUrls?: string[]
    availableInRegion: boolean
    uncompressedModelSize: number
    recommended: number[]
    swappableItems?: number[]
    description?: string
    validDesign?: string
    price: string
    priceNumeral: number
    rating?: string
    ratingCount?: number
    source?: string
    artSource?: string
    hidden: boolean
    variants?: number
    variantsSelected?: number[]
    availability: ProductAvailability
    mirrorType: number | null
    thumbUrl: string
    isSupportedAutodecorate: boolean
    typeName?: string
    placeables: {
        version: number
        combinations: number[][]
        anchors: {
            category: string
            constraint?: string
            position?: number[]
            matrix_model?: number[]
        }[]
    }
    stackables: {
        id: string
        transform: number[][]
        parameters:
            | {
                  type: 'circle'
                  radius: number
              }
            | {
                  type: 'polygon'
                  vertices: number[][]
              }
    }[]
    metadata?: {
        combinables?: {
            selfMeta?: {
                size?: string
                variant?: string
                category?: string
            }
        }
        placeables?: {
            version: number
            combinations: number[][]
            anchors: {
                category: 'floor' | 'wall'
                constraint?: string
                position?: [number, number]
                matrix_model?: number[]
            }[]
        }
    }
    productGeometries: {
        simple?: ProductGeometry
        productMaterials?: {
            id: string
            name: string
            url: string
        }[]
        dynamic?: {
            rules: {
                parentHasMetadata: {
                    size: string
                    bedspreadType?: string
                }
                socketType?: {
                    size: string
                    category: string
                }
            }
            geometry: ProductGeometry
            socketType?: {
                size: string
                category: string
            }
        }[]
    }
    geometryTypes: string[]
    isSnapRotable: boolean
    entities: string
    smartaClass: string
    isCombinableChild: boolean
    combinablesSocketSet?: SocketSet
    combinablesMetadata?: {
        size: string
        bedspreadType?: string
    }
    requiresWallContact?: boolean // Indicates if product requires wall anchoring for tip-over prevention
    materialUrl?: string
    min?: { x: number, y: number, z: number }
    max?: { x: number, y: number, z: number }
}

export type CustomerLocation = {
    storeId: number | null
    zipcode: string | null
    storeName: string
}

export type APIProduct = {
    id: number
    globalProductAdminUrl: string | null
    localProductAdminUrl: string | null
    localProductStudioAdminUrl: string | null
    onlineSellable: boolean
    region: string
    localItemNumber: string
    genericId: string
    isAvailable: boolean
    name: string
    thumbUrl: string
    ecommerceUrl: string
    createdAt: null
    lastModifiedTs: string
    collections: string[]
    categories: string[]
    subCategories: string[]
    categoryIds: string[]
    subCategoryIds?: string[]
    price: string
    priceNumeral: string
    imageUrls: string[]
    typeName: string
    description: string
    rating: string
    ratingCount: number
    productAreaName: string
    productRangeAreaName: string
    editedSwappables: boolean
    editedCategory: boolean
    sprStatus: string
    businessName: string
    subProducts: string[]
    productQa: string
    globalProduct: boolean
    globalProductId: string
    usEnItemNo: string
    subCatalogs: string[]
    stacks: boolean
    availableInUsEn: boolean
    recommended: unknown
    rootCategories: string[]
    availableInRegion: boolean
    entities: string
    smartaClass: string
    configurabilityType: unknown
    geometryType: string
    geometryTypes: string[]
    modelUrl: string
    minX: number
    minY: number
    minZ: number
    maxX: number
    maxY: number
    maxZ: number
    scale: number
    rotX: number
    metadata: {
        placeables?: {
            version: number
            combinations: number[][]
            anchors: {
                category: 'floor' | 'wall'
                constraint?: string
                position?: [number, number]
                matrix_model?: number[]
            }[]
        }
    } | null
    stackables: unknown | null
    productGeometries: {
        simple?: ProductGeometry
        lite?: ProductGeometry
        productMaterials?: {
            id: string
            name: string
            url: string
        }[]
        dynamic?: {
            rules: {
                socketType?: {
                    size: string
                    category: string
                }
                parentHasMetadata: {
                    size: string
                    bedspreadType?: string
                }
            }
            geometry: ProductGeometry
            socketType?: {
                size: string,
                category: string,
            }
        }[]
    }
    salesEndDateGlobal?: string
    requiresWallContact?: boolean // Indicates if product requires wall anchoring for tip-over prevention
    combinablesSocketSets?: SocketSet[]
    combinablesDefaultSocketSet?: string
    combinablesMetadata?: {
        size: string
        bedspreadType?: string
    }
}

export type { ArtFrameData } from 'Renderer/geomviewer/geom_types'

export type FilterResult = {
    ids: number[]
    count: number
    hasNext: boolean
    currentPage: number
    moreToken: null
}
