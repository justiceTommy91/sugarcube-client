import { renderTypeFromGeometryTypes } from '@gatsby/models/furniture/helpers'
import { PlacingBehavior } from '@gatsby/Renderer/geomviewer'
import { localizedCurrency } from '@gatsby/utils/convertCurrency'
import type { FurnitureItem } from '@astro-services/furnitureService'

// --- Product tracking ---

export type FmfProductTrackingInfo = {
    ProductId: number
    ProductTitle: string
    LocalItemNumber: string
    ProductType: string
    Value: number
    Currency: string
    CanStack: boolean
    placingBehavior: string
}

type PlaceablesData = {
    anchors: { category: string; constraint?: string }[]
    combinations: number[][]
} | null | undefined

function hasPlaceablesData(p: PlaceablesData): p is NonNullable<PlaceablesData> {
    return !!p && Object.keys(p).length > 0
}

function isWallPlaceableOnly(p: PlaceablesData): boolean {
    return hasPlaceablesData(p) && p.anchors.every((a) => a.category === 'wall')
}

function isWallAndFloor(p: PlaceablesData): boolean {
    if (!hasPlaceablesData(p)) return false
    return (
        p.anchors.some((a) => a.category === 'wall' && a.constraint === 'back') &&
        p.anchors.some((a) => a.category === 'floor' && a.constraint === 'bottom') &&
        p.combinations.length === 1 &&
        p.combinations[0][0] === 0 &&
        p.combinations[0][1] === 1
    )
}

function isWallOrFloor(p: PlaceablesData, geometryTypes: string[]): boolean {
    const fromGeomTypes = geometryTypes.includes('3d') && geometryTypes.includes('wall_placeable')
    if (!hasPlaceablesData(p) && !fromGeomTypes) return false
    if (!hasPlaceablesData(p)) return fromGeomTypes

    const singleCombValues = p.combinations.filter((c) => c.length === 1).flat()
    const fromMetadata =
        p.anchors.some((a) => a.category === 'wall' && a.constraint === 'back') &&
        p.anchors.some((a) => a.category === 'floor' && a.constraint === 'bottom') &&
        p.combinations.length === 2 &&
        singleCombValues.some((v) => v === 0) &&
        singleCombValues.some((v) => v === 1)

    return fromMetadata || fromGeomTypes
}

function getFmfPlacingBehavior(item: FurnitureItem): string {
    const renderType = renderTypeFromGeometryTypes(item.geometryTypes)
    if (renderType === 'ART_ITEM') return PlacingBehavior.WALL_ART

    const placeables = item.metadata?.placeables as PlaceablesData
    if (isWallPlaceableOnly(placeables)) return PlacingBehavior.ON_WALL
    if (isWallAndFloor(placeables)) return PlacingBehavior.WALL_AND_FLOOR
    if (isWallOrFloor(placeables, item.geometryTypes ?? [])) return PlacingBehavior.WALL_OR_FLOOR
    return PlacingBehavior.ON_FLOOR
}

export function getFmfProductTrackingInfo(item: FurnitureItem): FmfProductTrackingInfo {
    return {
        ProductId: item.id,
        ProductTitle: item.name,
        LocalItemNumber: item.localItemNumber,
        ProductType: item.typeName,
        Value: Number(item.priceNumeral),
        Currency: localizedCurrency(),
        CanStack: item.stacks,
        placingBehavior: getFmfPlacingBehavior(item),
    }
}

