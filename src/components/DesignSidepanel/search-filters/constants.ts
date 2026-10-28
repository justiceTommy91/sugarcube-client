// Filter IDs that we are building special non-standard components for
export const FILTER_IDS = {
    COLOR: 'COLOR',
    RATINGS: 'RATINGS',
    REFERENCE_MEASUREMENTS: 'REFERENCE_MEASUREMENTS',
    MEASUREMENT_BUCKETS: 'MEASUREMENT_BUCKETS',
} as const

// Filter types that we are building special non-standard components for
export const FILTER_TYPES = {
    BOOLEAN: 'BOOLEAN',
    CLASS_FILTER: 'CLASS_FILTER',
    TYPED_CLASS_FILTER: 'TYPED_CLASS_FILTER',
} as const

// Default filter pills that should always be visible when available
export const DEFAULT_FILTER_IDS: string[] = [
    FILTER_IDS.REFERENCE_MEASUREMENTS,
    FILTER_IDS.MEASUREMENT_BUCKETS,
    FILTER_IDS.COLOR,
]

// Default sort option ID
export const DEFAULT_SORT_OPTION_ID = 'RELEVANCE'

// Async status constants
export const ASYNC_STATUS = {
    IDLE: 'idle',
    PENDING: 'pending',
    SUCCESS: 'success',
    ERROR: 'error',
} as const
