import { takeEvery, takeLatest, call, put, select } from 'redux-saga/effects'
import * as Sentry from '@sentry/react'
import * as tracker from 'utils/tracker'
import {
    REQUEST_FURNITURE_SAGA,
    REQUEST_FURNITURE_BY_IDS_SAGA,
    REQUEST_FURNITURE_BY_LOCALITEMNOS_SAGA,
    REQUEST_FURNITURE_BY_SET_ID_SAGA,
    REQUEST_FURNITURE_CATEGORIES_SAGA,
    REQUEST_FURNITURE_SWAPPABLES_SAGA,
    REQUEST_FURNITURE_COMBINABLES_SAGA,
    REQUEST_FURNITURE_VARIANTS_SAGA,
    REQUEST_PLACE_PRODUCT_SAGA,
    REQUEST_FURNITURE_GOES_WITH_SAGA,
    FURNITURE_FILTER_CLEAR,
    FURNITURE_FILTER_UPDATE,
    CLEAR_SEARCH_KEEP_CONTEXT,
    FURNITURE_SEARCH_CLEAR,
    REQUEST_FURNITURE_BY_COMPOSITION_SAGA,
    REQUEST_PERSONALIZED_PRODUCT_RECOMMENDATIONS,
} from 'models/actionTypes'
import { COMPLETE_MY_ROOM_ID } from 'models/roomTypes/constants'
import {
    getFurniture,
    getTempFurnitureCompinables,
    getFurnitureBySearch,
    getFurnitureBySearchCategory,
    getFurnitureByIds,
    getFurnitureByLocalItemNos,
    getFurnitureBySetId,
    getFurnitureCategories,
    getFurnitureSwappables,
    getCombinableFurnitureSwappables,
    getFurnitureCombinables,
    getFurnitureVariants,
    getFurnitureGoesWith,
    getCombinablesVariants,
    getSmartRecommendations,
} from 'services/furniture'
import sortByArray from 'utils/sortByArray'
import {
    DORM_ESSENTIALS_ORDER as DORMORDER,
    WINTER_HOLIDAY_PRODUCTS as WINTER_PRODUCTS_ORDER,
} from 'constants/categories'
import {
    getLocation,
    getHasAdditionalFurniture,
    getFurnitureById,
    getRawFilters,
    getSwappableProducts,
    getFilter,
    getFilterResult,
    getLastSelectedRoomTypeId,
    getSelectedRoomTypeId,
} from 'models/furniture/selectors'
import { LOCALE_US_EN } from 'models/location/constants'
import { getIsLivingRoomContext, getSubCatalog } from 'models/location/selectors'
import { setVariants } from 'models/variants/actions'
import { processFurnitureVariants } from 'models/variants/helpers'
import { withPrefix } from 'gatsby'
import {
    getSelectedSceneRoomType,
    getSelectedRenderItem,
    getSelectedComposition,
    getSelectedCompositionShoppableLocalIds,
} from 'models/compositions/selectors'
import { getRoomTypes, getRoomTypeForDesign } from 'models/roomTypes/selectors'
import { findRoomTypeByCategoryId, getCategoryNameById, findDefaultRoomType } from 'models/roomTypes/utils'
import {
    getCategoryForContextual,
    getIsProductContext,
    getIsCategoryContext,
    getContextualRoomType,
    getIsQueryContext,
    getContextualQuery,
} from 'models/referrer/selector'
import { getDecidedFlags } from 'models/experiments/selectors'
import { debugConsoleLog } from 'models/admin/actions'
import { getCompiledComposition } from 'services/compositions'
import { SWAPPABLE_PAGE_SIZE, SEARCH_CATEGORY_PAGE_SIZE } from 'models/furniture/constants'
import { BEDROOM, MAP_ROOM_TYPE_TO_SMART_REC_ROOM_TYPE } from 'models/scenes/constants'
import { setRoundTripTimeCatalogSearch, clearSearchContext, setSearchContext } from 'models/tracking/actions'
import { SEARCH_TYPES, ACTION_COMPLETE_MY_ROOM_ERROR } from 'models/tracking/constants'
import {
    receiveFurniture,
    receiveAdditionalFurniture,
    failedReceiveFurniture,
    receiveFurnitureByIds,
    failedReceiveFurnitureByIds,
    receiveFurnitureByLocalItemNos,
    failedReceiveFurnitureByLocalItemNos,
    receiveFurnitureBySetId,
    failedReceiveFurnitureBySetId,
    receiveFurnitureCategories,
    failedReceiveFurnitureCategories,
    receiveFurnitureSwappables,
    failedReceiveFurnitureSwappables,
    selectFurniture,
    receiveFurnitureCombinables,
    failedReceiveFurnitureCombinables,
    receiveFurnitureVariants,
    failedReceiveFurnitureVariants,
    receivePlaceProduct,
    failedReceivePlaceProduct,
    receiveFurnitureGoesWith,
    failedReceiveFurnitureGoesWith,
    updateFurnitureFilter,
    receiveSocketFurniture,
    requestFurnitureSwappables,
    requestFurnitureGoesWith,
    requestFurnitureVariants,
    failedReceivePersonalizedProductRecommendations,
    receivePersonalizedProductRecommendations,
    selectRoomTypeInFilter,
    filterBySubCategory,
} from './actions'
import { initialState } from './reducers'

