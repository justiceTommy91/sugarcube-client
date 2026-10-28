import { useMemo } from 'react'
import { useFurnitureSearch } from '@astro-hooks/useFurnitureSearch'
import { useDebouncedValue } from '@astro-hooks/useDebouncedValue'
import { LOCALES_USING_IMPERIAL_SYSTEM } from '@gatsby/models/location/constants'
import { useSugarcubeContext } from '@providers/SugarcubeContext'
import type { DimensionLabels } from '../types'
import { bboxToSearchParams, groupFurnitureItems } from '../productData'
import { SEARCH_DEBOUNCE_MS } from '../constants'

interface SearchOptions {
    dimensionLabels: DimensionLabels | null
    searchContext: { queryTerm?: string | null; categoryId?: string | null }
}

export function useFurnitureSearchByDimensions({ dimensionLabels, searchContext }: SearchOptions) {
    const { market } = useSugarcubeContext()
    const isImperial = LOCALES_USING_IMPERIAL_SYSTEM.includes(market)
    const rawParams = useMemo(
        () => (dimensionLabels ? bboxToSearchParams(dimensionLabels, searchContext, isImperial) : null),
        [dimensionLabels, searchContext, isImperial],
    )
    const debouncedParams = useDebouncedValue(rawParams, SEARCH_DEBOUNCE_MS)
    const { data, isFetching, error, refetch } = useFurnitureSearch(debouncedParams)
    const families = useMemo(() => groupFurnitureItems(data), [data])

    return {
        families,
        resultCount: families.length,
        isFetching,
        error,
        hasSearched: rawParams != null,
        retry: refetch,
    }
}
