import { combineReducers } from 'redux'
import * as Sentry from '@sentry/react'
import * as types from 'models/actionTypes'
import sortByArray from 'utils/sortByArray'
import { furnitureItemStackables, furnitureItemStackableAlternates } from 'utils/stackables'
import { furnitureItemPlaceables } from 'utils/placeables'
import { CATEGORIES_IDS as CATORDER, SUBCATEGORIES_IDS as SUBCATORDER } from 'constants/categories'
import { MIRROR_TYPE_MAP } from 'constants/mirrorTypes'
import { UNAVAILABLE_PRICE } from 'constants/price'
import { stringIncludesCaseInsensitive } from 'utils/string'
import {
    renderTypeFromGeometryTypes,
    makeDefaultAvailability,
    makeProductAvailability,
    isItemSnapRotable,
} from 'models/furniture/helpers'
import { FURNITURE_ITEM } from 'constants/renderItemTypes'
import { hasProp } from 'utils/object'
import { generateProductDescription } from 'utils/product'

/**
 * Determines whether or not a product descriptor refers to a rug.
 * As is indicated by the following logic:
 *
 *   - if productDescriptor.businessName === "Rugs"
 *   -   return true
 *   - if productDescriptor.businessName === "Children's IKEA" &&
 *   -    productDescriptor.description is in english
 *   -    && productDescriptor.description starts with the word "Rug"
 *   -   return true
 *   - return false
 *
 * NOTE: from this DOMO chart:
 *
 * https://geomagical.domo.com/page/-100000/kpis/details/2120946809,
 *
 * which attempts to get all items with "rug" in its description,
 * you see that almost all rugs are categorized with the businessName
 * property set to "Rugs".
 *
 * However, there are 3 rugs that are instead categorized as items for
 * children, with the businessName property set to "Children´s IKEA"
 * Currently the only way to distinguish these rugs are to look for
 * a description that starts with "Rug, ...". This is an english-only
 * description. According to the above DOMO card, these items are only
 * released in english-language regions. Unclear what the description
 * would be if released in non-english language regions. In that case,
 * it would be preferable to have a way to better classify the item
 * as rugs in the metadata.
 *
 * @param {Object} productDescriptor
 * @returns {Boolean}
 */
const isRugProduct = (productDescriptor) => {
    const { businessName, description } = productDescriptor

    if (businessName) {
        if (businessName === 'Rugs') {
            return true
        }

        // note the use of the ´ character. This is intentional.
        // It is a character that is used in this metadata.
        if (businessName === 'Children´s IKEA') {
            // Case-ignored regex to determine if the description of
            // a potential rug product follows the convention
            // "Rug, ..." in english. This regex also checks for
            // "Rugs, ..." as a safety net.
            return /^\bRugs{0,1}\b/i.test(description)
        }
    }
    return false
}

