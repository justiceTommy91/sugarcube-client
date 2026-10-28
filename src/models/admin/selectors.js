import { createSelector } from 'reselect'
import { getMemoryTrackingEnv } from 'models/location/selectors'

export const getGTURLs = (state) => state.admin.gtURLs
export const getGTZipIsLoading = (state) => state.admin.gtZipIsLoading
export const getDebugConsoleMessages = (state) => state.admin.debugConsoleMessages

// Override the state debug settings by the provided URL parameters
const getBasicDebugSettings = (state) => state.admin.debugSettings

export const getDebugSettings = createSelector(
    [getBasicDebugSettings, getMemoryTrackingEnv],
    (debugSettings, memoryTrackingEnv) =>
        memoryTrackingEnv
            ? {
                  ...debugSettings,
                  showMemoryStats: !!memoryTrackingEnv,
                  trackedMemoryType: memoryTrackingEnv === 'webgl' ? 1 : 0,
              }
            : debugSettings,
)

export const getCanEditArtSize = (state) => getDebugSettings(state).canEditArtSize
