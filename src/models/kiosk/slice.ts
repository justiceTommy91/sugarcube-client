import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { RoomType } from 'models/kiosk/constants'

type KioskState = {
    kioskSelectedRoomType: RoomType | null
    isKioskIntroViewed: boolean
}

export const initialState: KioskState = {
    kioskSelectedRoomType: null,
    isKioskIntroViewed: false,
}

export const kioskSlice = createSlice({
    name: 'kiosk',
    initialState,
    reducers: {
        selectKioskRoomType: (state, action: PayloadAction<RoomType>) => {
            state.kioskSelectedRoomType = action.payload
        },
        setKioskIntroViewed: (state) => {
            state.isKioskIntroViewed = true
        },
    },
})

export const { selectKioskRoomType, setKioskIntroViewed } = kioskSlice.actions
