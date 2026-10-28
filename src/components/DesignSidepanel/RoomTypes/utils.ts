import type { RoomType } from 'models/roomTypes/types'
import { COMPLETE_MY_ROOM_ID } from 'models/roomTypes/constants'

/**
 * Gets the display name for a room type, handling translation for special cases.
 *
 * Room types from the API come pre-translated, but the "Complete my room" option
 * is created client-side and needs runtime translation based on user's language.
 *
 * @param roomType - The room type object
 * @param translateFn - i18next translation function from useTranslation()
 * @returns Translated display name for the room type
 */
export const getRoomTypeDisplayName = (roomType: RoomType, translateFn: (key: string) => string): string => {
    if (roomType.humanId === COMPLETE_MY_ROOM_ID) {
        return translateFn(`design.complete my room`)
    }
    return roomType.name
}