/**
 * Morpheus API adds an aggregate combinablesDefaultProducts
 * array to list style furniture APIs.
 * This generator function when used as a wrapper is meant to
 * add those products to catalog and return the original response.
 */
function* processCombinables(effect) {
    const result = yield effect
    const { data } = result

    // Check if top level combinablesDefaultProducts exists
    // and add them to catalog.
    if (data?.combinablesDefaultProducts?.length > 0) {
        yield put(receiveSocketFurniture(data.combinablesDefaultProducts))
    }

    // Return the original response
    return result
}

export function* requestFurnitureSaga({
    filter,
    requestedPage,
    moreToken,
    debugModelUrl,
    debugFurnitureId,
    debugGeometryData,
}) {
    try {
        let furniture
        let count
        let hasNext
        let nextMoreToken
        let filters
        let maxCount
        let sortOrders
        const beforeCatalogSearchTimestamp = performance.now()

        const isDormEssentialSubCatalog = filter.subCatalog === 'dorm-essentials'
        const isWinterHolidaySubCatalog = filter.subCatalog === 'winter-holiday'

        const location = yield select(getLocation)

        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2

        if (filter.subCatalog) {
            // SubCatalog campaign pages (dorm-essentials, winter-holiday): always use getFurniture
            // path with special product ordering. Must take priority over subCategoryIds.
            let params = { ...filter }
            if (isDormEssentialSubCatalog) {
                params = { ...filter, limit: DORMORDER.length }
            }
            if (isWinterHolidaySubCatalog) {
                params = { ...filter, limit: WINTER_PRODUCTS_ORDER.length }
            }
            const { data } = yield* processCombinables(
                call(getFurniture, params, location, requestedPage, isDuvetV2Enabled),
            )
            furniture = data.results
            count = data.count
            hasNext = !!data.next
            filters = data.filters ?? undefined
            maxCount = data.max || 0
            sortOrders = data.sortOrders ?? undefined
        } else if (filter.query || filter.subCategoryIds) {
            const searchParams = { ...filter }

            const rawFilters = yield select(getRawFilters)

            // Convert filter parameters using rawFilters data
            if (Array.isArray(rawFilters)) {
                const filterParamMap = {}
                rawFilters.forEach((rawFilter) => {
                    if (rawFilter.id === 'PRICE') {
                        filterParamMap.price = rawFilter.parameter
                    } else if (rawFilter.id === 'COLOR') {
                        filterParamMap.color = rawFilter.parameter
                    } else if (rawFilter.id === 'REFERENCE_MEASUREMENTS') {
                        filterParamMap.size = rawFilter.parameter
                    }
                })

                Object.entries(filterParamMap).forEach(([appParamName, apiParamName]) => {
                    if (searchParams[appParamName] != null) {
                        searchParams[apiParamName] = searchParams[appParamName]
                        delete searchParams[appParamName]
                    }
                })
            }

            // Check if we're using the new search-category endpoint
            const useSearchCategoryEndpoint = filter.subCategoryIds && (filter.isRoomTypeSearch || !filter.query)

            if (useSearchCategoryEndpoint) {
                // Separate search-category endpoint with start/end pagination (instead of moreToken)
                searchParams.categoryIds = searchParams.subCategoryIds
                delete searchParams.subCategoryIds
                delete searchParams.roomType
                delete searchParams.query
                delete searchParams.isRoomTypeSearch

                let paginationParams
                if (requestedPage === 1) {
                    // Initial request: use size parameter only
                    paginationParams = { size: SEARCH_CATEGORY_PAGE_SIZE }
                } else {
                    // Subsequent requests: use start/end parameters
                    const start = (requestedPage - 1) * SEARCH_CATEGORY_PAGE_SIZE
                    const end = requestedPage * SEARCH_CATEGORY_PAGE_SIZE
                    paginationParams = { start, end }
                }

                const { data } = yield* processCombinables(
                    call(
                        getFurnitureBySearchCategory,
                        { ...searchParams, ...paginationParams },
                        location,
                        isDuvetV2Enabled,
                    ),
                )

                // Get existing maxCount from state for pagination requests
                const currentFilterResult = yield select(getFilterResult)

                furniture = data.results
                count = data.results.length
                // Only update maxCount if API provides it (initial request), otherwise preserve existing value
                maxCount = data.max !== undefined && data.max !== null ? data.max : currentFilterResult.maxCount
                hasNext = requestedPage * SEARCH_CATEGORY_PAGE_SIZE < maxCount
                nextMoreToken = null
                // Only update filters when explicitly provided by API (not during pagination)
                // Passing undefined preserves existing filters in the reducer
                filters = data.filters ?? undefined
                sortOrders = data.sortOrders ?? undefined
            } else {
                // Old search endpoint with moreToken pagination
                if (searchParams.subCategoryIds) {
                    // Only send f-subcategories if NOT in room type search mode
                    // Room type search uses ?q parameter for semantic search across categories
                    if (!searchParams.isRoomTypeSearch) {
                        searchParams['f-subcategories'] = searchParams.subCategoryIds
                    }
                    delete searchParams.subCategoryIds
                    delete searchParams.roomType
                    delete searchParams.isRoomTypeSearch
                }

                const { data } = yield* processCombinables(
                    call(getFurnitureBySearch, searchParams, location, moreToken, isDuvetV2Enabled),
                )
                furniture = data.results
                count = data.results.length
                hasNext = !!data.moreToken
                nextMoreToken = data.moreToken
                // Only update filters when explicitly provided by API (not during pagination)
                // Passing undefined preserves existing filters in the reducer
                filters = data.filters ?? undefined
                maxCount = data.max || 0
                sortOrders = data.sortOrders ?? undefined
            }
        } else {
            const { data } = yield* processCombinables(
                call(getFurniture, { ...filter }, location, requestedPage, isDuvetV2Enabled),
            )
            furniture = data.results
            count = data.count
            hasNext = !!data.next
            filters = data.filters ?? undefined
            maxCount = data.max || 0
            sortOrders = data.sortOrders ?? undefined
        }
        const afterCatalogSearchTimestamp = performance.now()
        const roundTripSearchTime = afterCatalogSearchTimestamp - beforeCatalogSearchTimestamp
        yield put(setRoundTripTimeCatalogSearch(roundTripSearchTime))

        if (filter.subCatalog === 'dorm-essentials') {
            // For Campaign pages, when we show the dorm-essentials subcatalog products in the side panel,
            // it should appear in the order listed in the spreadsheet describe in GROW-343
            furniture = sortByArray(furniture, [(p) => p.globalProductId, DORMORDER])
        }

        if (filter.subCatalog === 'winter-holiday') {
            // For Campaign pages, when we show the winter-holiday subcatalog products in the side panel,
            // it should appear in the order listed in the spreadsheet describe in GROW-383
            furniture = sortByArray(furniture, [(p) => p.globalProductId, WINTER_PRODUCTS_ORDER])
        }

        if (debugModelUrl || debugGeometryData) {
            const filteredGeometryData = Object.fromEntries(
                Object.entries(debugGeometryData).filter(([, value]) => value !== null),
            )
            const urlModel = {
                id: 1,
                localItemNumber: '1',
                name: 'Debug URL Model',
                region: LOCALE_US_EN,
                thumbUrl: withPrefix('/images/logo_sugarcube_bug_ikea.svg'),
                modelUrl: debugModelUrl,
                rotX: 1.5707963267949,
                scale: 1,
                maxX: 0.361636996269226,
                maxY: 0.8396155834198,
                maxZ: 0.353101998567581,
                minX: -0.361636996269226,
                minY: 0,
                minZ: -0.353101998567581,
                stacks: false,
                isDebug: true,
                collections: ['Debug'],
                rootCategories: ['Debug'],
                categories: ['Debug'],
                subCategories: [],
                description: 'This model is loaded from a URL param',
                imageUrls: [withPrefix('/images/logo_sugarcube_bug_ikea.svg')],
                availableInRegion: true,
                geometryType: '3d',
                price: '$4.19',
                ...filteredGeometryData,
            }
            furniture.push(urlModel)
        }
        yield put(receiveFurniture(furniture, filter, count, hasNext, nextMoreToken, filters, maxCount, sortOrders))

        const selectDebugFurnitureId = debugGeometryData?.id ?? (debugModelUrl ? 1 : debugFurnitureId)
        if (selectDebugFurnitureId) {
            yield call(selectFurniture(parseInt(selectDebugFurnitureId, 10)))
        }
    } catch (error) {
        yield put(failedReceiveFurniture())
    }
}

