export const STATE_NOMINAL = 'STATE_NOMINAL'
export const STATE_FETCHING = 'STATE_FETCHING'
export const STATE_ERROR = 'STATE_ERROR'
export const STATE_DONE = 'STATE_DONE'

export type FetchState = typeof STATE_NOMINAL | typeof STATE_FETCHING | typeof STATE_ERROR | typeof STATE_DONE

export const QA_STATUS_PENDING = 'PENDING'
export const QA_STATUS_GOOD = 'GOOD'
export const QA_STATUS_BAD = 'BAD'

export type QAStatus = typeof QA_STATUS_PENDING | typeof QA_STATUS_GOOD | typeof QA_STATUS_BAD

export const SMARTA_STATUS_PENDING = 'PENDING'
export const SMARTA_STATUS_SUCCESS = 'SUCCESS'
export const SMARTA_STATUS_FAILED = 'FAILED'

export type SmartaPlacementStatus = typeof SMARTA_STATUS_PENDING | typeof SMARTA_STATUS_SUCCESS | typeof SMARTA_STATUS_FAILED
