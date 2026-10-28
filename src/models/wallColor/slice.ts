import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type WallColorState = {
    groupId: string | null
    colorIndex: number | null
}

const initialState: WallColorState = {
    groupId: null,
    colorIndex: null,
}

export const wallColorSlice = createSlice({
    name: 'wallColor',
    initialState,
    reducers: {
        setSelectedWallColor: (state, action: PayloadAction<{ groupId: string; colorIndex: number }>) => {
            state.groupId = action.payload.groupId
            state.colorIndex = action.payload.colorIndex
        },
        clearSelectedWallColor: (state) => {
            state.groupId = null
            state.colorIndex = null
        },
    },
})

export const { setSelectedWallColor, clearSelectedWallColor } = wallColorSlice.actions