export function* requestFurnitureByIdsSaga({ ids }) {
    try {
        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2

        const location = yield select(getLocation)
        const {
            data: { results: furniture },
        } = yield* processCombinables(call(getFurnitureByIds, ids, location, isDuvetV2Enabled))

        yield put(receiveFurnitureByIds(furniture))
    } catch (error) {
        yield put(failedReceiveFurnitureByIds())
    }
}

export function* requestFurnitureByLocalItemNosSaga({ localItemNos }) {
    try {
        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2
        const { data: furniture } = yield* processCombinables(
            call(getFurnitureByLocalItemNos, localItemNos, isDuvetV2Enabled),
        )
        yield put(receiveFurnitureByLocalItemNos(furniture))
    } catch (error) {
        yield put(failedReceiveFurnitureByLocalItemNos())
    }
}

export function* requestFurnitureBySetIdSaga({ setId }) {
    try {
        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2
        const response = yield* processCombinables(call(getFurnitureBySetId, setId, isDuvetV2Enabled))
        const setItems = response.data.items || []
        const fetchedFurniture = setItems.map((item) => item.product)
        const localItemNumbers = fetchedFurniture.map((f) => f.localItemNumber).filter(Boolean)
        yield put(receiveFurnitureBySetId(fetchedFurniture, localItemNumbers, setItems))
    } catch (error) {
        yield put(failedReceiveFurnitureBySetId())
    }
}

