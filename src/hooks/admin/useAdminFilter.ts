import { useEffect, useRef } from 'react'
import { useAppSelector } from 'hooks/useAppSelector'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { getAreDebugFeaturesEnabled } from 'models/user/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import * as furnitureSelectors from 'models/furniture/selectors'
import * as furnitureActions from 'models/furniture/actions'
import {
    SALES_END_DATE_FILTER,
    DEFAULT_SALES_END_DATE_FILTER,
    shouldAutoLoadForFilter,
} from 'components/DesignSidepanel/tabs/AddProductTab/admin/constants'
import type { RenderItemComplete } from 'models/compositions'
import { useAdminFilterContext } from './AdminFilterContext'

type SearchResults = {
    haveMore: boolean
    fetchNextPage: () => Promise<void> | void
    isSearchLoading?: boolean
    results: RenderItemComplete[]
}

/**
 * Hook for sales end date filtering functionality in product search.
 * Provides filtering logic and auto-loading for complete dataset filtering.
 */
export const useAdminFilter = (searchResults?: SearchResults) => {
    const areDebugFeaturesEnabled = useAppSelector(getAreDebugFeaturesEnabled)
    const debugSettings = useAppSelector(getDebugSettings)
    const dispatch = useAppDispatch()
    const paginationInfo = useAppSelector(furnitureSelectors.getPaginationInfo)

    const shouldShow = areDebugFeaturesEnabled && debugSettings.showProductAdminData

    // Use context for shared state
    const { filter, setFilter } = useAdminFilterContext()

    // Auto-loading state management
    const isLoadingRef = useRef(false)
    const lastFilterRef = useRef(filter)
    const seenMoreTokensRef = useRef(new Set<string>())
    const previousMoreTokenRef = useRef<string | null>(null)

    const shouldAutoLoad = shouldShow && shouldAutoLoadForFilter(filter)
    const currentSearchResults = searchResults || { haveMore: false, fetchNextPage: () => {}, results: [] }

    // Reset auto-loading state when filter changes
    useEffect(() => {
        if (lastFilterRef.current !== filter) {
            lastFilterRef.current = filter
            seenMoreTokensRef.current.clear()
        }
    }, [filter])

    // Auto-loading logic (formerly useSalesEndDateAutoLoader)
    useEffect(() => {
        const { moreToken: currentMoreToken, count, maxCount, hasNext } = paginationInfo
        const tokenString = String(currentMoreToken || 'null')
        const previousTokenString = String(previousMoreTokenRef.current || 'null')

        if (!shouldAutoLoad) return
        if (
            isLoadingRef.current ||
            currentSearchResults.isSearchLoading ||
            (!currentSearchResults.haveMore && !hasNext)
        )
            return
        if (count >= maxCount && maxCount > 0) return
        if (tokenString === previousTokenString && previousMoreTokenRef.current !== null) return
        if (currentMoreToken && seenMoreTokensRef.current.has(tokenString)) return

        previousMoreTokenRef.current = currentMoreToken
        if (currentMoreToken) {
            seenMoreTokensRef.current.add(tokenString)
        }

        const loadNextPage = () => {
            isLoadingRef.current = true

            try {
                const action = furnitureActions.requestFurniture()
                dispatch(action)
            } catch (error) {
                // Silently handle errors
            } finally {
                isLoadingRef.current = false
            }
        }

        loadNextPage()
    }, [
        shouldAutoLoad,
        paginationInfo.moreToken,
        paginationInfo.count,
        paginationInfo.hasNext,
        dispatch,
        currentSearchResults.isSearchLoading,
        currentSearchResults.haveMore,
    ])

    // Reset loading state when auto-loading is disabled
    useEffect(() => {
        if (!shouldAutoLoad) {
            isLoadingRef.current = false
            lastFilterRef.current = DEFAULT_SALES_END_DATE_FILTER
        }
    }, [shouldAutoLoad])

    if (!shouldShow) {
        return {
            shouldShow: false,
            filter: DEFAULT_SALES_END_DATE_FILTER,
            setFilter,
            filteredResults: null,
            FilterComponent: null,
        }
    }

    const applyAdminFiltering = (products: RenderItemComplete[]): RenderItemComplete[] => {
        if (filter === SALES_END_DATE_FILTER.ALL) {
            return products
        }

        return products.filter((product) => {
            const salesEndDate = product.salesEndDateGlobal
            const currentDate = new Date()
            const twelveMonthsFromNow = new Date()
            twelveMonthsFromNow.setFullYear(currentDate.getFullYear() + 1)

            switch (filter) {
                case SALES_END_DATE_FILTER.MORE_THAN_12_MONTHS: {
                    if (!salesEndDate) return false
                    const endDate = new Date(salesEndDate)
                    return endDate > twelveMonthsFromNow
                }

                case SALES_END_DATE_FILTER.LESS_THAN_12_MONTHS: {
                    if (!salesEndDate) return false
                    const endDateLess = new Date(salesEndDate)
                    return endDateLess <= twelveMonthsFromNow && endDateLess > currentDate
                }

                case SALES_END_DATE_FILTER.NO_END_DATE:
                    return !salesEndDate

                default:
                    return true
            }
        })
    }

    const filteredResults = searchResults ? applyAdminFiltering(searchResults.results) : null

    return {
        shouldShow,
        filter,
        setFilter,
        filteredResults,
        FilterComponent: null,
    }
}
