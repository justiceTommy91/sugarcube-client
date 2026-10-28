import type { Placement } from '@gatsby/Renderer/geomviewer/geom_types'
import fetchWrapper from './index'

// ─── Request types ────────────────────────────────────────────────────────────

export interface SmartaPlacedFurnitureEntry {
    furnitureId: number
    localItemNumber?: string
    uniqueId: string
    x?: number
    y?: number
    z?: number
    heading?: number
    headingI?: number
    headingJ?: number
    headingK?: number
    parentAttachment?: number
    parentId?: string
    gfxAttributes?: {
        additionalContacts?: unknown[]
        stackedPlane?: string
        combinablePlacement?: unknown
        mirrorOptionEnabled?: boolean
        anchorCombinationIndex?: number
        artData?: Record<string, unknown>
        placingBehavior?: string
    } | null
}

export interface SmartaSavedProperties {
    camera?: Record<string, unknown>
    erasedSegments?: Array<string | number>
    lastSavedOn?: string
    clientVersion?: string
    clientLibVersions?: string
    features?: Record<string, unknown>
}

export interface SmartaPlacementRequest {
    placedFurniture: SmartaPlacedFurnitureEntry[]
    sceneId: string
    name?: string
    isShared?: boolean
    savedProperties: SmartaSavedProperties
    localProductIdToPlace: number
    localItemNumberToPlace?: string
    smartaURL?: string
    ruleset?: string
}

// ─── Response types ───────────────────────────────────────────────────────────

interface SmartaPlacedResult {
    x: number
    y: number
    z: number
    heading: number
    headingI: number
    headingJ: number
    headingK: number
    parentId: string
    parentAttachment: number
    uniqueId: string
    gfxAttributes?: {
        anchorCombinationIndex?: number
    }
}

interface SmartaSuccessResponse {
    error: false
    placementId: string
    placedFurniture: SmartaPlacedResult
}

interface SmartaErrorResponse {
    error: true
    errorCode: string
    errorText?: string
}

export type SmartaResponse = SmartaSuccessResponse | SmartaErrorResponse

export function isSmartaError(r: SmartaResponse): r is SmartaErrorResponse {
    return r.error === true || !('placedFurniture' in r)
}

// ─── API call ─────────────────────────────────────────────────────────────────

export const placeSingle = (data: SmartaPlacementRequest, signal?: AbortSignal): Promise<SmartaResponse> =>
    fetchWrapper<SmartaResponse>(
        '/smarta/place_single/',
        {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-type': 'text/plain' },
            signal,
        },
        { shardApi: true, baseUrl: data.smartaURL },
    )

// ─── Placement builder ────────────────────────────────────────────────────────

/**
 * Converts a smarta API response into the viewer's Placement format.
 * Mirrors the `smartaPlacement` object constructed in Gatsby's `clickPlaceRenderItemSaga`.
 */
export function buildPlacementFromSmartaResponse(result: SmartaPlacedResult): Placement {
    const { x, y, z, headingI, headingJ, headingK, heading, parentAttachment, parentId } = result
    return {
        kind: 'location3Legacy',
        location3: {
            bindTo: String(parentAttachment),
            localPos: { x, y, z },
        },
        rotation: [headingI, headingJ, headingK, heading],
        parentId,
    }
}
