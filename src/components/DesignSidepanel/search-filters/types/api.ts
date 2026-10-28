import type { FilterValue } from './core'

export type ApiFilter = {
    id: string
    name: string
    type: 'CLASS_FILTER' | 'BOOLEAN'
    values?: FilterValue[]
    count?: number
    parameter: string
}

export type ApiSortOrders = {
    name: string
    values: Array<{
        id: string
        name: string
        eventAction: string
        selected: boolean
    }>
}

export type SearchApiParams = {
    query?: string | null // Can be null when no search active
    category?: string
    subCategory?: string
    subCatalog?: string
    roomType?: string
    // Room type selection
    selectedRoomTypeId?: string | null
    selectedSubCategoryId?: string | null
    subCategoryIds?: string | null // Room type subcategories
    featuredProducts?: boolean
    sortOrder?: string
    inStockStore?: boolean
    availableOnline?: boolean
}

export type FilterApiParams = Record<string, string | null>

// Complete API parameters type that properly handles filter clearing
// Uses index signature to allow both typed search params and dynamic filter params
export type ApiParams = SearchApiParams & {
    [key: string]: string | boolean | null | undefined
}
