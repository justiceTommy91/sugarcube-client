import type { SceneInfo } from '@gatsby/Renderer/geomviewer/geom_types'
import type { SocketSet } from '@gatsby/models/furniture'
import type { FurnitureApiProduct } from './kreativLiteFurnitureService'
import fetchWrapper from './index'

// ─── Raw API shapes ───────────────────────────────────────────────────────────

interface PlacedFurnitureEntry {
    furnitureId: number
    localProductMarketItemNumber: string
    uniqueId: string
    /** 'SURFACE' for wall/floor surface items, furniture uniqueId string for dynamic stacking. */
    parentId: string | null
    parentAttachment: number | null
    x: number
    y: number
    z: number
    heading: number
    headingI: number
    headingJ: number
    headingK: number
    gfxAttributes: {
        artData?: Record<string, unknown>
        additionalContacts?: unknown[]
        mirrorOptionEnabled?: boolean
        anchorCombinationIndex?: number
    } | null
}

export interface CompiledFurnitureProduct {
    id: number
    localItemNumber: string
    globalProductId: string
    modelUrl: string
    minX: number
    minY: number
    minZ: number
    maxX: number
    maxY: number
    maxZ: number
    scale: number
    rotX: number
    metadata: unknown
    stackables: unknown
    placeables: unknown
    geometryTypes: string[]
    stacks: boolean
    isRug?: boolean
    hasTallLegs?: boolean
    isCubicStructure?: boolean
    mirrorType?: string
    placingBehavior?: string
    swappedOutPlacingBehavior?: string
    uncompressedModelSize?: number
    productGeometries?: unknown
    combinablesSocketSets?: SocketSet[]
    combinablesDefaultProducts?: FurnitureApiProduct[]
    heading?: number
    combinablesDefaultSocketSet?: string
}

interface CompiledCompositionApiResponse {
    composition: {
        placedfurnitureSet: PlacedFurnitureEntry[]
        savedProperties?: {
            erasedSegments?: number[]
            camera?: Record<string, unknown>
        }
    }
    /** Raw scene from the API — uuid field is the canonical sceneId UUID. */
    scene: SceneInfo & { uuid: string }
    furnitures: CompiledFurnitureProduct[]
    combinablesDefaultProducts: FurnitureApiProduct[]
}

// ─── Mapped types used by the app ─────────────────────────────────────────────

export interface CompositionRestoreItem {
    uniqueId: string
    furnitureId: number
    localItemNumber: string
    placement: {
        x: number
        y: number
        z: number
        heading: number
        headingI: number
        headingJ: number
        headingK: number
        /** 'SURFACE' for wall/floor items, furniture uniqueId string for dynamic stacking. */
        parentId: string | null
        parentAttachment: number | null
    }
    product: CompiledFurnitureProduct
    gfxAttributes: PlacedFurnitureEntry['gfxAttributes']
}

export interface ResolvedComposition {
    scene: SceneInfo
    restoreItems: CompositionRestoreItem[]
    savedProperties?: {
        erasedSegments?: number[]
    }
    /**
     * Response-level combinable default products, keyed by product ID string.
     * Returned at the top level when `combinables_default_products_noinline=true` is used
     * in the fetch URL. Pass this as `supplemental` to `scheduleCombinable` during restore.
     */
    supplementalCombinableProducts: Map<string, FurnitureApiProduct>
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const fetchComposition = (compositionId: string) =>
    fetchWrapper<CompiledCompositionApiResponse>(
        `/compositions/${compositionId}/compiled/?geometry_type=3d,2d_wall,wall_placeable&manifest_mode=manifest,gltf_manifest&combinables_default_products_noinline=true`,
    )

/**
 * Maps the raw compiled API response to the clean shape used for restore.
 * Pairs each placed furniture entry with its product catalog data, and
 * normalises `scene.sceneId` to the UUID (matching `useScene` behaviour).
 */
export function mapCompiledComposition(data: CompiledCompositionApiResponse): ResolvedComposition {
    const productById = new Map(data.furnitures.map((f) => [f.id, f]))

    const restoreItems: CompositionRestoreItem[] = data.composition.placedfurnitureSet.flatMap((pf) => {
        const product = productById.get(pf.furnitureId)
        if (!product) return []
        return [
            {
                uniqueId: pf.uniqueId,
                furnitureId: pf.furnitureId,
                localItemNumber: product.localItemNumber,
                placement: {
                    x: pf.x,
                    y: pf.y,
                    z: pf.z,
                    heading: pf.heading,
                    headingI: pf.headingI,
                    headingJ: pf.headingJ,
                    headingK: pf.headingK,
                    parentId: pf.parentId,
                    parentAttachment: pf.parentAttachment,
                },
                product,
                gfxAttributes: pf.gfxAttributes,
            },
        ]
    })

    // Build the supplemental map from response-level combinable products.
    // The fetch URL uses `combinables_default_products_noinline=true`, so product data
    // is returned here (not inlined per-furniture) and must be passed to scheduleCombinable.
    const supplementalCombinableProducts = new Map<string, FurnitureApiProduct>(
        data.combinablesDefaultProducts.flatMap((p) => (p.id != null ? [[String(p.id), p]] : [])),
    )

    return {
        // Normalise sceneId to UUID, same as useScene does with scene.uuid
        scene: { ...data.scene, sceneId: data.scene.uuid } as SceneInfo,
        restoreItems,
        savedProperties: data.composition.savedProperties,
        supplementalCombinableProducts,
    }
}
