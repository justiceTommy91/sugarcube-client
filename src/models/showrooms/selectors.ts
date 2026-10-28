import { createSelector } from 'reselect'
import { STATE_FETCHING } from 'constants/stateTypes'
import type { RootState } from 'store'
import {
    type FurnishingType,
    type RoomType,
    UNSUPPORTED_ROOMTYPES,
    UNFURNISHED,
    PARTLY_FURNISHED,
    FULLY_FURNISHED,
} from 'models/scenes/constants'
import { isProd } from 'utils/environment'
import { includes } from 'utils/array'

import { FILTER_TYPE_ALL, TAGS } from './constants'

const matchFilterableProp =
    <T>(prop: keyof T, value: string) =>
        (toTest: T) =>
            value === FILTER_TYPE_ALL || toTest[prop] === value

const getRoomType = (state: RootState) => state.showrooms.roomType
const getFurnishingType = (state: RootState) => state.showrooms.furnishingType
const getShowroomsRaw = (state: RootState) => state.showrooms.showrooms
const getShowroomsABRaw = (state: RootState) => state.showrooms.showroomsAB

export const getFetchState = (state: RootState) => state.showrooms.fetchState
export const getIsFetching = (state: RootState) => getFetchState(state) === STATE_FETCHING
export const getHasShowrooms = (state: RootState) => state.showrooms.showrooms.length > 0
export const getShowrooms = createSelector([getShowroomsRaw], (showrooms) =>
    showrooms.filter((showroom) => showroom.tags.includes(TAGS.DASHBOARD)),
)

export const getShowroomsAlternateAB = createSelector(
    [getShowroomsABRaw],
    (showrooms) => showrooms[TAGS.SHOWROOM_AB] || [],
)

export const getShowroomsAlternateABV2 = createSelector(
    [getShowroomsABRaw],
    (showrooms) => showrooms[TAGS.SHOWROOM_AB_V2] || [],
)

export const getShowroomRoomTypeFilters = createSelector([getShowrooms], (showrooms): RoomType[] => {
    if (!showrooms || !showrooms.length) {
        return []
    }

    return Array.from(
        new Set(
            showrooms
                .filter(
                    (showroom) =>
                        !UNSUPPORTED_ROOMTYPES.includes(showroom.roomType) &&
                        (showroom.furnishingType === FULLY_FURNISHED || showroom.furnishingType === PARTLY_FURNISHED),
                )
                .map((showroom) => showroom.roomType),
        ),
    )
})

export const getShowroomFurnishingTypeFilters = createSelector([getShowrooms], (showrooms): FurnishingType[] => {
    if (!showrooms || !showrooms.length) {
        return []
    }
    return Array.from(
        new Set(showrooms.map((showroom) => showroom.furnishingType).filter((furnishingType) => !!furnishingType)),
    )
})

// Default the filter to all type if the filter value is not valid
export const getShowroomRoomTypeFilter = createSelector(
    [getRoomType, getShowroomRoomTypeFilters],
    (showroomFilter, validShowroomFilters) =>
        includes(validShowroomFilters, showroomFilter) ? showroomFilter : FILTER_TYPE_ALL,
)

export const getShowroomFurnishingTypeFilter = createSelector(
    [getFurnishingType, getShowroomFurnishingTypeFilters],
    (furnishingFilter, validFurnishingFilters) =>
        includes(validFurnishingFilters, furnishingFilter) ? furnishingFilter : FULLY_FURNISHED,
)

export const getFilteredShowrooms = createSelector(
    [getShowrooms, getShowroomRoomTypeFilter, getShowroomFurnishingTypeFilter],
    (showrooms, roomType, furnishingType) => {
        const matchRoomTypeFilter = matchFilterableProp('roomType', roomType)
        const matchFurnishingTypeFilter = matchFilterableProp('furnishingType', furnishingType)

        return showrooms.filter(matchRoomTypeFilter).filter(matchFurnishingTypeFilter)
    },
)

export const getUnfurnishedShowrooms = createSelector([getShowrooms], (showrooms) => {
    const matchUnfurnishedTypeFilter = matchFilterableProp('furnishingType', UNFURNISHED)
    return showrooms.filter(matchUnfurnishedTypeFilter).filter(matchUnfurnishedTypeFilter)
})

export const getEnabledFurnishingFilters = createSelector([getFilteredShowrooms], (showrooms) => {
    if (!showrooms || !showrooms.length) {
        return []
    }
    return Array.from(
        new Set(showrooms.map((showroom) => showroom.furnishingType).filter((furnishingType) => !!furnishingType)),
    )
})

const getAllShowroomsFlat = createSelector([getShowroomsRaw, getShowroomsABRaw], (showrooms, showroomsAB) => [
    ...showrooms,
    ...Object.values(showroomsAB).flat(),
])

export const getIsRBShowroomByCompositionId = (state: RootState, compositionId: string | undefined): boolean => {
    if (!compositionId) return false
    const allShowrooms = getAllShowroomsFlat(state)
    const showroom = allShowrooms.find((s) => s.composition === compositionId)
    if (!showroom) return false
    return showroom.tags.includes(TAGS.RB)
}

export const getShowroomNeutralStandard = createSelector([getShowrooms], (showrooms) => {
    const neutralStandardShowroomId = isProd ? 328 : 397
    const matched = showrooms.filter((showroom) => showroom.id === neutralStandardShowroomId)

    if (matched.length > 0) {
        return matched
    }
    return showrooms.length > 0 ? [showrooms[0]] : []
})