export function* requestFurnitureCategoriesSaga({ region, stackEnabled }) {
    try {
        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2
        // enable debug geometries if feature flag enabled
        const { data: categories } = yield* processCombinables(
            call(getFurnitureCategories, region, stackEnabled, isDuvetV2Enabled),
        )
        yield put(receiveFurnitureCategories(categories))
    } catch (error) {
        yield put(failedReceiveFurnitureCategories())
    }
}

export function* requestFurnitureSwappablesSaga({ id }) {
    try {
        const location = yield select(getLocation)
        const renderItem = yield select(getSelectedRenderItem)

        const composition = yield select(getSelectedComposition)
        const parentItem = composition.renderItems.find((item) => item.uniqueId === renderItem?.parentId) || null

        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2

        let data

        if (parentItem && renderItem?.isCombinableChild) {
            const { type } =
                parentItem?.combinablesSocketSet?.sockets?.find(
                    (socket) => socket.name === renderItem.combinablePlacement.socketName,
                ) || null
            data = yield call(
                getCombinableFurnitureSwappables,
                type.size,
                type.category,
                location,
                SWAPPABLE_PAGE_SIZE,
                isDuvetV2Enabled,
            )
            yield put(
                debugConsoleLog(
                    'morpheus',
                    `Get combinables swappables params: ${JSON.stringify({
                        size: type.size,
                        category: type.category,
                    })}`,
                ),
            )
        } else {
            const swappableProductIds = yield* processCombinables(select(getSwappableProducts, id))
            const offset = swappableProductIds.length
            data = yield call(getFurnitureSwappables, id, location, SWAPPABLE_PAGE_SIZE, offset, isDuvetV2Enabled)
        }

        if (renderItem.isCombinableChild) {
            // This filters out any variants of the product by checking for the same item name
            const filteredSwappables = data.data.results.filter((item) => item.name !== renderItem.name)

            // This returns a list of the ids of the filtered swappables
            const itemIds = filteredSwappables.map((item) => item.id)
            yield put(
                debugConsoleLog('morpheus', `Receive combinables swappables data: ${JSON.stringify({ itemIds })}`),
            )
            yield put(receiveFurnitureSwappables(filteredSwappables, id, !!data.data.next))
        } else {
            yield put(receiveFurnitureSwappables(data.data.results, id, !!data.data.next))
        }
    } catch (error) {
        yield put(failedReceiveFurnitureSwappables())
    }
}

