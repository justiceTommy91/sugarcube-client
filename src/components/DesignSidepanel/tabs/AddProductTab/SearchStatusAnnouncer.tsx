import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import AriaLiveAnnouncer from 'components/accessibility/AriaLiveAnnouncer'
import { AsyncStatus } from '../../search-filters/types/hooks'

export interface SearchStatusAnnouncerProps {
    status: AsyncStatus
    query: string
    resultCount: number
    isLoadingMore?: boolean
    clearAfter?: number
}

/**
 * SearchStatusAnnouncer provides comprehensive screen reader announcements for search operations.
 *
 * Announcement Flow:
 * 1. Initial search: "Searching for \"[query]\"..." (when status='pending' first time)
 * 2. Initial results: "[count] results found for \"[query]\"" (when status='success' first time)
 * 3. Loading more: "Loading more results..." (when infinite scroll triggers loading)
 * 4. More results loaded: "[total] results now available for \"[query]\"" (after infinite scroll completes)
 *
 * Key Features:
 * - Debounces rapid query changes (300ms) to prevent announcement spam
 * - Distinguishes between initial search loading and infinite scroll loading
 * - Tracks state to prevent duplicate announcements
 * - Uses ARIA live regions with 'polite' politeness for non-intrusive announcements
 *
 * State Management:
 * - hasAnnouncedResults: Tracks if initial results have been announced
 * - wasLoadingMore: Tracks if we're in an infinite scroll loading sequence
 * - previousResultCount: Used to detect when more results have been loaded
 */
const SearchStatusAnnouncer: React.FC<SearchStatusAnnouncerProps> = ({
    status,
    query,
    resultCount,
    isLoadingMore = false,
    clearAfter = 3000,
}) => {
    const { t } = useTranslation()
    const [announcement, setAnnouncement] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState(query)
    const [hasAnnouncedResults, setHasAnnouncedResults] = useState(false)
    const [previousResultCount, setPreviousResultCount] = useState(0)
    const [wasLoadingMore, setWasLoadingMore] = useState(false)
    const previousQueryRef = useRef(query)

    // Debounce query changes to avoid rapid announcements
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedQuery(query)
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [query])

    // Reset announcement tracking when query changes
    useEffect(() => {
        if (query !== previousQueryRef.current) {
            setHasAnnouncedResults(false)
            setWasLoadingMore(false)
            setPreviousResultCount(0)
            previousQueryRef.current = query
        }
    }, [query])

    // Generate announcements based on status and search state
    useEffect(() => {
        if (!debouncedQuery) {
            setAnnouncement('')
            return
        }

        let message = ''

        /*
         * Announcement Logic Flow:
         *
         * 1. INFINITE SCROLL LOADING: Detect when user scrolls to load more results
         *    Conditions: isLoadingMore prop OR (status='pending' + hasAnnouncedResults=true + resultCount>0)
         *    Announces: "Loading more results..."
         */
        const isInfiniteScrollLoading = status === 'pending' && hasAnnouncedResults && resultCount > 0

        if (isLoadingMore || isInfiniteScrollLoading) {
            if (!wasLoadingMore) {
                setWasLoadingMore(true) // Track that we're in infinite scroll mode
            }
            message = t('search.status.loading')

            /*
             * 2. INITIAL SEARCH: First time searching for a query
             *    Conditions: status='pending' + hasAnnouncedResults=false
             *    Announces: "Searching for \"[query]\"..."
             */
        } else if (status === 'pending' && !hasAnnouncedResults) {
            message = t('search.status.searching', { query: debouncedQuery })

            /*
             * 3. INITIAL RESULTS: First time results are found for a query
             *    Conditions: status='success' + hasAnnouncedResults=false
             *    Announces: "[count] results found for \"[query]\"" OR "No results found for \"[query]\""
             */
        } else if (status === 'success' && !hasAnnouncedResults) {
            setHasAnnouncedResults(true) // Mark that we've announced initial results

            if (resultCount === 0) {
                message = t('search.status.noResults', { query: debouncedQuery })
            } else {
                message = t('search.status.resultsFound', {
                    count: resultCount,
                    query: debouncedQuery,
                })
            }

            /*
             * 4. MORE RESULTS LOADED: Infinite scroll completed and more results are available
             *    Conditions: status='success' + wasLoadingMore=true + resultCount > previousResultCount
             *    Announces: "[total] results now available for \"[query]\""
             */
        } else if (status === 'success' && wasLoadingMore && resultCount > previousResultCount) {
            setWasLoadingMore(false) // Reset infinite scroll tracking
            setPreviousResultCount(resultCount) // Update count AFTER comparison to preserve logic
            message = t('search.status.moreResultsLoaded', {
                count: resultCount,
                query: debouncedQuery,
            })

            /*
             * 5. ERROR STATE: Handle search errors
             *    Conditions: status='error'
             *    Announces: "Search failed for \"[query]\""
             */
        } else if (status === 'error') {
            message = t('search.status.error', { query: debouncedQuery })

            /*
             * 6. SILENT UPDATES: Update tracking state without announcements
             *    Used for result count changes that don't need announcements
             */
        } else if (resultCount !== previousResultCount) {
            setPreviousResultCount(resultCount)
        }

        // Only update announcement if we have a message to announce
        if (message) {
            setAnnouncement(message)
        }
    }, [
        status,
        debouncedQuery,
        resultCount,
        isLoadingMore,
        hasAnnouncedResults,
        wasLoadingMore,
        previousResultCount,
        t,
    ])

    return (
        <AriaLiveAnnouncer
            message={announcement}
            // eslint-disable-next-line i18next/no-literal-string
            politeness="polite"
            clearAfter={clearAfter}
        />
    )
}

export default SearchStatusAnnouncer
