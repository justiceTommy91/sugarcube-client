/**
 * Sort-related types used across pills, modals, and hooks
 */

export type SortOptionId = string

export type SortOption = {
    id: SortOptionId
    name: string
    selected: boolean
    eventAction?: string
}

export type SortState = {
    name: string
    options: SortOption[]
}
