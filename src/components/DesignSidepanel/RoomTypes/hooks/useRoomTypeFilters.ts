import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useSearchTracking } from 'hooks/useSearchTracking'

import {
    selectRoomTypeInFilter,
    filterBySubCategory,
    clearSubCategoryFilter,
    selectDebugCategory,
    clearFurnitureFilter,
} from 'models/furniture/actions'
import { DEBUG_CATEGORY } from 'models/furniture/constants'
import { getRoomTypes, getRoomTypesLoading } from 'models/roomTypes/selectors'
import {
    getFilter,
    getSelectedRoomTypeFromFilter,
    getSelectedSubCategoryFromFilter,
    getRoomTypeTranslatedName,
    shouldShowRoomTypeUI as getShouldShowRoomTypeUI,
} from 'models/furniture/selectors'
import { getIsAdmin } from 'models/user/selectors'
import type { RoomType, SubCategory } from 'models/roomTypes/types'
import { COMPLETE_MY_ROOM_ID } from 'models/roomTypes/constants'
import { SEARCH_TYPES } from 'models/tracking/constants'
import { SEARCH_CHANGE_TYPES } from 'utils/searchTracking'
import { useRoomTypeProviderContext } from '../RoomTypeProvider'

export const useRoomTypeFilters = () => {
    const dispatch = useAppDispatch()
    const { isInitializing } = useRoomTypeProviderContext()
    const { trackSearchResult } = useSearchTracking()

    const roomTypes = useAppSelector(getRoomTypes)
    const selectedRoomType = useAppSelector(getSelectedRoomTypeFromFilter)
    const selectedSubCategory = useAppSelector(getSelectedSubCategoryFromFilter)
    const isLoading = useAppSelector(getRoomTypesLoading)
    const isAdmin = useAppSelector(getIsAdmin)
    const furnitureFilter = useAppSelector(getFilter)
    const isDebugSelected = furnitureFilter?.category === DEBUG_CATEGORY
    const roomTypeTranslatedName = useAppSelector(getRoomTypeTranslatedName)
    const shouldShowRoomTypeUI = useAppSelector(getShouldShowRoomTypeUI)

    const handleRoomTypeSelect = useCallback(
        (roomType: RoomType) => {
            // Special handling for "Complete my room" - don't trigger a furniture search
            if (roomType.humanId === COMPLETE_MY_ROOM_ID) {
                // Pass null as query to prevent room type search from triggering
                dispatch(selectRoomTypeInFilter(COMPLETE_MY_ROOM_ID, '', '', null))
                return
            }

            // Re-dispatching SELECT_ROOM_TYPE_IN_FILTER for the already-selected room type
            // would reset the rest of the filter (color, size, stock, price) because the reducer
            // returns `{ ...initialState.filter, ... }`. Bail if nothing would change.
            if (selectedRoomType?.humanId === roomType.humanId) {
                return
            }

            const roomTypeId = roomType.humanId.replace(/^rooms--/, '')
            const translatedName = roomType.name

            trackSearchResult(SEARCH_TYPES.ROOM_TYPE, {
                type: SEARCH_CHANGE_TYPES.FILTER,
                value: roomTypeId,
                filterId: SEARCH_TYPES.ROOM_TYPE,
            })

            dispatch(
                selectRoomTypeInFilter(roomType.humanId, roomType.categoryIds, roomType.categoryNames, translatedName),
            )
        },
        [dispatch, trackSearchResult, selectedRoomType],
    )

    const handleSubCategorySelect = useCallback(
        (subCategory: SubCategory | null) => {
            if (subCategory) {
                trackSearchResult(SEARCH_TYPES.SUB_CATEGORY, {
                    type: SEARCH_CHANGE_TYPES.FILTER,
                    value: subCategory.name,
                    filterId: SEARCH_TYPES.SUB_CATEGORY,
                })

                // Filter to single subcategory (clears room type search mode)
                dispatch(filterBySubCategory(subCategory.categoryId, subCategory.name, selectedRoomType?.humanId))
            } else {
                // Deselecting subcategory - restore room type search
                const currentSubCategoryName = selectedSubCategory?.name
                if (currentSubCategoryName) {
                    trackSearchResult(SEARCH_TYPES.SUB_CATEGORY, {
                        type: SEARCH_CHANGE_TYPES.FILTER,
                        value: `REMOVE(subCategory:${currentSubCategoryName})`,
                        filterId: SEARCH_TYPES.SUB_CATEGORY,
                    })
                }

                // Clear subcategory filter and restore room type search query
                dispatch(
                    clearSubCategoryFilter(
                        selectedRoomType?.categoryIds || null,
                        selectedRoomType?.categoryNames || null,
                        roomTypeTranslatedName,
                    ),
                )
            }
        },
        [dispatch, selectedRoomType, selectedSubCategory, trackSearchResult, roomTypeTranslatedName],
    )

    // Hide subcategory pills when "Complete my room" is selected
    const isCompleteMyRoomSelected = selectedRoomType?.humanId === COMPLETE_MY_ROOM_ID
    const shouldShowSubCategoryPills =
        shouldShowRoomTypeUI &&
        !isDebugSelected &&
        !isCompleteMyRoomSelected &&
        selectedRoomType &&
        selectedRoomType.categories.length > 0

    const handleDebugSelect = useCallback(() => {
        if (isDebugSelected) {
            // Toggle off — reset filters and restore room type context
            dispatch(clearFurnitureFilter())
        } else {
            dispatch(selectDebugCategory())
        }
    }, [dispatch, isDebugSelected])

    return {
        roomTypes,
        selectedRoomType,
        selectedSubCategory,
        isLoading,
        isAdmin,
        isDebugSelected,
        onRoomTypeSelect: handleRoomTypeSelect,
        onSubCategorySelect: handleSubCategorySelect,
        onDebugSelect: handleDebugSelect,
        shouldShowRoomTypeUI,
        shouldShowSubCategoryPills,
        isInitializing,
        isCompleteMyRoomSelected,
    }
}