/** @type {(product: import('.').APIProduct) => Record<number, import('.').ProductData>} */
const processProductItem = (product) => {
    const { geometryTypes } = product

    // TODO: Combinables don't have a geometryTypes
    const renderType = geometryTypes ? renderTypeFromGeometryTypes(geometryTypes) : FURNITURE_ITEM
    const thumbUrl = product.thumbUrl

    const hasTallLegs = ['Tables & desks', 'Chairs'].some((category) =>
        stringIncludesCaseInsensitive(category, product.subCategories),
    )
    const isCubicStructure = [
        'Drawer units',
        'Dressers & storage drawers',
        'Storage solution systems',
        'Sideboards, buffets & sofa tables',
        'Display & storage cabinets',
        'Filing cabinets & storage cabinets',
        'TV & media furniture',
        'Shelving units, bookcases & storage options',
        'Clothes organizers',
        'Nightstands',
        'Bathroom storage',
    ].some((category) => stringIncludesCaseInsensitive(category, product.subCategories))

    const availability =
        product.availability ||
        (product.buyingOption && {
            availableForHomeDelivery: product.availableForHomeDelivery,
            availableForCashCarry: product.availableForCashCarry,
            availableForClickCollect: product.availableForClickCollect,
            buyingOption: product.buyingOption,
        })

    const mirrorType = MIRROR_TYPE_MAP[product.configurabilityType] || null

    const placeables = furnitureItemPlaceables(product)
    const isCombinableChild = product.combinablesPlugs?.length > 0

    const socketSetName = product.combinablesDefaultSocketSet
    const socketSetId = product.combinablesSocketSets?.findIndex((set) => set.name === socketSetName) ?? -1
    const defaultSocketSet = socketSetId !== -1 ? product.combinablesSocketSets[socketSetId] : undefined

    // Currently we always have only 1 product material in the array so we always read productMaterials[0]
    let productMaterialUrl
    if (product.productGeometries?.productMaterials?.length > 0) {
        productMaterialUrl = product.productGeometries.productMaterials[0].url
    }

    return {
        [product.id]: {
            id: product.id,
            region: product.region,
            name: product.name,
            typeName: product.typeName,
            thumbUrl,
            collections: product.collections,
            rootCategories: product.rootCategories,
            categories: product.categories,
            categoryIds: product.categoryIds,
            subCategoryIds: product.subCategoryIds,
            subCategories: product.subCategories,
            ecommerceUrl: product.ecommerceUrl,
            globalProductId: product.globalProductId,
            price: product.price || UNAVAILABLE_PRICE,
            priceNumeral: parseFloat(product.priceNumeral) || 0,
            rating: product.rating,
            ratingCount: product.ratingCount,
            description: generateProductDescription(product),
            imageUrls: product.imageUrls,
            qaStatus: product.qaStatus,
            availableInRegion: product.availableInRegion,
            uncompressedModelSize: product.uncompressedModelSize,
            localItemNumber: product.localItemNumber,
            recommended: product.recommended,
            subCatalogs: product.subCatalogs,
            swappableItems: null,
            goesWithItems: null,
            renderType,
            availability: makeProductAvailability(availability),
            mirrorType,
            entities: product.entities,
            smartaClass: product.smartaClass,

            // Furniture props
            modelUrl: product.modelUrl,
            materialUrl: productMaterialUrl,
            rotX: product.rotX, // TODO check proptypes
            scale: product.scale,
            max: { x: product.maxX, y: product.maxY, z: product.maxZ },
            min: { x: product.minX, y: product.minY, z: product.minZ },
            stacks: product.stacks, // TODO check proptypes
            stackables: furnitureItemStackables(product), // TODO check proptypes
            stackablesAlternate: furnitureItemStackableAlternates(product),
            placeables,
            isRug: isRugProduct(product),
            metadata: product.metadata,
            hidden: product.hidden || false,
            hasTallLegs,
            isCubicStructure,
            isSnapRotable: isItemSnapRotable(placeables),
            isSupportedAutodecorate: product.isSupportedAutodecorate,
            combinablesDefaultProducts: product.combinablesDefaultProducts,
            combinablesSocketSet: defaultSocketSet,
            productGeometries: product.productGeometries,
            combinablesMetadata: product.combinablesMetadata, // change this to be a call for metadata from parent
            combinablesPlugs: product.combinablesPlugs,
            isCartIgnored: product.isCartIgnored,
            isNullable: product.isNullable,
            isNoninteractable: product.isNoninteractable,
            isCombinableChild,
            requiresWallContact: product.requiresWallContact,

            // Art props
            artAssetUrls: product.processedImageUrls,
            displayHeightCm: product.displayHeightCm,
            displayWidthCm: product.displayWidthCm,

            // Admin properties
            globalProductAdminUrl: product.globalProductAdminUrl,
            localProductAdminUrl: product.localProductAdminUrl,
            localProductStudioAdminUrl: product.localProductStudioAdminUrl,
            salesEndDateGlobal: product.salesEndDateGlobal,
            variants: null,
            geometryTypes: product.geometryTypes,
        },
    }
}

