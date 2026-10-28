import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export const hoverRenderItemIdSlice = createSlice({
    name: 'compositions/hoverRenderItemId',
    initialState: null as null | number,
    reducers: {
        hoverStart: (_, action: PayloadAction<number>) => action.payload,
        hoverEnd: () => null,
    },
})
