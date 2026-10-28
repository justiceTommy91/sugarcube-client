import { NEW_COMPOSITION_ID } from 'models/compositions/constants'
import { PlacingBehavior } from 'Renderer/geomviewer'
import { isWallOrFloor, isWallPlaceableOnly, isFloorOnly, hasPlaceablesData, isSnapRotatable } from 'utils/placeables'
import { getRenderer } from 'models/refStore/selectors'
import { VariantItem } from 'models/variants'
import { ProductData } from 'models/furniture'
import type { CompositionDataItem } from 'models/compositions'
import { intersection } from 'utils/array'

export const getIsNewComposition = (compositionId: string, wid: number, userId: number) =>
    compositionId === NEW_COMPOSITION_ID || // if using the default comp
    wid !== userId // or if you don't own the comp

type RenderItemWithVisibility = {
    hidden?: boolean
}

export type CompositionItemMismatchDetectedPayload = {
    compositionId: string
    renderedItemCount: number
    productItemCount: number
    isEmptyMismatch: boolean
    timestamp: number
}

export const getRenderedItemCountForSave = (
    compositionData: Pick<CompositionDataItem, 'renderItems'> | null | undefined,
): number => {
    if (!compositionData?.renderItems) {
        return 0
    }

    return Object.values(compositionData.renderItems as Record<string, RenderItemWithVisibility>).filter(
        (item) => !item.hidden,
    ).length
}

export const getCompositionItemMismatchPayload = (
    compositionId: string,
    renderedItemCount: number,
    productItemCount: number,
    timestamp = Date.now(),
): CompositionItemMismatchDetectedPayload | null => {
    if (renderedItemCount === productItemCount) {
        return null
    }

    return {
        compositionId,
        renderedItemCount,
        productItemCount,
        isEmptyMismatch: productItemCount === 0 && renderedItemCount > 0,
        timestamp,
    }
}

function isVariantList(itemList: Array<VariantItem | ProductData>): itemList is Array<VariantItem> {
    return itemList.length > 0 && (itemList[0] as VariantItem).furnitureData !== undefined
}

// variants and swappables data are in different format. The data of interest can be
// in an array, in an object, or in a object.furnitureData property. This accessor function
// retrieves the placeable data of interest so that the same filtering can be used to
// filter variants and swappables with the same function.
export const productDataAccessor = (
    itemsData: Array<VariantItem | ProductData> | ProductData | VariantItem,
): ProductData | null => {
    let data: VariantItem | ProductData | null = null
    // If itemsData is an Array, use the first item from it, if not, use the data itself.
    if (Array.isArray(itemsData)) {
        if (itemsData.length > 0) {
            data = itemsData[0]
        }
    } else {
        data = itemsData
    }
    if (!data) {
        return null
    }
    // selected variant item case
    if ('furnitureData' in data) {
        return data.furnitureData
    }
    // Here, `itemsData` is not an Array, and has no 'furnitureData' property,
    // we're assuming it's a ProductData, i.e., selected swappable item case.
    return data
}

// function that filters swappables/variants depending on the item's position for wallOrFloor items.
// Wall only and floor items items filtered also in case there are spurious items with undesired
// geometryType in the data set.
export const getItemsPosSpecific = (
    selectedSwapFurnitureData: ProductData | null,
    swappableItemsData: Array<ProductData | VariantItem>,
    placingBehavior: PlacingBehavior,
) => {
    const isSwappableOrVariantBaseItemsNull = !swappableItemsData
    if (!isSwappableOrVariantBaseItemsNull && selectedSwapFurnitureData) {
        const isItemOnWall = placingBehavior === PlacingBehavior.ON_WALL
        const isItemOnFloor = placingBehavior === PlacingBehavior.ON_FLOOR
        let filteredItems = swappableItemsData
        const isSelectedWallOrFloor =
            isWallOrFloor(selectedSwapFurnitureData?.placeables, selectedSwapFurnitureData?.geometryTypes) &&
            placingBehavior
        const isSelectedFloorItem = isFloorOnly(
            selectedSwapFurnitureData?.placeables,
            selectedSwapFurnitureData?.geometryTypes,
        )
        const isSelectedWallPlaceableOnly = isWallPlaceableOnly(selectedSwapFurnitureData?.placeables)
        // sentry errors. Check if there are spurious items in the sets
        if (isSelectedWallPlaceableOnly) {
            const areFloorItemsInWallSet = swappableItemsData.some((item) => {
                if (!item) {
                    return false
                }
                const isFloorOnlyItem = isFloorOnly(
                    productDataAccessor(item)?.placeables,
                    productDataAccessor(item)?.geometryTypes,
                )
                return isFloorOnlyItem
            })
            if (areFloorItemsInWallSet) {
                // Drop error somewhere to track this. Probably mixpanel.
                // https://geomagical.atlassian.net/browse/GFX-3429
            }
        }
        if (isSelectedFloorItem) {
            const areWallItemsInFloorSet = swappableItemsData.some((item) => {
                const isWallOnlyItem = isWallPlaceableOnly(productDataAccessor(item)?.placeables)
                return isWallOnlyItem
            })
            if (areWallItemsInFloorSet) {
                // Drop error somewhere to track this. Probably mixpanel.
                // https://geomagical.atlassian.net/browse/GFX-3429
            }
        }

        if (isSelectedWallOrFloor) {
            const floorItems = swappableItemsData.filter((item) => {
                const isFloorOnlyItem = isFloorOnly(
                    productDataAccessor(item)?.placeables,
                    productDataAccessor(item)?.geometryTypes,
                )
                return (
                    isWallOrFloor(productDataAccessor(item)?.placeables, productDataAccessor(item)?.geometryTypes) ||
                    isFloorOnlyItem
                )
            })

            const wallItems = swappableItemsData.filter(
                (item) =>
                    isWallOrFloor(productDataAccessor(item)?.placeables, productDataAccessor(item)?.geometryTypes) ||
                    isWallPlaceableOnly(productDataAccessor(item)?.placeables),
            )

            if (isItemOnFloor || isSelectedFloorItem) {
                filteredItems = floorItems
            }

            if (isItemOnWall || isSelectedWallPlaceableOnly) {
                filteredItems = wallItems
            }

            const intersectionElements = intersection(floorItems, wallItems)

            if (!isVariantList(swappableItemsData)) {
                // Put items not belonging to intersection first and rest of elements according to intersection order.
                filteredItems.sort((a, b) => intersectionElements.indexOf(a) - intersectionElements.indexOf(b))
            }
        }

        return filteredItems
    }

    return swappableItemsData
}

