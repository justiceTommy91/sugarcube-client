import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import type { Status } from 'models/support'

type SupportState = {
    hasOutage: boolean
    messagesByLanguage: Record<string, string>
}

export const initialState: SupportState = {
    hasOutage: false,
    messagesByLanguage: {},
}

export const supportSlice = createSlice({
    name: 'support',
    initialState,
    reducers: {
        receiveStatus: (state, action: PayloadAction<Status>) => {
            state.hasOutage = action.payload.outage
            state.messagesByLanguage = action.payload.messagesByLanguage
        },
        failedReceiveStatus: (state) => {
            state.hasOutage = true
            state.messagesByLanguage = {}
        },
    },
})

export const { receiveStatus, failedReceiveStatus } = supportSlice.actions
