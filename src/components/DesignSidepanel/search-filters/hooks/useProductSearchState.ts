import { useState, useRef, useEffect, useCallback } from 'react'
import 'core-js/proposals/promise-with-resolvers'

import type { RenderItemComplete } from 'models/compositions'
import * as furnitureActions from 'models/furniture/actions'
import * as furnitureSelectors from 'models/furniture/selectors'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import type { AsyncStatus, ProductSearchError, ProductFilters } from '../types/hooks'
import { ASYNC_STATUS } from '../constants'

export type UseProductSearchStateResult = {
    results: RenderItemComplete[]
    status: AsyncStatus
    /** Current number of results in page/response (pagination-aware) */
    count: number
    /** Maximum total results available for current search/filter criteria */
    maxCount: number
    haveMore: boolean
    fetchNextPage: () => Promise<void>
    /** Whether we're currently loading due to a new search query (as opposed to filtering) */
    isSearchLoading: boolean
    error: ProductSearchError | null
}

/**
 * Custom hook for managing product search state including results, pagination, and loading status
 *
 * @param filters - Current filter state to track search query changes
 */
export const useProductSearchState = (filters: ProductFilters): UseProductSearchStateResult => {
    const [status, setStatus] = useState<AsyncStatus>(ASYNC_STATUS.IDLE)
    const [error, setError] = useState<ProductSearchError | null>(null)

    const isLoading = useAppSelector(furnitureSelectors.getFurnitureIsLoading)
    const results = useAppSelector(furnitureSelectors.getFurnitureByFilter) as RenderItemComplete[]
    const haveMore = useAppSelector(furnitureSelectors.getCanLoadMore)
    const count = useAppSelector(furnitureSelectors.getNumberFurnitureItems)
    const maxCount = useAppSelector(furnitureSelectors.getMaxFurnitureItems)

    const dispatch = useAppDispatch()

    // Track the last search query that successfully completed
    const lastCompletedQuery = useRef<string>('')

    // Promise management for pagination
    const [pendingRequest, setPendingRequest] = useState(() => {
        const req = Promise.withResolvers<void>()
        req.resolve()
        return req
    })

    // Track loading state changes
    const prevIsLoading = useRef(isLoading)
    useEffect(() => {
        if (isLoading) {
            setPendingRequest(Promise.withResolvers())
            setStatus(ASYNC_STATUS.PENDING)
            setError(null)
        } else {
            pendingRequest.resolve()
            setStatus(ASYNC_STATUS.SUCCESS)
            // Update last completed query when loading finishes
            if (prevIsLoading.current === true) {
                lastCompletedQuery.current = filters.query || ''
            }
        }
        prevIsLoading.current = isLoading
    }, [isLoading, filters.query])

    /**
     * Fetches the next page of results if available
     * @returns Promise that resolves when the request completes
     */
    const fetchNextPage = useCallback((): Promise<void> => {
        if (!haveMore || status === ASYNC_STATUS.PENDING || isLoading) {
            return pendingRequest.promise
        }

        try {
            dispatch(furnitureActions.requestFurniture())
            return pendingRequest.promise
        } catch (err) {
            const paginationError: ProductSearchError = {
                type: `network`,
                message: `Failed to fetch next page`,
                code: `PAGINATION_ERROR`,
            }
            setError(paginationError)
            setStatus(ASYNC_STATUS.ERROR)
            return Promise.reject(paginationError)
        }
    }, [haveMore, status, pendingRequest, dispatch, isLoading])

    const isSearchLoading = isLoading && (filters.query || '') !== lastCompletedQuery.current

    return {
        results,
        status,
        count,
        maxCount,
        haveMore,
        fetchNextPage,
        isSearchLoading,
        error,
    }
}