const validateProductItem = (product) => {
    if (product.productGeometries?.productMaterials && product.productGeometries.productMaterials.length === 0) {
        Sentry.captureMessage(`Cannot find product material: "${product.name}"`)
        return false
    }

    const hasIncorrectDynamicGeometry = product.productGeometries?.dynamic?.some((geom) => {
        const socketType = geom.socketType ?? geom.rules?.socketType
        if (!socketType || !geom.rules) {
            Sentry.captureMessage(`Cannot find 'socketType' or 'rules' for product geometry data: "${product.name}"`)
            return true
        }

        return false
    })

    return !hasIncorrectDynamicGeometry
}

const processProductVariant = (product, variantsSelected, variantId) => {
    const productItem = processProductItem(product)
    return {
        [product.id]: {
            ...productItem[product.id],
            variants: variantId,
            variantsSelected,
        },
    }
}

const mergeFurnitureIntoState = (newFurniture, state) => {
    newFurniture.forEach((incomingProductRecord) => {
        const [[key, incomingProduct]] = Object.entries(incomingProductRecord)
        const incomingProductId = Number(key)

        // Add product furniture data if it doesn't exist in the state.
        // If the furniture data already exists in the state we want to keep it
        // but also add any new incoming dynamic product geometry to it
        // e.g. for swappable duvet geometry of different sizes linked to the same product.
        if (!state[incomingProductId]) {
            state[incomingProductId] = incomingProduct // eslint-disable-line no-param-reassign
        } else if (incomingProduct.productGeometries?.dynamic) {
            const oldGeometries = state[incomingProductId].productGeometries?.dynamic ?? []
            incomingProduct.productGeometries.dynamic.forEach((newGeom) => {
                const geomFound = oldGeometries.find(
                    (oldGeom) =>
                        oldGeom.socketType?.size === newGeom.socketType?.size &&
                        oldGeom.socketType?.category === newGeom.socketType?.category &&
                        oldGeom.rules?.parentHasMetadata?.bedspreadType ===
                            newGeom.rules?.parentHasMetadata?.bedspreadType,
                )

                if (!geomFound) {
                    state[incomingProductId].productGeometries?.dynamic.push(newGeom)
                }
            })
        }
    })
}

export const initialState = {
    byId: {},
    selectedId: null,
    swapAnchorId: null,
    selectedSwapDetailsId: null,
    filter: {
        query: null,
        category: '*',
        subCategory: '*',
        subCatalog: '*',
        roomType: '*',
        subCategoryIds: null,
        availableOnline: false,
        inStockStore: false,
        // by default INGKA SIK API is sorted by RELEVANCE
        sortOrder: 'RELEVANCE',
        isRoomTypeSearch: false,
    },
    // Room type and subcategory selection state for roomType filters UI
    selectedRoomTypeId: null,
    selectedSubCategoryId: null,
    subCategoryNames: null,
    lastSelectedRoomTypeId: null,
    roomTypeTranslatedName: null,
    location: {
        zipcode: null, // string
        storeId: null, // number
    },
    loadedSubCatalogs: [],
    isLoading: false,
    isSwappablesLoading: false,
    isCategoriesLoading: false,
    isGoesWithLoading: false,
    hasAdditionalFurniture: false,
    isLoadingByIds: false,
    stackEnabled: true, // TODO remove entirely
    categories: [],
    filterResult: {
        ids: [],
        count: 0,
        maxCount: 0,
        currentPage: 0,
        hasNext: true,
        moreToken: null,
    },
    rawFilters: [],
    selectedFilterOptions: {},
    sortOrders: null,
    isVariantsLoading: false,
    isLoadingByLocalItemNos: false,
    isLoadingBySetId: false,
    swappablesLoadHasNext: false,
    recommendations: {
        isFetching: false,
        isError: false,
        data: [],
    },
}

