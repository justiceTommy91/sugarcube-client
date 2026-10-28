import { createSlice } from '@reduxjs/toolkit'

import { STATE_NOMINAL, STATE_FETCHING, STATE_ERROR, type FetchState } from 'constants/stateTypes'
import {
    failedReceiveShowrooms,
    filterShowrooms,
    receiveShowrooms,
    requestShowrooms,
    filterFurnishingType,
    requestAlternateShowrooms,
    receiveAlternateShowrooms,
    failedReceiveAlternateShowrooms,
} from 'models/showrooms/actions'
import type { Showroom } from 'models/showrooms'
import { type FurnishingType, type RoomType, ROOM_TYPES, FURNISHING_TYPES } from 'models/scenes/constants'
import { FILTER_TYPE_ALL } from 'models/showrooms/constants'
import { Filterable, includes } from 'utils/array'

type ShowroomsState = {
    fetchState: FetchState
    showrooms: Showroom[]
    showroomsAB: Record<string, Showroom[]>
    roomType: Filterable<RoomType>
    furnishingType: Filterable<FurnishingType>
}

const initialState: ShowroomsState = {
    fetchState: STATE_NOMINAL,
    showrooms: [],
    showroomsAB: {},
    roomType: FILTER_TYPE_ALL,
    furnishingType: FILTER_TYPE_ALL,
}

export const slice = createSlice({
    name: 'showrooms',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(requestShowrooms, (state) => {
                state.fetchState = STATE_FETCHING
            })
            .addCase(receiveShowrooms, (state, action) => {
                state.showrooms = action.payload
                state.fetchState = STATE_NOMINAL
            })
            .addCase(failedReceiveShowrooms, (state) => {
                state.fetchState = STATE_ERROR
            })
            .addCase(filterShowrooms, (state, action) => {
                const roomType = action.payload.toUpperCase()
                state.roomType = includes(ROOM_TYPES, roomType) ? roomType : FILTER_TYPE_ALL
            })
            .addCase(filterFurnishingType, (state, action) => {
                const furnishingType = action.payload.toUpperCase()
                state.furnishingType = includes(FURNISHING_TYPES, furnishingType) ? furnishingType : FILTER_TYPE_ALL
            })
            .addCase(requestAlternateShowrooms, (state) => {
                state.fetchState = STATE_FETCHING
            })
            .addCase(receiveAlternateShowrooms, (state, action) => {
                state.showroomsAB = action.payload
                state.fetchState = STATE_NOMINAL
            })
            .addCase(failedReceiveAlternateShowrooms, (state) => {
                state.fetchState = STATE_ERROR
            })
    },
})
