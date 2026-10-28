import { createSelector } from 'reselect'
import type { RootState } from 'store'
import type { RoomType } from './types'
import { COMPLETE_MY_ROOM_ID } from './constants'
import { findRoomTypeByDesignType, findRoomTypeByCategoryId, findBedroomRoomType } from './utils'

export const getRoomTypesState = (state: RootState) => state.roomTypes

const getExperimentsFlags = (state: RootState) => state.experiments.decisions.flags

export const getRoomTypes = createSelector([getRoomTypesState], (roomTypesState) => roomTypesState.data.rooms)

/**
 * Returns all room type options including the "Complete my room" option if the flag is enabled.
 *
 * Note: The "Complete my room" option has an empty name string as a placeholder.
 * Use getRoomTypeDisplayName() from RoomTypes/utils.ts to get the translated display name.
 */
export const getAllRoomTypeOptions = createSelector(
    [getRoomTypes, getExperimentsFlags],
    (roomTypes, flags): RoomType[] => {
        if (!flags.CompleteMyRoom) {
            return roomTypes
        }

        const completeMyRoomOption: RoomType = {
            humanId: COMPLETE_MY_ROOM_ID,
            name: '', // Placeholder - use getRoomTypeDisplayName() to get translated name
            imageUrl: '',
            categories: [],
            categoryIds: '',
            categoryNames: '',
            uuid: COMPLETE_MY_ROOM_ID,
            region: '',
            createdAt: '',
            lastModifiedTs: '',
        }

        return [completeMyRoomOption, ...roomTypes]
    },
)

export const getRoomTypesLoading = createSelector([getRoomTypesState], (roomTypesState) => roomTypesState.loading)

// Helper to match a roomType for the current design
export const getRoomTypeForDesign = (apiRoomTypes: RoomType[], designRoomType?: string): RoomType | null => {
    if (!designRoomType || apiRoomTypes.length === 0) {
        return findBedroomRoomType(apiRoomTypes) || apiRoomTypes[0] || null
    }

    // Try to find matching room type by design's room type
    const match = findRoomTypeByDesignType(apiRoomTypes, designRoomType)

    return match || findBedroomRoomType(apiRoomTypes) || apiRoomTypes[0]
}

/**
 * Finds a room type that contains the given category ID
 * @param categoryId - IKEA category ID (e.g., "fu003")
 * @returns RoomType object if found, null otherwise
 */
export const getRoomTypeByCategoryId = createSelector(
    [getRoomTypes, (_state: RootState, categoryId: string) => categoryId],
    (roomTypes, categoryId) => findRoomTypeByCategoryId(roomTypes, categoryId),
)
