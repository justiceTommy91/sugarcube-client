import { useCallback } from 'react'

import { setSearchContext } from 'models/tracking/actions'
import { formatSearchTerm, type SearchChangeType } from 'utils/searchTracking'
import { SEARCH_TYPES, type SearchType } from 'models/tracking/constants'

import { useAppDispatch } from './useAppDispatch'

export interface UseSearchTrackingResult {
    trackSearchResult: (
        searchType: SearchType,
        latestChange: { type: SearchChangeType; value: string; filterId?: string },
    ) => void
}

export const useSearchTracking = (): UseSearchTrackingResult => {
    const dispatch = useAppDispatch()

    const trackSearchResult = useCallback(
        (
            trackingSearchType: SearchType,
            latestChange: { type: SearchChangeType; value: string; filterId?: string },
        ) => {
            const searchTerm = formatSearchTerm(latestChange)

            // Store search context for when API response arrives
            dispatch(setSearchContext(searchTerm, trackingSearchType))
        },
        [dispatch],
    )

    return {
        trackSearchResult,
    }
}

export { SEARCH_TYPES }