export function* requestFurnitureGoesWithSaga({ id }) {
    try {
        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2

        const location = yield select(getLocation)
        const { data } = yield* processCombinables(call(getFurnitureGoesWith, id, location, isDuvetV2Enabled))
        yield put(receiveFurnitureGoesWith(data.results, id))
    } catch (error) {
        yield put(failedReceiveFurnitureGoesWith())
    }
}

export function* requestFurnitureCombinablesSaga({ id, uniqueId, slotCategory, size, variant, nodeIndex }) {
    try {
        let allFurniture = yield select(getFurnitureById)
        const parent = allFurniture[id]
        const flags = yield select(getDecidedFlags)
        const isMorpheusEnabled = flags.Morpheus

        if (parent.combinablesDefaultProducts?.length > 0) {
            yield put(receiveSocketFurniture(parent.combinablesDefaultProducts))
            allFurniture = yield select(getFurnitureById)
        }

        const sockets = parent.combinablesSocketSet?.sockets
        if (isMorpheusEnabled && sockets?.length > 0) {
            for (let i = 0; i < sockets.length; i += 1) {
                const defaultProductId = sockets[i].defaultProductId
                if (defaultProductId && allFurniture[defaultProductId]) {
                    yield put(receiveFurnitureCombinables([allFurniture[defaultProductId]], id, uniqueId, nodeIndex))
                }
            }
        } else {
            // in the future, combinables should be included in the response on getFurniture request
            // and this temporary separate request should be removed.
            const hasAdditionalFurniture = yield select(getHasAdditionalFurniture)
            let combinables
            if (!hasAdditionalFurniture) {
                combinables = yield call(getTempFurnitureCompinables)
                yield put(receiveAdditionalFurniture(combinables))
            }

            if (hasAdditionalFurniture) {
                combinables = Object.keys(allFurniture)
                    .map((val) => allFurniture[val])
                    .filter((furnitureData) => {
                        const category = furnitureData?.metadata?.combinables?.selfMeta?.category
                        return !!category && category !== 'bed_frame'
                    })
            }
            const { data: furniture } = yield call(getFurnitureCombinables, slotCategory, size, variant, combinables)
            yield put(receiveFurnitureCombinables(furniture, id, uniqueId, nodeIndex))
        }
    } catch (error) {
        yield put(failedReceiveFurnitureCombinables())
    }
}

export function* requestFurnitureVariantsSaga({ id }) {
    try {
        const location = yield select(getLocation)
        let data

        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2

        const renderItem = yield select(getSelectedRenderItem)
        const composition = yield select(getSelectedComposition)
        const parentItem = composition.renderItems?.find((item) => item.uniqueId === renderItem?.parentId) || null

        const socket = parentItem?.combinablesSocketSet?.sockets?.find(
            (sock) => sock.name === renderItem.combinablePlacement.socketName,
        )
        if (socket != null) {
            data = yield call(getCombinablesVariants, id, socket.type.size, socket.type.category, isDuvetV2Enabled)
            yield put(
                debugConsoleLog(
                    'morpheus',
                    `Get combinables variants params: ${JSON.stringify({
                        id,
                        size: socket.type.size,
                        category: socket.type.category,
                    })}`,
                ),
            )
        } else {
            data = yield* processCombinables(call(getFurnitureVariants, id, location, isDuvetV2Enabled))
        }
        const { furnitures, variants } = data.data

        if (furnitures && furnitures.length && variants) {
            const { selectedIndices, ...variantsData } = processFurnitureVariants(variants)

            yield put(setVariants(variantsData, id))
            yield put(receiveFurnitureVariants(furnitures, selectedIndices, id))
        } else {
            yield put(receiveFurnitureVariants([], [], id))
        }
    } catch (error) {
        yield put(failedReceiveFurnitureVariants())
    }
}

