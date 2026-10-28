export const SALES_END_DATE_FILTER = {
    ALL: 'all',
    MORE_THAN_12_MONTHS: 'more-than-12',
    LESS_THAN_12_MONTHS: 'less-than-12',
    NO_END_DATE: 'no-end-date',
} as const

export type SalesEndDateFilterValue = (typeof SALES_END_DATE_FILTER)[keyof typeof SALES_END_DATE_FILTER]

export const DEFAULT_SALES_END_DATE_FILTER = SALES_END_DATE_FILTER.ALL

// Helper to check if auto-loading should be active (any filter except default)
export const shouldAutoLoadForFilter = (filter: string): boolean => filter !== DEFAULT_SALES_END_DATE_FILTER
