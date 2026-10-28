import * as types from 'models/actionTypes'
import { ProductTrackingInfo } from 'models/tracking/utils'
import { createAction } from '@reduxjs/toolkit'

export const requestFavorites = createAction(types.REQUEST_FAVORITES)

export const receiveFavorites = createAction<string[]>(types.RECEIVE_FAVORITES)

export const failedReceiveFavorites = createAction(types.FAILED_RECEIVE_FAVORITES)

export const toggleFavorite = createAction(
    types.TOGGLE_FAVORITE,
    (localItemNumber: string, isFavorite: boolean, trackingInfo: ProductTrackingInfo) => ({
        payload: {
            localItemNumber,
            isFavorite,
            trackingInfo,
        },
    }),
)

export const toggleFavorites = createAction(
    types.TOGGLE_FAVORITES,
    (itemsToFavorite: string[], isFavorite: boolean, trackingInfo = {}) => ({
        payload: { itemsToFavorite, isFavorite, trackingInfo },
    }),
)
