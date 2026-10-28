import { ROOM_TYPE_TO_HUMAN_ID_MAP } from './constants'
import type { RoomType } from './types'

export const findBedroomRoomType = (roomTypes: RoomType[]): RoomType | null =>
    roomTypes.find((rt) => rt.humanId === ROOM_TYPE_TO_HUMAN_ID_MAP.BEDROOM) || null

export const findDefaultRoomType = (roomTypes: RoomType[]): RoomType | null =>
    findBedroomRoomType(roomTypes) || roomTypes[0] || null

/**
 * Finds a room type by its humanId.
 */
export const findRoomTypeByHumanId = (roomTypes: RoomType[], humanId: string): RoomType | null =>
    roomTypes.find((rt) => rt.humanId === humanId) || null

/**
 * Maps a design room type (enum value) to its corresponding API humanId format.
 * First tries explicit mapping, then falls back to converting the enum to human ID format.
 * For example: "LIVING_ROOM" -> "rooms--living-room"
 */
export const mapDesignRoomTypeToHumanId = (designRoomType: string): string => {
    // Try explicit mapping first
    const explicitMapping = ROOM_TYPE_TO_HUMAN_ID_MAP[designRoomType as keyof typeof ROOM_TYPE_TO_HUMAN_ID_MAP]
    if (explicitMapping) {
        return explicitMapping
    }

    // Fallback: convert enum format to human ID format
    const converted = designRoomType.toLowerCase().replace(/_/g, '-')
    return `rooms--${converted}`
}

/**
 * Finds a room type by mapping from design room type to API data.
 * Returns null if no match is found.
 */
export const findRoomTypeByDesignType = (roomTypes: RoomType[], designRoomType: string): RoomType | null => {
    const humanId = mapDesignRoomTypeToHumanId(designRoomType)
    return findRoomTypeByHumanId(roomTypes, humanId)
}

/**
 * Finds a room type that contains the given category ID.
 * @param roomTypes - Array of room types
 * @param categoryId - IKEA category ID (e.g., "fu003")
 * @returns RoomType object if found, null otherwise
 */
export const findRoomTypeByCategoryId = (roomTypes: RoomType[], categoryId: string): RoomType | null => {
    if (!categoryId || !roomTypes.length) return null

    return (
        roomTypes.find((roomType) => {
            if (!roomType.categoryIds) return false
            const categoryIdArray = roomType.categoryIds.split(',')
            return categoryIdArray.includes(categoryId)
        }) || null
    )
}

/**
 * Gets the category name for a given category ID from a room type's parallel arrays.
 * @param roomType - Room type object containing categoryIds and categoryNames
 * @param categoryId - IKEA category ID (e.g., "fu003")
 * @returns Category name if found, null otherwise
 */
export function getCategoryNameById(roomType: RoomType, categoryId: string): string | null {
    if (!roomType.categoryIds || !roomType.categoryNames || !categoryId) return null

    const categoryIdArray = roomType.categoryIds.split(',')
    const categoryNameArray = roomType.categoryNames.split(',')
    const categoryIndex = categoryIdArray.indexOf(categoryId)

    return categoryIndex !== -1 ? categoryNameArray[categoryIndex] : null
}
