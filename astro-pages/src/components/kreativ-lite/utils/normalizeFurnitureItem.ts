import { furnitureItemStackables, furnitureItemStackableAlternates } from '@utils/stackables'
import type { FurnitureSearchItem } from '../hooks/useKreativLiteSearch'
import type { FurnitureApiProduct } from '../../../services/kreativLiteFurnitureService'
import type { CompiledFurnitureProduct } from '../../../services/compositionService'

/**
 * Normalises a raw furniture API response into the shape that
 * `furniturePropsToFurnitureItemParams` expects.
 *
 * The search API returns flat minX/minY/minZ properties and may nest placeables,
 * stackables, and stackablesAlternate inside metadata or productGeometries — this
 * function reconciles all of those variants into a single consistent shape. In the
 * Gatsby app this normalisation happens automatically via Redux; the astro app
 * bypasses Redux so it must be done explicitly here.
 */
export function normalizeFurnitureItem(item: FurnitureApiProduct | CompiledFurnitureProduct): FurnitureSearchItem {
    return {
        // name is required on FurnitureSearchItem. CompiledFurnitureProduct (composition restore path)
        // does not carry a display name from the API — default to empty string.
        name: '',
        ...item,
        min: { x: item.minX, y: item.minY, z: item.minZ },
        max: { x: item.maxX, y: item.maxY, z: item.maxZ },
        placeables:
            item.placeables ??
            (item.metadata as Record<string, unknown> | undefined)?.placeables ??
            ((item.productGeometries as Record<string, Record<string, unknown>> | undefined)?.simple?.pipelineJson as Record<string, unknown> | undefined)?.placeables ??
            {},
        stackables: furnitureItemStackables(item),
        stackablesAlternate: furnitureItemStackableAlternates(item),
        isRug: (item.isRug as boolean | undefined) ?? false,
        hasTallLegs: (item.hasTallLegs as boolean | undefined) ?? false,
        isCubicStructure: (item.isCubicStructure as boolean | undefined) ?? false,
        heading: item.heading ?? 0,
    }
}
