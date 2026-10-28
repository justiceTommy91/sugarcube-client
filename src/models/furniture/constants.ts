export const DEBUG_CATEGORY = 'DEBUG_CATEGORY'

export const HIGH_IN_STOCK = 'HIGH_IN_STOCK'
export const MEDIUM_IN_STOCK = 'MEDIUM_IN_STOCK'
export const LOW_IN_STOCK = 'LOW_IN_STOCK'
export const OUT_OF_STOCK = 'OUT_OF_STOCK'
export type AvailabilityStatus =
    | typeof HIGH_IN_STOCK
    | typeof MEDIUM_IN_STOCK
    | typeof LOW_IN_STOCK
    | typeof OUT_OF_STOCK

export const CAN_PICK_UP = 'canPickup'
export const NO_PICK_UP = 'noPickup'

export type PickupIndicator = typeof CAN_PICK_UP | typeof NO_PICK_UP

export const SWAPPABLE_PAGE_SIZE = 100
export const SEARCH_CATEGORY_PAGE_SIZE = 48
