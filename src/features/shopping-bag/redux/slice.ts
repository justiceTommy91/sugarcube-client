/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit'
import {
    addRoomToBag,
    addToBag,
    addToBagRequest,
    addToBagSuccess,
    addToBagFailure,
    addRoomToBagRequest,
    addRoomToBagSuccess,
    addRoomToBagFailure,
    clearAddedProductId,
    clearRoomAdded,
} from './actions'

type BagState = {
    hasAddedSomethingToBag: boolean
    isAddingToCart: boolean
    addingProductId: number | null
    addingProductSource: string | null
    addingItemUniqueId: string | number | null
    addedProductId: number | null
    addedProductSource: string | null
    addedItemUniqueId: string | number | null
    isRoomAdded: boolean
}

const initialState: BagState = {
    hasAddedSomethingToBag: false,
    isAddingToCart: false,
    addingProductId: null,
    addingProductSource: null,
    addingItemUniqueId: null,
    addedProductId: null,
    addedProductSource: null,
    addedItemUniqueId: null,
    isRoomAdded: false,
}

export const slice = createSlice({
    name: 'bag',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(addToBag, (state) => {
                state.hasAddedSomethingToBag = true
            })
            .addCase(addRoomToBag, (state) => {
                state.hasAddedSomethingToBag = true
            })
            // Loading states for single item add
            .addCase(addToBagRequest, (state, action) => {
                state.addingProductId = action.payload.productId
                state.addingProductSource = action.payload.source ?? null
                state.addingItemUniqueId = action.payload.uniqueId ?? null
                // Clear added state when starting a new add request
                if (
                    state.addedProductId === action.payload.productId &&
                    state.addedProductSource === action.payload.source &&
                    state.addedItemUniqueId === action.payload.uniqueId
                ) {
                    state.addedProductId = null
                    state.addedProductSource = null
                    state.addedItemUniqueId = null
                }
            })
            .addCase(addToBagSuccess, (state, action) => {
                state.addedProductId = action.payload?.productId ?? state.addingProductId
                state.addedProductSource = action.payload?.source ?? state.addingProductSource
                state.addedItemUniqueId = action.payload?.uniqueId ?? state.addingItemUniqueId
                state.addingProductId = null
                state.addingProductSource = null
                state.addingItemUniqueId = null
            })
            .addCase(addToBagFailure, (state) => {
                state.addingProductId = null
                state.addingProductSource = null
                state.addingItemUniqueId = null
            })
            // Loading states for multiple items add
            .addCase(addRoomToBagRequest, (state) => {
                state.isAddingToCart = true
                // Clear added state when starting a new add request
                state.isRoomAdded = false
            })
            .addCase(addRoomToBagSuccess, (state) => {
                state.isAddingToCart = false
                state.isRoomAdded = true
            })
            .addCase(addRoomToBagFailure, (state) => {
                state.isAddingToCart = false
            })
            .addCase(clearAddedProductId, (state) => {
                state.addedProductId = null
                state.addedProductSource = null
                state.addedItemUniqueId = null
            })
            .addCase(clearRoomAdded, (state) => {
                state.isRoomAdded = false
            })
    },
})
