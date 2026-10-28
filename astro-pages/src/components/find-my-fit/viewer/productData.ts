import { convertMetersToParts } from '@gatsby/utils/convertDimensions'
import type {
    DimensionRange,
    FurnitureItem,
    FurnitureSearchParams,
    FurnitureSearchResponse,
} from '@astro-services/furnitureService'
import type { DimensionLabels, ProductFamily } from './types'

// -- Bbox → search params ------------------------------------------------

// Whole-unit count matching the displayed value. Shares rounding with convertMetersToParts so same-display floats collapse to one N.
export function displayedWholeUnits(meters: number, isImperial: boolean): number {
    const { wallLengthFeetPart, wallLengthInchesPart, wallLengthCm } = convertMetersToParts(meters, isImperial)
    if (isImperial) {
        return (wallLengthFeetPart ?? 0) * 12 + (wallLengthInchesPart ?? 0)
    }
    return wallLengthCm ?? 0
}

// max = one unit above N so anything that displays as N fits inside; min halves max (floored) for width/height, or 0 for depth.
export function searchRangeFromUnits(n: number, isImperial: boolean, halve: boolean): DimensionRange {
    const unitMm = isImperial ? 25.4 : 10
    const max = Math.ceil((n + 1) * unitMm)
    const min = halve ? Math.floor(max / 2) : 0
    return { min, max }
}

// Converts a drawn bounding box into search params for the furniture API.
//
// GeomViewer dimensions are relative to the drawn surface:
//   Wall:  width = side-to-side, height = floor-to-top, depth = front-to-back
//   Floor: width/height = U/V extents on the floor plane, depth = upward extrusion.
//          The rotation aligns the item's width with the longer floor axis,
//          so physical width = max(w,h), physical depth = min(w,h).
//
// Search ranges (applied to physical dimensions, not drawn axes):
//   width:  floor(max/2) to max, where max = (displayedN + 1) * unit.
//   height: floor(max/2) to max.
//   depth:  0 to max.
const FALLBACK_CATEGORY_ID = 'st001' // Storage category
type SearchContext = {
    queryTerm?: string | null
    categoryId?: string | null
    lods?: string | null
}

export function bboxToSearchParams(
    dims: DimensionLabels,
    context: SearchContext = {},
    isImperial = false,
): FurnitureSearchParams {
    // Compare on canonical values so inputs that display identically also swap identically.
    const isFloor = dims.surfaceClass === 'floor'
    const nWidth = displayedWholeUnits(dims.width, isImperial)
    const nHeight = displayedWholeUnits(dims.height, isImperial)
    const nDepth = displayedWholeUnits(dims.depth, isImperial)
    const nPhysicalWidth = isFloor ? Math.max(nWidth, nHeight) : nWidth
    const nPhysicalHeight = isFloor ? nDepth : nHeight
    const nPhysicalDepth = isFloor ? Math.min(nWidth, nHeight) : nDepth

    // Use referrer context when available; fall back to the storage category.
    const hasContext = context.queryTerm || context.categoryId
    return {
        queryTerm: context.queryTerm,
        categoryId: hasContext ? context.categoryId : FALLBACK_CATEGORY_ID,
        measurementsWidth: searchRangeFromUnits(nPhysicalWidth, isImperial, true),
        measurementsHeight: searchRangeFromUnits(nPhysicalHeight, isImperial, true),
        measurementsDepth: searchRangeFromUnits(nPhysicalDepth, isImperial, false),
        lods: context.lods,
    }
}

// -- API response → ProductFamily[] --------------------------------------
function makeVariantLabel(v: FurnitureItem): string {
    const desc = v.description || ''
    const afterType = desc.replace(/^[^,]*,\s*/, '')
    return afterType || v.name
}

function dedupeById(items: FurnitureItem[]): FurnitureItem[] {
    const seen = new Set<number>()
    return items.filter((v) => {
        if (seen.has(v.id)) return false
        seen.add(v.id)
        return true
    })
}

function toFamily(name: string, items: FurnitureItem[]): ProductFamily {
    return { name, variants: items.map((v) => ({ label: makeVariantLabel(v), data: v })) }
}

// Returns the IDs of items belonging to the colour variant category, or null if none found.
function getColourVariantIds(
    variantsType: FurnitureSearchResponse['variants'][string]['variantsType'],
): Set<number> | null {
    const colourCat = Object.values(variantsType).find((cat) => /colou?r/i.test(cat.typeName))
    if (!colourCat) return null
    return new Set(colourCat.values.flatMap((v) => v.items))
}

// Converts the raw API response into ProductFamily[].
// Each product becomes a family. Variants are restricted to the colour category
// so that swatches only show colour options.
export function groupFurnitureItems(response: FurnitureSearchResponse | null): ProductFamily[] {
    if (!response) return []
    const { products, variants } = response

    return products.map((product) => {
        const genericId = product.genericId != null ? String(product.genericId) : null
        const variantData = genericId ? variants[genericId] : null
        const allVariants = variantData?.variantFurnitures ?? []

        const colourIds = variantData ? getColourVariantIds(variantData.variantsType) : null
        const colourVariants = colourIds ? allVariants.filter((v) => colourIds.has(v.id)) : allVariants

        return toFamily(product.name, dedupeById([product, ...colourVariants]))
    })
}
