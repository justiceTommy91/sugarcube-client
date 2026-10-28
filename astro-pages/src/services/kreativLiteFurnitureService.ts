import { DEFAULT_GEOMETRY_TYPE } from '@gatsby/services/constants'
import type { SocketSet } from '@gatsby/models/furniture'
import fetchWrapper from './index'

const DEFAULT_PAGE_LIMIT = 48

/**
 * Canonical shape of a furniture product as returned by the Morpheus API.
 * Geometry uses flat minX/minY/minZ fields; call normalizeFurnitureItem to convert
 * to the min/max object format expected by the renderer.
 * Fields like isRug, hasTallLegs, isCubicStructure are NOT returned by the API —
 * they are computed defaults applied by normalizeFurnitureItem.
 */
export interface FurnitureApiProduct {
    id: number
    name: string
    modelUrl: string
    globalProductId?: string
    localItemNumber?: string
    description?: string
    priceNumeral?: string
    thumbUrl?: string
    minX: number
    minY: number
    minZ: number
    maxX: number
    maxY: number
    maxZ: number
    scale: number
    rotX: number
    heading?: number
    stacks?: boolean
    placingBehavior?: string
    placeables?: unknown
    metadata?: unknown
    isSupportedAutodecorate?: boolean
    uncompressedModelSize?: number
    isRug?: boolean
    hasTallLegs?: boolean
    isCubicStructure?: boolean
    productGeometries?: unknown
    combinablesSocketSets?: SocketSet[]
    combinablesDefaultSocketSet?: string
    combinablesDefaultProducts?: FurnitureApiProduct[]
}

interface FurnitureSearchResponse {
    results?: FurnitureApiProduct[]
    furniture?: FurnitureApiProduct[]
    moreToken?: string | null
    /** Present on /furniture/ list responses. Null when no more pages. */
    next?: string | null
    // The Morpheus API aggregates default combinable product objects (e.g. duvet, pillow, mattress)
    // at the response level for list-style endpoints. Mirrors Gatsby's processCombinables() wrapper.
    combinablesDefaultProducts?: FurnitureApiProduct[]
}

interface FurnitureCombinablesPayload {
    items: FurnitureApiProduct[]
    /** Default combinable products returned at the response level (duvet, pillow, mattress, etc.) */
    combinablesDefaultProducts: FurnitureApiProduct[]
}

/** Return type for offset-based /furniture/ queries (no active search query). */
interface FurnitureDefaultPage extends FurnitureCombinablesPayload {
    hasMore: boolean
}

/** Return type for token-based /furniture/search/ queries. */
interface FurnitureSearchPage extends FurnitureCombinablesPayload {
    moreToken: string | null
}

export const fetchFurnitureDefault = async (
    region: string,
    roomType?: string,
    offset = 0,
): Promise<FurnitureDefaultPage> => {
    const params = new URLSearchParams({
        region,
        geometry_type: DEFAULT_GEOMETRY_TYPE,
        material_mode: 'true',
        combinables_default_products_noinline: 'true',
        limit: String(DEFAULT_PAGE_LIMIT),
        offset: String(offset),
    })
    if (roomType) params.set('room_type', roomType)

    const data = await fetchWrapper<FurnitureSearchResponse>(`/furniture/?${params.toString()}`)
    const items = data?.results ?? data?.furniture ?? []
    return {
        items,
        hasMore: !!data?.next,
        combinablesDefaultProducts: data?.combinablesDefaultProducts ?? [],
    }
}

export const fetchFurnitureSearch = async (
    query: string,
    region: string,
    moreToken?: string | null,
): Promise<FurnitureSearchPage> => {
    const params = new URLSearchParams({
        q: query,
        region,
        geometry_type: DEFAULT_GEOMETRY_TYPE,
        needMore: 'True',
        // material_mode enables duvet combinable data in the API response.
        material_mode: 'true',
    })
    if (moreToken) params.set('moreToken', moreToken)

    const data = await fetchWrapper<FurnitureSearchResponse>(`/furniture/search/?${params.toString()}`)

    return {
        items: data?.results ?? data?.furniture ?? [],
        moreToken: data?.moreToken ?? null,
        combinablesDefaultProducts: data?.combinablesDefaultProducts ?? [],
    }
}
