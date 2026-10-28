const INITIAL_ESTIMATE_STORAGE_KEY_PREFIX = 'scene_initial_estimate_'

export interface EstimateStorage {
    getInitialEstimate: () => number | null
    setInitialEstimate: (estimate: number) => void
    clearInitialEstimate: () => void
}

/**
 * Creates a storage interface for persisting the initial processing time estimate.
 *
 * The backend provides updated time estimates on each poll, but we preserve the
 * very first estimate to maintain a stable, predictable progress calculation in the UI.
 *
 * Uses:
 * 1. Progress bar calculation --> ensures smooth progress without jumps
 * 2. "Almost ready" threshold --> provides stable baseline if the pipeline estimates vary
 * 3. Extension detection --> identifies when processing exceeds initial estimate
 * 4. Persists across page refreshes --> maintains consistency on reload (stored in session storage)
 *
 * @param sceneId - The scene ID to store estimate for
 * @returns Storage interface for initial estimate with persistence
 */
export const createEstimateStorage = (sceneId: string): EstimateStorage => {
    const storageKey = `${INITIAL_ESTIMATE_STORAGE_KEY_PREFIX}${sceneId}`
    let cachedEstimate: number | null = null

    // Load from sessionStorage immediately
    const stored = sessionStorage.getItem(storageKey)
    if (stored) {
        cachedEstimate = parseInt(stored, 10)
    }

    return {
        getInitialEstimate: () => cachedEstimate,

        setInitialEstimate: (estimate: number) => {
            if (cachedEstimate === null) {
                cachedEstimate = estimate
                sessionStorage.setItem(storageKey, estimate.toString())
            }
        },

        clearInitialEstimate: () => {
            cachedEstimate = null
            sessionStorage.removeItem(storageKey)
        },
    }
}