export function* requestPlaceProductSaga({ localItemNo }) {
    try {
        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2
        const { data: furniture } = yield* processCombinables(
            call(getFurnitureByLocalItemNos, [localItemNo], isDuvetV2Enabled),
        )
        yield put(receiveFurnitureByLocalItemNos(furniture))
        if (furniture?.length) {
            yield put(receivePlaceProduct(furniture[0]))
            const isLivingRoomIntegration = yield select(getIsLivingRoomContext)
            if (isLivingRoomIntegration) {
                const productId = furniture[0].id
                yield call(selectFurniture, productId)
                yield call(requestFurnitureSwappables, productId)
                yield call(requestFurnitureGoesWith, productId)
                yield call(requestFurnitureVariants, productId)
            }
        } else {
            yield put(failedReceivePlaceProduct())
        }
    } catch (error) {
        yield put(failedReceiveFurnitureByLocalItemNos())
    }
}

export function* requestFurnitureFilterClearSaga() {
    yield put(clearSearchContext())

    const isCategoryContext = yield select(getIsCategoryContext)
    const isProductContext = yield select(getIsProductContext)
    const isQueryContext = yield select(getIsQueryContext)

    const contextualRomType = yield select(getContextualRoomType)
    const categoryByContext = yield select(getCategoryForContextual)
    const inputQueryTerm = yield select(getContextualQuery)

    if (isCategoryContext) {
        const roomTypes = yield select(getRoomTypes)

        const contextCategory = categoryByContext?.category || categoryByContext?.subCategory
        if (contextCategory && roomTypes.length > 0) {
            // Find matching room type for this category using utility function
            const matchingRoomType = findRoomTypeByCategoryId(roomTypes, contextCategory)

            if (matchingRoomType) {
                // Apply filter using room type structure with single subcategory
                const categoryName = getCategoryNameById(matchingRoomType, contextCategory)

                yield put(filterBySubCategory(contextCategory, categoryName, matchingRoomType.humanId))
                return
            }
        }

        // Fallback: select bedroom (or first room type) if category not found
        const defaultRoomType = findDefaultRoomType(roomTypes)
        if (defaultRoomType) {
            yield put(
                selectRoomTypeInFilter(defaultRoomType.humanId, defaultRoomType.categoryIds, defaultRoomType.categoryNames),
            )
            return
        }
    }

    if (isProductContext) {
        yield put(
            updateFurnitureFilter({
                roomType: contextualRomType,
            }),
        )
        return
    }

    if (isQueryContext) {
        // If there is a query term, set the query term and clear the room type to avoid api failure
        if (inputQueryTerm) {
            yield put(updateFurnitureFilter({ query: inputQueryTerm, roomType: undefined }))
            return
        }
        // If there is no query term, set the room type to the contextual room type previously saved in the store
        if (!inputQueryTerm && contextualRomType) {
            yield put(updateFurnitureFilter({ roomType: contextualRomType }))
        }

        return
    }

    // TODO: It would be nice to have 'SubCatalog' coming from API compiled data.
    const paramSubcatalog = yield select(getSubCatalog)
    if (paramSubcatalog) {
        yield put(updateFurnitureFilter({ subCatalog: paramSubcatalog }))
        return
    }

    // Preserve subcategory IDs for room type filtering when clearing filters
    const currentFilter = yield select(getFilter)
    const clearedFilter = {
        ...initialState.filter,
        subCategoryIds: currentFilter.subCategoryIds,
    }
    yield put(updateFurnitureFilter(clearedFilter))
}