export const byId = (state = initialState.byId, action) => {
    switch (action.type) {
        case types.RECEIVE_FURNITURE:
        case types.RECEIVE_FURNITURE_BY_IDS:
        case types.RECEIVE_FURNITURE_BY_LOCALITEMNOS:
        case types.RECEIVE_FURNITURE_BY_SET_ID:
        case types.RECEIVE_ADDITIONAL_FURNITURE:
        case types.RECEIVE_SOCKET_FURNITURE:
            return Object.assign({}, state, ...action.furniture.filter(validateProductItem).map(processProductItem))
        case types.RECEIVE_COMPILED_COMPOSITION:
            return Object.assign(
                {},
                state,
                ...action.payload.furniture.filter(validateProductItem).map(processProductItem),
            )
        case types.RECEIVE_PERSONALIZED_PRODUCT_RECOMMENDATIONS:
            return Object.assign({}, state, ...action.payload.filter(validateProductItem).map(processProductItem))
        case types.RECEIVE_FURNITURE_SWAPPABLES: {
            const { id, furniture } = action
            const validFurnitureSwappables = furniture.filter(validateProductItem)
            const allSwappableFurnitureInfo = validFurnitureSwappables.map(processProductItem)

            const newState = { ...state }
            mergeFurnitureIntoState(allSwappableFurnitureInfo, newState)

            const swappableItemsIds = validFurnitureSwappables.map((product) => product.id)

            const currentSwappableIds = state[id].swappableItems ?? []
            newState[id] = {
                ...state[id],
                swappableItems: [...currentSwappableIds, ...swappableItemsIds],
            }

            return newState
        }
        case types.RECEIVE_FURNITURE_GOES_WITH: {
            const { id, furniture } = action
            const allFurnitureWithGoesWithInfo = furniture.filter(validateProductItem).map(processProductItem)

            const newState = { ...state }
            mergeFurnitureIntoState(allFurnitureWithGoesWithInfo, newState)

            const goesWellWithIds = furniture.map((product) => product.id)
            newState[id] = {
                ...state[id],
                goesWithItems: goesWellWithIds,
            }

            return newState
        }
        case types.RECEIVE_FURNITURE_COMBINABLES: {
            const newState = { ...state }
            newState[action.parentId].metadata.combinables.nodesMeta[action.nodeIndex].items = action.furniture.map(
                (furni) => furni.id,
            )
            return newState
        }
        case types.RECEIVE_FURNITURE_VARIANTS: {
            const { id, furnitures, selectedIndices } = action
            const hasFurnitureVariants = furnitures && furnitures.length
            const allFurnituresWithVariantsInfo = hasFurnitureVariants
                ? furnitures
                      .filter(validateProductItem)
                      .map((item) => processProductVariant(item, selectedIndices[item.id], id))
                : []

            const newState = { ...state }
            mergeFurnitureIntoState(allFurnituresWithVariantsInfo, newState)

            const variantsInfoForSelectedFurniture = hasFurnitureVariants
                ? {
                      variants: id,
                      variantsSelected: selectedIndices[id],
                  }
                : {
                      variants: null,
                      variantsSelected: null,
                  }

            newState[id] = {
                ...state[id],
                ...variantsInfoForSelectedFurniture,
            }

            return newState
        }
        case types.UPDATE_LOCATION: {
            // Reset all availabilities when the location is updated
            const nextState = {}
            Object.entries(state).forEach(([id, product]) => {
                nextState[id] = { ...product, availability: makeDefaultAvailability() }
            })
            return nextState
        }

        default:
            return state
    }
}

export const selectedId = (state = initialState.selectedId, action) => {
    switch (action.type) {
        case types.SELECT_FURNITURE:
            return action.payload.id
        default:
            return state
    }
}