export const getItemsWithNoWallOrFloor = (swappableItemsData: Array<ProductData | VariantItem>) => {
    let filteredItems = swappableItemsData
    if (swappableItemsData) {
        filteredItems = swappableItemsData.filter(
            (item) => !isWallOrFloor(productDataAccessor(item)?.placeables, productDataAccessor(item)?.geometryTypes),
        )
    }

    return filteredItems
}

// filter function to detect specific case of missing metadata for geometryTypes: ['wall_placeable'].
function isWallPlaceableOnlyDataOK(geometryTypes: string[], placeables: ProductData['placeables']) {
    const isWallPlaceableOnlyGeometry = geometryTypes.length === 1 && geometryTypes[0] === 'wall_placeable'

    if (!isWallPlaceableOnlyGeometry) return true

    const isWallPlaceableMetadataOK = isWallPlaceableOnlyGeometry && hasPlaceablesData(placeables)
    if (!isWallPlaceableMetadataOK) {
        // Drop error somewhere to track this.Probably mixpanel.
        // https://geomagical.atlassian.net/browse/GFX-3429
    }

    return isWallPlaceableMetadataOK
}

// Filter function that checks metadata correctness for variants metadata.
// Correcteness criteria:
// 1.- All the variants need either have or dont have placeable data according to the selected item.
// 2.- All the variants need to be snapRotable or not according to the selected item.
// 3.- There is no case of wall_placeable item with missing metadata.
export function isVariantMetadataOK(selectedSwapFurnitureData: ProductData | null, variantItem: VariantItem) {
    const hasSelectedItemPlaceablesData = hasPlaceablesData(selectedSwapFurnitureData?.placeables)
    const isSelectedSnapRotable = isSnapRotatable(selectedSwapFurnitureData?.placeables)
    const hasItemPlaceableData = hasPlaceablesData(productDataAccessor(variantItem)?.placeables)
    const isItemSnapRotable = isSnapRotatable(productDataAccessor(variantItem)?.placeables)
    // wallOrFloor items may or may not have metadata. geometryTypes array is what determines the placement option.
    // For this case there is no mismatch if some items have placeable data and others don't.
    const isPlaceableDataAvailabilityOK =
        hasItemPlaceableData === hasSelectedItemPlaceablesData ||
        isWallOrFloor(selectedSwapFurnitureData?.placeables, selectedSwapFurnitureData?.geometryTypes)
    const isDataMatch = isPlaceableDataAvailabilityOK && isItemSnapRotable === isSelectedSnapRotable

    if (!isDataMatch) {
        // Drop error somewhere to track this.Probably mixpanel.
        // https://geomagical.atlassian.net/browse/GFX-3429
    }
    const variantItemData = productDataAccessor(variantItem)
    if (!variantItemData) {
        return false
    }
    const { geometryTypes, placeables } = variantItemData
    const isWallPlaceableOnlyDataOk = isWallPlaceableOnlyDataOK(geometryTypes, placeables)

    return isDataMatch && isWallPlaceableOnlyDataOk
}

// Checks all variant items either have or do not have placeable data. For snapRotables checks if variants have
// matching snap rotation metadata. Can be removed when the data correctness is guaranteed by the backend.
// https://geomagical.atlassian.net/browse/GFX-2462
export function checkVariantsMetadata(
    selectedSwapFurnitureData: ProductData | null,
    variantItemsData: Array<VariantItem>,
) {
    const filteredItems = variantItemsData.filter((item) => isVariantMetadataOK(selectedSwapFurnitureData, item))

    return filteredItems
}

export const getProcessedItemsFinal = (
    selectedFurnitureItem: ProductData | null,
    swappableItemsData: Array<ProductData | VariantItem>,
    placingBehavior: PlacingBehavior,
) => {
    if (getRenderer()?.checkSupportWallOrFloorItems()) {
        let processedItems = getItemsPosSpecific(selectedFurnitureItem, swappableItemsData, placingBehavior)
        if (isVariantList(processedItems)) {
            processedItems = checkVariantsMetadata(selectedFurnitureItem, processedItems as Array<VariantItem>)
        }

        return processedItems
    }

    return getItemsWithNoWallOrFloor(swappableItemsData)
}