export function* clearSearchKeepContextSaga() {
    yield put(clearSearchContext())

    // Restore subCatalog filter for campaign deep links (dorm-essentials, winter-holiday)
    const paramSubcatalog = yield select(getSubCatalog)
    if (paramSubcatalog) {
        yield put(updateFurnitureFilter({ subCatalog: paramSubcatalog }))
        return
    }

    const roomType = yield select(getSelectedSceneRoomType)
    const roomTypes = yield select(getRoomTypes)
    const lastSelectedRoomTypeId = yield select(getLastSelectedRoomTypeId)

    // First, try to restore the last user-selected room type
    let roomTypeToRestore = null
    if (lastSelectedRoomTypeId) {
        roomTypeToRestore = roomTypes.find((rt) => rt.humanId === lastSelectedRoomTypeId)
    }

    const currentSelectedRoomTypeId = yield select(getSelectedRoomTypeId)

    // If "Complete my room" is currently selected OR was last selected, preserve it
    if (currentSelectedRoomTypeId === COMPLETE_MY_ROOM_ID || lastSelectedRoomTypeId === COMPLETE_MY_ROOM_ID) {
        if (currentSelectedRoomTypeId !== COMPLETE_MY_ROOM_ID) {
            yield put(selectRoomTypeInFilter(COMPLETE_MY_ROOM_ID, '', '', null))
        }
        return
    }

    // Fall back to scene's default room type if no last selection
    if (!roomTypeToRestore) {
        roomTypeToRestore = getRoomTypeForDesign(roomTypes, roomType)
    }

    if (roomTypeToRestore) {
        const roomTypeId = roomTypeToRestore.humanId.replace(/^rooms--/, '')
        yield put(setSearchContext(`roomType:${roomTypeId}`, SEARCH_TYPES.CLEAR_SEARCH))

        // Dispatch action to update UI state and restore room type search mode
        // This will set: query = translatedName, isRoomTypeSearch = true, roomTypeTranslatedName = translatedName
        yield put(
            selectRoomTypeInFilter(
                roomTypeToRestore.humanId,
                roomTypeToRestore.categoryIds,
                roomTypeToRestore.categoryNames,
                roomTypeToRestore.name,
            ),
        )
    } else {
        yield put(updateFurnitureFilter(initialState.filter))
    }
}

export function* requestFurnitureSearchClearSaga() {
    const lastSelectedRoomTypeId = yield select(getLastSelectedRoomTypeId)
    yield put(clearSearchContext())

    // Restore "Complete my room" selection if it was previously selected
    if (lastSelectedRoomTypeId === COMPLETE_MY_ROOM_ID) {
        yield put(selectRoomTypeInFilter(COMPLETE_MY_ROOM_ID, '', '', null))
    }
}

export function* handleFurnitureFilterUpdate(action) {
    // Only check when the action has a query property (to avoid processing unrelated filter updates)
    if (!action.filter) {
        return
    }

    const lastSelectedRoomTypeId = yield select(getLastSelectedRoomTypeId)
    const currentSelectedRoomTypeId = yield select(getSelectedRoomTypeId)

    // Check if query property exists and is empty/null/undefined
    const hasQuery = 'query' in action.filter
    const queryValue = action.filter.query
    const queryIsEmpty = !queryValue || (typeof queryValue === 'string' && queryValue.trim().length === 0)

    // If query is being cleared and last selection was "Complete my room", restore it
    // Only restore if current selection is null (meaning it was cleared by a previous search)
    if (hasQuery && queryIsEmpty && lastSelectedRoomTypeId === COMPLETE_MY_ROOM_ID && !currentSelectedRoomTypeId) {
        yield put(selectRoomTypeInFilter(COMPLETE_MY_ROOM_ID, '', '', null))
    }
}

export function* requestFurnitureByCompositionSaga({ id, forceLegacyManifest }) {
    try {
        const flags = yield select(getDecidedFlags)
        const isDuvetV2Enabled = flags.DuvetV2
        // We only want to use furnitures from the payload, ignore the rest.
        const {
            data: { furnitures: furniture },
        } = yield call(getCompiledComposition, id, forceLegacyManifest, isDuvetV2Enabled)
        yield put(receiveFurnitureByIds(furniture))
    } catch (e) {
        yield put(failedReceiveFurnitureByIds())
    }
}

export function* requestPersonalizedProductRecommendations() {
    const selectedRoomType = (yield select(getSelectedSceneRoomType)) ?? BEDROOM
    const items = yield select(getSelectedCompositionShoppableLocalIds)
    const roomType = MAP_ROOM_TYPE_TO_SMART_REC_ROOM_TYPE[selectedRoomType] ?? 'bedroom'

    try {
        const { data } = yield call(getSmartRecommendations, { roomType, items })
        // TODO: Also include data.combinablesDefaultProducts
        yield put(receivePersonalizedProductRecommendations(data.results))
    } catch (e) {
        const errorPayload = {
            RoomType: roomType,
            ItemCount: items.length,
            Items: items,
            ErrorMessage: e.message || `Unknown error`,
            ErrorStatus: e.response?.status,
        }

        yield call(Sentry.captureException, e, {
            tags: {
                feature: `completeMyRoom`,
                roomType,
            },
            extra: errorPayload,
        })

        yield call(tracker.error, ACTION_COMPLETE_MY_ROOM_ERROR, errorPayload)

        yield put(failedReceivePersonalizedProductRecommendations())
    }
}

