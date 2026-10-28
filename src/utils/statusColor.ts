import {
    AvailabilityStatus,
    HIGH_IN_STOCK,
    LOW_IN_STOCK,
    MEDIUM_IN_STOCK,
    OUT_OF_STOCK,
} from 'models/furniture/constants'

/**
 * Gets the color of the product availability status
 * @param availability AvailabilityStatus
 * @returns 'green' | 'orange' | 'red' | 'grey'
 */
export const statusColor = (availability: AvailabilityStatus | null) => {
    switch (availability) {
        case HIGH_IN_STOCK:
        case MEDIUM_IN_STOCK:
            return 'green'
        case LOW_IN_STOCK:
            return 'orange'
        case OUT_OF_STOCK:
            return 'red'
        default:
            return 'grey'
    }
}
