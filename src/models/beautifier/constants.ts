export const MIN_PRODUCTS_FOR_BEAUTIFY = 3
export const DAILY_USAGE_LIMIT = 3
export const MAX_GENERATED_IMAGES = 3

export const BEAUTIFIER_JOB_STATES = {
    STARTED: 'STARTED',
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
} as const

export type BeautifierJobState = (typeof BEAUTIFIER_JOB_STATES)[keyof typeof BEAUTIFIER_JOB_STATES]
