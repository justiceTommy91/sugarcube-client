export const getScheduledScreenshotTimeout = (state) => state.tracking.delayedScreenshot.currentTimeoutId
export const getFirstScheduledScreenshotTime = (state) => state.tracking.delayedScreenshot.firstScreenshotTime
export const getFirstFurnitureScreenshotDone = (state) => state.tracking.delayedScreenshot.firstFurnitureScreenshotDone
export const getSaveTracking = (state) => state.tracking.saveTracking

export const getFurnitureFilterTrackingInfo = (state) => state.tracking.furnitureFilter

export const getRoundTripTimeCatalogSearch = (state) => state.tracking.roundTripTimeCatalogSearch

// Search context selectors
export const getCurrentSearchContext = (state) => state.tracking.searchContext?.searchTerm || ''
export const getIsSearchActive = (state) => !!state.tracking.searchContext?.searchTerm
export const getSearchType = (state) => state.tracking.searchContext?.searchType || null