export const hasAdditionalFurniture = (state = initialState.hasAdditionalFurniture, action) => {
    switch (action.type) {
        case types.RECEIVE_ADDITIONAL_FURNITURE:
            return true
        default:
            return state
    }
}

// swapAnchorId is different from the selectedId and is used to display
// a consistent set of swappable items for the original selected furniture.
// The selectedId value will change as furniture is swapped, while
// the swapAnchorId state maintains the original selection.
export const swapAnchorId = (state = initialState.swapAnchorId, action) => {
    switch (action.type) {
        case types.SHOW_SWAP_MENU:
            return action.id
        default:
            return state
    }
}

export const selectedSwapDetailsId = (state = initialState.selectedSwapDetailsId, action) => {
    switch (action.type) {
        case types.SELECT_FURNITURE_SWAP_DETAILS:
            return action.id
        default:
            return state
    }
}

export const filter = (state = initialState.filter, action) => {
    switch (action.type) {
        case types.FURNITURE_FILTER_UPDATE: {
            // If the action contains a query and it's different from current query,
            // start with a clean base (initialState.filter) to avoid preserving filter parameters
            const isQueryChange = action.filter.query !== undefined && action.filter.query !== state.query
            const baseState = isQueryChange ? initialState.filter : state

            const nextFilter = {
                ...baseState,
                ...action.filter,
            }

            // If user types new search query, exit room type search mode
            if (isQueryChange && action.filter.query && !action.filter.isRoomTypeSearch) {
                nextFilter.isRoomTypeSearch = false
            }

            // Only clear query if we're setting actual filter values (not default '*' values)
            // and the query wasn't explicitly provided in the action
            if (
                (action.filter.subCatalog && action.filter.subCatalog !== '*') ||
                (action.filter.roomType && action.filter.roomType !== '*') ||
                (action.filter.category && action.filter.category !== '*') ||
                (action.filter.subCategory && action.filter.subCategory !== '*') ||
                (action.filter.subCategoryIds && action.filter.subCategoryIds !== null)
            ) {
                // Only clear query if it wasn't explicitly provided in this action
                if (!hasProp(action.filter, 'query')) {
                    nextFilter.query = null
                }
            }

            // these values must be set to '*' if not specified in the action
            nextFilter.category = action.filter.category || '*'
            nextFilter.subCategory = action.filter.subCategory || '*'
            nextFilter.subCatalog = action.filter.subCatalog || '*'
            nextFilter.roomType = action.filter.roomType || '*'

            // Preserve subCategoryIds from current state if not explicitly provided
            if (!hasProp(action.filter, 'subCategoryIds')) {
                // Special case: if this is a query change and we had subcategory IDs,
                // clear them to allow unrestricted search
                if (isQueryChange && state.subCategoryIds && action.filter.query) {
                    nextFilter.subCategoryIds = null
                } else {
                    nextFilter.subCategoryIds = state.subCategoryIds
                }
            }

            // if any of the filter values are set, clear the search facets
            if (
                action.filter.query ||
                action.filter.category ||
                action.filter.subCategory ||
                action.filter.subCatalog ||
                action.filter.roomType ||
                action.filter.subCategoryIds
            ) {
                delete nextFilter.size
                delete nextFilter.color
                delete nextFilter.price
            }

            return nextFilter
        }
        case types.FURNITURE_FILTER_CLEAR: {
            // When clearing the filters we want to preserve the search query
            // so that the user can continue searching with the same query
            const clearedState = {
                ...initialState.filter,
                query: state.query,
            }
            return clearedState
        }
        case types.SELECT_ROOM_TYPE_IN_FILTER:
            // Start room type search mode
            return {
                ...initialState.filter,
                query: action.roomTypeSearchQuery,
                subCategoryIds: action.subCategoryIds,
                isRoomTypeSearch: true,
            }
        case types.FILTER_BY_SUB_CATEGORY:
            // Exit room type search mode, use category filtering
            return {
                ...initialState.filter,
                query: null,
                subCategoryIds: action.subCategoryIds,
                isRoomTypeSearch: false,
            }
        case types.CLEAR_SUB_CATEGORY_FILTER:
            // Restore room type search mode
            return {
                ...initialState.filter,
                query: action.restoreQuery || null,
                subCategoryIds: action.subCategoryIds,
                isRoomTypeSearch: !!action.restoreQuery,
            }
        case types.RESET_ROOM_TYPE_FILTERS_IN_FILTER:
            return {
                ...state,
                subCategoryIds: null,
                isRoomTypeSearch: false,
            }
        case types.CLEAR_SEARCH_AND_RESTORE_ROOM_TYPE:
            return {
                ...initialState.filter,
                query: null,
                subCategoryIds: action.subCategoryIds,
                isRoomTypeSearch: false,
            }
        default:
            return state
    }
}

