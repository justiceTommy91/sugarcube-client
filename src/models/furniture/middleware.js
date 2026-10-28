/* eslint-disable consistent-return */
import * as types from 'models/actionTypes'
import {
    getDebugFurnitureId,
    getDebugFurnitureModelUrl,
    getDebugGeometryData,
    getRegion,
} from 'models/location/selectors'
import {
    requestFurniture,
    requestFurnitureByIds,
    requestFurnitureGoesWith,
    requestFurnitureSwappables,
} from 'models/furniture/actions'
import {
    getFilter,
    getFilterResult,
    getProductsMissingAvailabilityIds,
    getRealFurnitureIds,
    getSelectedFurnitureData,
    getStackEnabled,
} from 'models/furniture/selectors'
import { DEBUG_CATEGORY } from 'models/furniture/constants'
import { LOCALE_GEO } from 'models/location/constants'

const furnitureMiddleware = (store) => (next) => (action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_SAGA: {
            const state = store.getState()

            // Skip request until room type is initialized with subcategory IDs or a search query is active.
            // Exception: subCatalog deep links and the admin debug category bypass this guard.
            const rawFilter = getFilter(state)
            const hasSubCatalog = rawFilter.subCatalog && rawFilter.subCatalog !== '*'
            const hasDebugCategory = rawFilter.category === DEBUG_CATEGORY
            if (!rawFilter.subCategoryIds && !rawFilter.query && !hasSubCatalog && !hasDebugCategory) {
                return undefined
            }

            const { moreToken, currentPage } = getFilterResult(state)
            const requestedPage = currentPage + 1

            const stackEnabled = getStackEnabled(state)

            const filter = Object.fromEntries(
                Object.entries(getFilter(state)).filter(([key, val]) => {
                    // Skip room type UI state - these should not be sent to API
                    if (key === 'selectedRoomTypeId' || key === 'selectedSubCategoryId' || key === 'subCategoryNames') {
                        return false
                    }
                    // Special handling for subCategoryIds - preserve it only if it has actual content
                    if (key === 'subCategoryIds') {
                        return val !== null && val !== undefined && val !== ''
                    }
                    // Standard filtering for other fields
                    return !!val && val !== '*'
                }),
            )

            // Special case for debug furniture
            if (filter.category === DEBUG_CATEGORY) {
                delete filter.category
                filter.region = LOCALE_GEO
            } else {
                filter.region = getRegion(state)
            }

            filter.stackEnabled = stackEnabled

            const debugModelUrl = getDebugFurnitureModelUrl(state)
            const debugFurnitureId = getDebugFurnitureId(state)
            const debugGeometryData = getDebugGeometryData(state)

            return next({
                ...action,
                filter,
                moreToken,
                requestedPage,
                debugModelUrl,
                debugFurnitureId,
                debugGeometryData,
            })
        }
        case types.REQUEST_FURNITURE_CATEGORIES_SAGA: {
            const state = store.getState()
            return next({
                ...action,
                region: getRegion(state),
                stackEnabled: getStackEnabled(state),
            })
        }
        case types.FURNITURE_FILTER_UPDATE: {
            const result = next(action)
            store.dispatch(requestFurniture())
            return result
        }
        case types.SELECT_ROOM_TYPE_IN_FILTER:
        case types.FILTER_BY_SUB_CATEGORY:
        case types.CLEAR_SUB_CATEGORY_FILTER:
        case types.CLEAR_SEARCH_AND_RESTORE_ROOM_TYPE: {
            const result = next(action)
            store.dispatch(requestFurniture())
            return result
        }
        case types.UPDATE_LOCATION: {
            const result = next(action)

            const state = store.getState()
            const ids = getRealFurnitureIds(state)

            // Break up the actions/api calls so we don't do
            // all the ids at once
            let bin = []
            const BIN_SIZE = 30
            const lastIndex = ids.length - 1

            ids.forEach((id, index) => {
                bin.push(id)

                // If the bin is full or we're on the last id
                if (bin.length === BIN_SIZE || index === lastIndex) {
                    store.dispatch(requestFurnitureByIds(bin))
                    bin = []
                }
            })

            // Re-fetch swappables and goes-with for the selected furniture
            // This ensures the related products are updated with the new location
            const selectedFurniture = getSelectedFurnitureData(state)
            if (selectedFurniture && selectedFurniture.id) {
                store.dispatch(requestFurnitureSwappables(selectedFurniture.id))
                store.dispatch(requestFurnitureGoesWith(selectedFurniture.id))
            }

            return result
        }
        case types.RECEIVE_COMPILED_COMPOSITION: {
            // Get info on missing availability
            // For when we asked for furniture before having a location
            const result = next(action)
            const state = store.getState()
            const productsMissingAvailablityIds = getProductsMissingAvailabilityIds(state)

            if (productsMissingAvailablityIds.length) {
                store.dispatch(requestFurnitureByIds(productsMissingAvailablityIds))
            }

            return result
        }

        default:
            return next(action)
    }
}

export default furnitureMiddleware
