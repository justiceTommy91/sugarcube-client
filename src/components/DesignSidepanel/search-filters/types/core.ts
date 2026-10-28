/**
 * Core filter types used universally across pills, modals, hooks, and utils
 */

export type FilterValue = {
    id: string
    name: string
    count: number
    hex?: string
    enabled?: boolean
}

export type FilterType = 'BOOLEAN' | 'CLASS_FILTER' | 'TYPED_CLASS_FILTER' | string

export type MeasurementType = {
    id: string
    name: string
    values?: FilterValue[]
}

export type RawFilter = {
    id: string
    name: string
    type: FilterType
    values?: FilterValue[]
    count?: number
    parameter?: string
    enabled: boolean
    types?: MeasurementType[]
}

export type FilterSelections = Record<string, string[]>

// Alias for FilterValue to maintain compatibility
export type FilterOption = FilterValue