const location = (state = initialState.location, action) => {
    switch (action.type) {
        case types.UPDATE_LOCATION: {
            const nextState = { ...state }

            if (action.zipcode !== undefined) {
                nextState.zipcode = action.zipcode
            }

            if (action.storeId !== undefined) {
                nextState.storeId = action.storeId
            }

            return nextState
        }
        default:
            return state
    }
}

const isLoading = (state = initialState.isLoading, action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_SAGA:
            return true
        case types.RECEIVE_FURNITURE:
        case types.RECEIVE_FURNITURE_COMBINABLES:
        case types.FAILED_RECEIVE_FURNITURE:
            return false
        default:
            return state
    }
}

export const isSwappablesLoading = (state = initialState.isSwappablesLoading, action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_SWAPPABLES_SAGA:
            return true
        case types.RECEIVE_FURNITURE_SWAPPABLES:
        case types.FAILED_RECEIVE_FURNITURE_SWAPPABLES:
            return false
        default:
            return state
    }
}

export const isGoesWithLoading = (state = initialState.isGoesWithLoading, action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_GOES_WITH_SAGA:
            return true
        case types.RECEIVE_FURNITURE_GOES_WITH:
        case types.FAILED_RECEIVE_FURNITURE_GOES_WITH:
            return false
        default:
            return state
    }
}

const isCategoriesLoading = (state = initialState.isCategoriesLoading, action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_CATEGORIES_SAGA:
            return true
        case types.RECEIVE_FURNITURE_CATEGORIES:
        case types.FAILED_RECEIVE_FURNITURE_CATEGORIES:
            return false
        default:
            return state
    }
}

export const isLoadingByIds = (state = initialState.isLoadingByIds, action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_BY_COMPOSITION_SAGA:
        case types.REQUEST_FURNITURE_BY_IDS_SAGA:
            return true
        case types.RECEIVE_FURNITURE_BY_IDS:
        case types.FAILED_RECEIVE_FURNITURE_BY_IDS:
            return false
        default:
            return state
    }
}

export const isLoadingByLocalItemNos = (state = initialState.isLoadingByLocalItemNos, action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_BY_LOCALITEMNOS_SAGA:
            return true
        case types.FAILED_RECEIVE_FURNITURE_BY_LOCALITEMNOS:
        case types.RECEIVE_FURNITURE_BY_LOCALITEMNOS:
            return false
        default:
            return state
    }
}

export const isLoadingBySetId = (state = initialState.isLoadingBySetId, action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_BY_SET_ID_SAGA:
            return true
        case types.FAILED_RECEIVE_FURNITURE_BY_SET_ID:
        case types.RECEIVE_FURNITURE_BY_SET_ID:
            return false
        default:
            return state
    }
}

export const stackEnabled = (state = initialState.stackEnabled, action) => {
    switch (action.type) {
        case types.SET_MAGIC_WINDOW_LOADING:
            return true
        default:
            return state
    }
}

