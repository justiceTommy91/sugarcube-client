/**
 * API parameter conversion, search-related utilities, and sort state management
 */

/* eslint-disable i18next/no-literal-string */
import type { FilterSelections, RawFilter } from '../types/core'
import type { SortOptionId, SortState } from '../types/sort'
import type { SearchApiParams, ApiParams, ApiSortOrders } from '../types/api'
import { FILTER_TYPES } from '../constants'

/**
 * Converts UI filter selections to API parameters by merging filter selection values
 * with search parameters. Maps color/size/price selections to API query parameters.
 * @param filterSelections - UI filter selections (e.g. {COLOR: ['red', 'blue'], SIZE: ['large']})
 * @param filterDefinitions - The raw filters from API with parameter mapping
 * @param searchParams - Search parameters containing basic properties (query, category, etc.)
 * @returns Complete API parameters object with both search and selection parameters
 */
export const convertSelectionsToParams = (
    filterSelections: FilterSelections,
    filterDefinitions: RawFilter[],
    searchParams: SearchApiParams,
): ApiParams => {
    const apiParams: ApiParams = { ...searchParams }

    // Set API parameters based on selected filters
    filterDefinitions.forEach((filterData) => {
        if (!filterData.parameter || !filterData.enabled) return

        const values = filterSelections[filterData.id] || []

        if (values.length > 0) {
            if (filterData.type === FILTER_TYPES.BOOLEAN) {
                apiParams[filterData.parameter] = 'true'
            } else {
                apiParams[filterData.parameter] = values.join(',')
            }
        } else {
            // Explicitly clear empty filters with null
            apiParams[filterData.parameter] = null
        }
    })

    return apiParams
}

/**
 * Creates sort state from API sort orders
 * @param apiSortOrders - Sort orders from API response (required)
 * @param currentSortOrder - Currently selected sort option
 * @returns Sort state object
 */
export const createSortState = (apiSortOrders: ApiSortOrders, currentSortOrder: SortOptionId): SortState => {
    const options = apiSortOrders.values.map((value) => ({
        id: value.id,
        name: value.name,
        selected: value.id === currentSortOrder,
        eventAction: value.eventAction,
    }))

    return {
        name: apiSortOrders.name,
        options,
    }
}
