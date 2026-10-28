import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type UpptackaState = {
    lastSavedUpptackaComposition: string | null
    showUpptackaDetailsView: boolean
    upptackaDetailsFurnitureId: number
    showUpptackaSummary: boolean
    showUpptackaSaveModal: boolean
    showUpptackaExitModal: boolean
    showUpptackaDesignTips: boolean
    sceneHasBeenInteractedWith: boolean
}

export const initialState: UpptackaState = {
    lastSavedUpptackaComposition: null,
    showUpptackaDetailsView: false,
    upptackaDetailsFurnitureId: -1,
    showUpptackaSummary: false,
    showUpptackaSaveModal: false,
    showUpptackaExitModal: false,
    showUpptackaDesignTips: false,
    sceneHasBeenInteractedWith: false,
}

export const upptackaSlice = createSlice({
    name: 'upptacka',
    initialState,
    reducers: {
        setLastSavedUpptackaComposition: (state, action: PayloadAction<string>) => {
            state.lastSavedUpptackaComposition = action.payload
            window.parent.postMessage(`upptacka_saved_composition=${action.payload}`, '*')
        },
        /**
         * Shows upptacka's furniture details panel.
         * @param {number} furnitureId - The id of the furniture to show details for.
         */
        showUpptackaDetailsView: (state, action: PayloadAction<number>) => {
            state.showUpptackaDetailsView = true
            state.upptackaDetailsFurnitureId = action.payload
        },
        hideUpptackaDetailsView: (state) => {
            state.showUpptackaDetailsView = false
        },
        setShowUpptackaSummary: (state, action: PayloadAction<boolean>) => {
            state.showUpptackaSummary = action.payload
        },
        setShowUpptackaSaveModal: (state, action: PayloadAction<boolean>) => {
            state.showUpptackaSaveModal = action.payload
        },
        setShowUpptackaExitModal: (state, action: PayloadAction<boolean>) => {
            state.showUpptackaExitModal = action.payload
        },
        setShowUpptackaDesignTips: (state, action: PayloadAction<boolean>) => {
            state.showUpptackaDesignTips = action.payload
        },
        setSceneHasBeenInteractedWith: (state) => {
            state.sceneHasBeenInteractedWith = true
        },
    },
})

export const upptackaActions = upptackaSlice.actions