export const categories = (state = initialState.categories, action) => {
    switch (action.type) {
        case types.RECEIVE_FURNITURE_CATEGORIES:
            if (action?.categories?.length) {
                return sortByArray(
                    action.categories.map((cat) => ({
                        key: cat.categoryId,
                        label: cat.name,
                        subCategories: sortByArray(
                            cat.subCategories.map((subCat) => ({
                                key: subCat.categoryId,
                                label: subCat.name,
                            })),
                            [(a) => a.key, SUBCATORDER],
                        ),
                    })),
                    [(a) => a.key, CATORDER],
                )
            }
            return state
        default:
            return state
    }
}

export const rawFilters = (state = initialState.rawFilters, action) => {
    switch (action.type) {
        case types.RECEIVE_FURNITURE:
            // Only update rawFilters if explicitly provided in the action
            // This preserves filters during pagination when API doesn't return them
            return action.rawFilters !== undefined ? action.rawFilters : state
        case types.FURNITURE_FILTER_UPDATE:
            // Never clear rawFilters on filter updates, preserve until new data arrives
            return state
        case types.FURNITURE_FILTER_CLEAR:
            return []
        default:
            return state
    }
}

export const selectedFilterOptions = (state = initialState.selectedFilterOptions, action) => {
    switch (action.type) {
        case types.UPDATE_SELECTED_FILTER_OPTIONS:
            return action.selectedFilterOptions
        case types.FURNITURE_FILTER_CLEAR:
        case types.SELECT_ROOM_TYPE_IN_FILTER:
        case types.FILTER_BY_SUB_CATEGORY:
        case types.CLEAR_SUB_CATEGORY_FILTER:
            return {}
        default:
            return state
    }
}

export const sortOrders = (state = initialState.sortOrders, action) => {
    switch (action.type) {
        case types.RECEIVE_FURNITURE:
            // Only update sortOrders if explicitly provided in the action
            // This preserves sort orders during pagination when API doesn't return them
            return action.sortOrders !== undefined ? action.sortOrders : state
        case types.FURNITURE_FILTER_UPDATE:
            // Never clear sortOrders on filter updates, preserve until new data arrives
            return state
        case types.FURNITURE_FILTER_CLEAR:
            return null
        default:
            return state
    }
}

export const filterResult = (state = initialState.filterResult, action) => {
    switch (action.type) {
        case types.RECEIVE_FURNITURE:
            return {
                ids: [...state.ids, ...action.furniture.map((furni) => furni.id)],
                count: action.count || 0,
                maxCount: action.maxCount || 0,
                currentPage: state.currentPage + 1,
                hasNext: action.hasNext || false,
                moreToken: action.moreToken || null,
            }
        case types.FURNITURE_FILTER_CLEAR:
        case types.FURNITURE_FILTER_UPDATE:
        case types.SELECT_ROOM_TYPE_IN_FILTER:
        case types.FILTER_BY_SUB_CATEGORY:
        case types.CLEAR_SUB_CATEGORY_FILTER:
            return {
                ...initialState.filterResult,
                count: state.count, // Preserve count until new results arrive
                maxCount: state.maxCount, // Preserve maxCount until new results arrive
            }
        default:
            return state
    }
}

export const swappablesLoadHasNext = (state = initialState.swappablesLoadHasNext, action) => {
    switch (action.type) {
        case types.RECEIVE_FURNITURE_SWAPPABLES:
            return action.hasNext

        default:
            return state
    }
}

export const recommendations = (state = initialState.recommendations, action) => {
    switch (action.type) {
        case types.REQUEST_PERSONALIZED_PRODUCT_RECOMMENDATIONS:
            return {
                ...state,
                isFetching: true,
                isError: false,
            }
        case types.RECEIVE_PERSONALIZED_PRODUCT_RECOMMENDATIONS:
            return {
                ...state,
                isFetching: false,
                isError: false,
                data: action.payload.map((i) => i.id),
            }
        case types.FAILED_RECEIVE_PERSONALIZED_PRODUCT_RECOMMENDATIONS:
            return {
                ...state,
                isFetching: false,
                isError: true,
            }
        default:
            return state
    }
}

