import { combineReducers } from 'redux'
import * as types from 'models/actionTypes'

export const initialState = {
    delayedScreenshot: {
        currentTimeoutId: null,
        firstScreenshotTime: 0,
        firstFurnitureScreenshotDone: false,
    },
    furnitureFilter: {
        filterSource: null,
        categoryLabel: null,
        subCategoryLabel: null,
    },
    saveTracking: null,
    roundTripTimeCatalogSearch: 0,
    searchContext: {
        searchTerm: null,
        searchType: null,
        timestamp: null
    }
}

export const furnitureFilter = (state = initialState.furnitureFilter, action) => {
    switch (action.type) {
        case types.FURNITURE_FILTER_UPDATE: {
            const { trackingInfo } = action

            return trackingInfo || state
        }

        default:
            return state
    }
}

const delayedScreenshot = (state = initialState.delayedScreenshot, action) => {
    switch (action.type) {
        case types.DELAYED_SCREENSHOT_SCHEDULED:
            return {
                ...state,
                currentTimeoutId: action.payload.timeoutId,
            }
        case types.DELAYED_SCREENSHOT_SENT:
            return {
                ...state,
                currentTimeoutId: null,
            }
        case types.SET_INITIAL_LOADING:
            if (action.payload.initialLoading) {
                return initialState.delayedScreenshot
            }
            return {
                ...state,
                firstScreenshotTime: window.performance.now(),
            }
        case types.FIRST_RENDER_ITEM_SCREENSHOT_DONE: {
            return {
                ...state,
                firstFurnitureScreenshotDone: true,
            }
        }
        default:
            return state
    }
}

const saveTracking = (state = initialState.saveTracking, action) => {
    switch (action.type) {
        case types.LOGIN_NEEDED: {
            return action.trackingInfo || null
        }
        case types.LOAD_COMPOSITION_FROM_LOCAL_STORAGE: {
            const { composition } = action.payload
            return composition?.trackingInfo || null
        }
        default:
            return state
    }
}

const roundTripTimeCatalogSearch = (state = initialState.roundTripTimeCatalogSearch, action) => {
    switch (action.type) {
        case types.SET_ROUND_TRIP_TIME_CATALOG_SEARCH: {
            return action.roundTripTimeCatalogSearch
        }
        default:
            return state
    }
}

export const searchContext = (state = initialState.searchContext, action) => {
    switch (action.type) {
        case types.SET_SEARCH_CONTEXT:
            return {
                searchTerm: action.payload.searchTerm,
                searchType: action.payload.searchType,
                timestamp: action.payload.timestamp
            }
        case types.CLEAR_SEARCH_CONTEXT:
            return initialState.searchContext
        default:
            return state
    }
}

export default combineReducers({
    delayedScreenshot,
    furnitureFilter,
    saveTracking,
    roundTripTimeCatalogSearch,
    searchContext,
})
