/**
 * Hook-specific types for internal state management
 */

import { RoomType } from 'models/scenes/constants'
import { ASYNC_STATUS } from '../constants'
import type { SortOptionId } from './sort'

export type AsyncStatus = (typeof ASYNC_STATUS)[keyof typeof ASYNC_STATUS]

export type ProductSearchMode = 'featured' | 'all'

export type ProductSearchError = {
    type: 'network' | 'validation' | 'timeout' | 'unknown'
    message: string
    code?: string
}

// Search filters for the complete search experience
export type SearchFilters = {
    query: string
    category: string
    subCategory: string
    roomType: string
    color: string
    price: string
    size: string
    inStockStore: boolean
    availableOnline: boolean
    featuredProducts: boolean
}

// Product filters type for backward compatibility
export type ProductFilters = {
    query: string | null
    inStockStore: boolean
    availableOnline: boolean
    category: string
    subCategory: string
    subCatalog?: string
    roomType: '*' | RoomType
    selectedRoomTypeId?: string | null
    selectedSubCategoryId?: string | null
    subCategoryIds?: string | null
    subCategoryNames?: string | null
    price: string
    color: string
    size: string
    featuredProducts: boolean
    sortOrder: SortOptionId
}