function* watchRequestPlaceProductSaga() {
    yield takeEvery(REQUEST_PLACE_PRODUCT_SAGA, requestPlaceProductSaga)
}

function* watchRequestFurnitureSaga() {
    yield takeLatest(REQUEST_FURNITURE_SAGA, requestFurnitureSaga)
}

function* watchRequestFurnitureByIdsSaga() {
    yield takeEvery(REQUEST_FURNITURE_BY_IDS_SAGA, requestFurnitureByIdsSaga)
}

function* watchRequestFurnitureByLocalItemNosSaga() {
    yield takeEvery(REQUEST_FURNITURE_BY_LOCALITEMNOS_SAGA, requestFurnitureByLocalItemNosSaga)
}

function* watchRequestFurnitureBySetIdSaga() {
    yield takeEvery(REQUEST_FURNITURE_BY_SET_ID_SAGA, requestFurnitureBySetIdSaga)
}

function* watchRequestFurnitureCategoriesSaga() {
    yield takeEvery(REQUEST_FURNITURE_CATEGORIES_SAGA, requestFurnitureCategoriesSaga)
}

function* watchRequestFurnitureSwappablesSaga() {
    yield takeEvery(REQUEST_FURNITURE_SWAPPABLES_SAGA, requestFurnitureSwappablesSaga)
}

function* watchRequestFurnitureCombinablesSaga() {
    yield takeEvery(REQUEST_FURNITURE_COMBINABLES_SAGA, requestFurnitureCombinablesSaga)
}

function* watchRequestFurnitureVariantsSaga() {
    yield takeEvery(REQUEST_FURNITURE_VARIANTS_SAGA, requestFurnitureVariantsSaga)
}
function* watchRequestFurnitureGoesWithSaga() {
    yield takeEvery(REQUEST_FURNITURE_GOES_WITH_SAGA, requestFurnitureGoesWithSaga)
}

function* watchRequestFurnitureFilterClearSaga() {
    yield takeEvery(FURNITURE_FILTER_CLEAR, requestFurnitureFilterClearSaga)
}

function* watchClearSearchKeepContextSaga() {
    yield takeEvery(CLEAR_SEARCH_KEEP_CONTEXT, clearSearchKeepContextSaga)
}

function* watchRequestFurnitureSearchClearSaga() {
    yield takeEvery(FURNITURE_SEARCH_CLEAR, requestFurnitureSearchClearSaga)
}

function* watchFurnitureFilterUpdate() {
    yield takeEvery(FURNITURE_FILTER_UPDATE, handleFurnitureFilterUpdate)
}

function* watchRequestFurnitureByCompositionSaga() {
    yield takeEvery(REQUEST_FURNITURE_BY_COMPOSITION_SAGA, requestFurnitureByCompositionSaga)
}

function* watchRequestPersonalizedProductRecommendations() {
    yield takeLatest(REQUEST_PERSONALIZED_PRODUCT_RECOMMENDATIONS, requestPersonalizedProductRecommendations)
}

export const furnitureSagas = [
    watchRequestFurnitureSaga(),
    watchRequestFurnitureByIdsSaga(),
    watchRequestFurnitureByLocalItemNosSaga(),
    watchRequestFurnitureBySetIdSaga(),
    watchRequestFurnitureCategoriesSaga(),
    watchRequestFurnitureSwappablesSaga(),
    watchRequestFurnitureCombinablesSaga(),
    watchRequestFurnitureVariantsSaga(),
    watchRequestPlaceProductSaga(),
    watchRequestFurnitureGoesWithSaga(),
    watchRequestFurnitureFilterClearSaga(),
    watchClearSearchKeepContextSaga(),
    watchRequestFurnitureSearchClearSaga(),
    watchFurnitureFilterUpdate(),
    watchRequestFurnitureByCompositionSaga(),
    watchRequestPersonalizedProductRecommendations(),
]