export const lastSelectedRoomTypeId = (state = initialState.lastSelectedRoomTypeId, action) => {
    switch (action.type) {
        case types.SELECT_ROOM_TYPE_IN_FILTER:
            return action.roomTypeId
        default:
            return state
    }
}

export const selectedRoomTypeId = (state = initialState.selectedRoomTypeId, action) => {
    switch (action.type) {
        case types.SELECT_ROOM_TYPE_IN_FILTER:
        case types.FILTER_BY_SUB_CATEGORY:
        case types.CLEAR_SEARCH_AND_RESTORE_ROOM_TYPE:
            return action.roomTypeId
        case types.FURNITURE_FILTER_UPDATE: {
            // Clear room type selection (including "Complete my room") when user searches
            if (action.filter.query && action.filter.query.trim().length > 0) {
                return null
            }
            // Restore from last selected if query is cleared
            if (action.filter.query === '' || action.filter.query === null) {
                // This will be handled by the saga, just keep current state
                return state
            }
            return state
        }
        case types.RESET_ROOM_TYPE_FILTERS_IN_FILTER:
            return null
        case types.FURNITURE_FILTER_CLEAR:
            // Restoration handled by saga
            return null
        default:
            return state
    }
}

export const selectedSubCategoryId = (state = initialState.selectedSubCategoryId, action) => {
    switch (action.type) {
        case types.FILTER_BY_SUB_CATEGORY:
            return action.subCategoryId
        case types.SELECT_ROOM_TYPE_IN_FILTER:
        case types.CLEAR_SUB_CATEGORY_FILTER:
        case types.CLEAR_SEARCH_AND_RESTORE_ROOM_TYPE:
        case types.FURNITURE_FILTER_CLEAR:
            return null
        default:
            return state
    }
}

export const subCategoryNames = (state = initialState.subCategoryNames, action) => {
    switch (action.type) {
        case types.SELECT_ROOM_TYPE_IN_FILTER:
        case types.FILTER_BY_SUB_CATEGORY:
        case types.CLEAR_SUB_CATEGORY_FILTER:
            return action.subCategoryNames ?? null
        case types.FURNITURE_FILTER_CLEAR:
        case types.CLEAR_SEARCH_AND_RESTORE_ROOM_TYPE:
            return null
        default:
            return state
    }
}

export const roomTypeTranslatedName = (state = initialState.roomTypeTranslatedName, action) => {
    switch (action.type) {
        case types.SELECT_ROOM_TYPE_IN_FILTER:
            return action.roomTypeSearchQuery ?? null
        case types.FURNITURE_FILTER_CLEAR:
            return null
        case types.FURNITURE_FILTER_UPDATE: {
            const hasNewQuery = !!action.filter?.query
            const queryDiffersFromRoomType = action.filter?.query !== state
            const isUserDrivenSearch = !action.filter?.isRoomTypeSearch

            if (hasNewQuery && queryDiffersFromRoomType && isUserDrivenSearch) {
                return null
            }
            return state
        }
        default:
            return state
    }
}

export default combineReducers({
    byId,
    selectedId,
    filter,
    location,
    isLoading,
    isSwappablesLoading,
    isCategoriesLoading,
    isLoadingByIds,
    stackEnabled,
    categories,
    filterResult,
    rawFilters,
    selectedFilterOptions,
    sortOrders,
    swapAnchorId,
    selectedSwapDetailsId,
    hasAdditionalFurniture,
    isLoadingByLocalItemNos,
    isLoadingBySetId,
    isGoesWithLoading,
    swappablesLoadHasNext,
    recommendations,
    lastSelectedRoomTypeId,
    selectedRoomTypeId,
    selectedSubCategoryId,
    subCategoryNames,
    roomTypeTranslatedName,
})
