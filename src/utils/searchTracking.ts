import type { ProductFilters } from 'components/DesignSidepanel/search-filters/types/hooks'
import type { FilterSelections, RawFilter } from 'components/DesignSidepanel/search-filters/types/core'
import { DEFAULT_SORT_OPTION_ID } from 'components/DesignSidepanel/search-filters/constants'

// Search change type constants
export const SEARCH_CHANGE_TYPES = {
    QUERY: 'query',
    FILTER: 'filter',
    SORT: 'sort',
} as const

export type SearchChangeType = (typeof SEARCH_CHANGE_TYPES)[keyof typeof SEARCH_CHANGE_TYPES]

/**
 * Formats search term for SearchTerm property
 */
export const formatSearchTerm = (filterChange: {
    type: SearchChangeType
    value: string
    filterId?: string
}): string => {
    switch (filterChange.type) {
        case SEARCH_CHANGE_TYPES.QUERY:
            return `search:${filterChange.value}`
        case SEARCH_CHANGE_TYPES.FILTER:
            // Handle REMOVE case specially - if value starts with REMOVE(, use it as-is
            if (filterChange.value.startsWith('REMOVE(')) {
                return filterChange.value
            }
            return `${filterChange.filterId?.toLowerCase()}:${filterChange.value.toLowerCase()}`
        case SEARCH_CHANGE_TYPES.SORT:
            return `sort:${filterChange.value}`
        default:
            return filterChange.value
    }
}

/**
 * Formats all active search terms for SearchTermDetails property
 */

export const formatSearchTermDetails = (
    filters: ProductFilters,
    selectedFilterOptions: FilterSelections,
    rawFilters?: Partial<RawFilter>[],
): string => {
    const terms: string[] = []

    // Add search query
    if (filters.query) {
        terms.push(`search:${filters.query}`)
    }

    // Add active filters
    Object.entries(selectedFilterOptions).forEach(([filterId, options]) => {
        if (options.length > 0) {
            const filterKey = filterId.toLowerCase()

            // Find the filter metadata to check if it's boolean
            const filterMetadata = rawFilters?.find((f) => f?.id === filterId)
            const isBooleanFilter = filterMetadata?.type === 'BOOLEAN'

            const filterValues = options
                .map((optionId) => {
                    if (isBooleanFilter) {
                        return 'true'
                    }
                    // Find the option name from the filter metadata
                    const optionName = filterMetadata?.values?.find((value) => value.id === optionId)?.name
                    return optionName || optionId // Fallback to ID if name not found
                })
                .join(',')
            terms.push(`${filterKey}:${filterValues}`)
        }
    })

    // Add availability filters
    if (filters.inStockStore) {
        terms.push('instockstore:true')
    }
    if (filters.availableOnline) {
        terms.push('availableonline:true')
    }

    // Add sort if not default
    if (filters.sortOrder && filters.sortOrder !== DEFAULT_SORT_OPTION_ID) {
        terms.push(`sort:${filters.sortOrder}`)
    }

    // Add subcategories for room type feature
    if (filters.subCategoryNames) {
        terms.push(`subcategories:${filters.subCategoryNames}`)
    } else if (filters.subCategoryIds) {
        // Fallback to IDs if names not available
        terms.push(`subcategories:${filters.subCategoryIds}`)
    }

    return terms.join(';')
}

/**
 * Formats search query details from V2 filters for SearchQueryDetails property
 * Only includes filters actually applied via Search & Filters V2 UI
 */
export const formatSearchQueryDetails = (
    filters: ProductFilters,
    selectedFilterOptions: FilterSelections,
    rawFilters?: Partial<RawFilter>[],
): string => {
    const params = new URLSearchParams()

    // Add search query
    if (filters.query && filters.query.trim()) {
        params.append('q', filters.query.trim())
    }

    // Add V2 filter selections using API parameters from rawFilters
    if (rawFilters) {
        rawFilters.forEach((filter) => {
            if (!filter.id || !filter.parameter) return

            const selections = selectedFilterOptions[filter.id]
            if (selections?.length > 0) {
                if (filter.type === 'BOOLEAN') {
                    params.append(filter.parameter, 'true')
                } else {
                    params.append(filter.parameter, selections.join(','))
                }
            }
        })
    }

    // Add V2-specific availability filters
    if (filters.inStockStore) {
        params.append('f-available-in-store', 'true')
    }
    if (filters.availableOnline) {
        params.append('online_sellable', 'true')
    }

    // Add sort order if not default
    if (filters.sortOrder && filters.sortOrder !== DEFAULT_SORT_OPTION_ID) {
        params.append('f-sortOrder', filters.sortOrder)
    }

    // Add subcategories for room type feature
    if (filters.subCategoryIds) {
        params.append('f-subcategories', filters.subCategoryIds)
    }

    return params.toString()
}

/**
 * Calculates absolute position of product in search results
 */
export const calculateSearchResultPosition = (
    productId: string,
    results: Array<{ id: string }>,
    currentPage: number,
    pageSize: number,
): number | null => {
    const indexInCurrentPage = results.findIndex((result) => result.id === productId)
    if (indexInCurrentPage === -1) return null

    // Calculate absolute position (1-indexed)
    return (currentPage - 1) * pageSize + indexInCurrentPage + 1
}
