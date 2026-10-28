import * as types from 'models/actionTypes'

export const trackShowDetails = (trackingInfo) => ({
    type: types.TRACK_SHOW_DETAILS,
    trackingInfo,
})

export const trackGaEvent = (trackingInfo) => ({
    type: types.TRACK_GA_EVENT,
    trackingInfo,
})

export const trackSnapRotateClick = (trackingInfo) => ({
    type: types.TRACK_SNAP_ROTATE_CLICK,
    trackingInfo,
})

export const trackStackablePlacement = (stackablePlacedInfo) => ({
    type: types.TRACK_STACKABLE_PLACEMENT,
    stackablePlacedInfo,
})

export const trackDecorateRoomMove = (trackingInfo) => ({
    type: types.TRACK_DECORATE_ROOM_MOVE_PRODUCT,
    trackingInfo,
})

export const trackDecorateRoomRotate = (trackingInfo) => ({
    type: types.TRACK_DECORATE_ROOM_ROTATE_PRODUCT,
    trackingInfo,
})

export const setRoundTripTimeCatalogSearch = (roundTripTimeCatalogSearch) => ({
    type: types.SET_ROUND_TRIP_TIME_CATALOG_SEARCH,
    roundTripTimeCatalogSearch,
})

export const trackOrbitModeMoveStart = () => ({
    type: types.TRACK_ORBIT_MODE_MOVE_START,
})

export const trackOrbitModeMoveStop = () => ({
    type: types.TRACK_ORBIT_MODE_MOVE_STOP,
})

// Search tracking actions
export const trackSearchResult = (trackingInfo) => ({
    type: types.TRACK_SEARCH_RESULT,
    trackingInfo,
})

export const setSearchContext = (searchTerm, searchType) => ({
    type: types.SET_SEARCH_CONTEXT,
    payload: {
        searchTerm,
        searchType,
        timestamp: Date.now()
    }
})

export const clearSearchContext = () => ({
    type: types.CLEAR_SEARCH_CONTEXT
})

export default trackShowDetails
