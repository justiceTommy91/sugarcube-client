import { createAction } from '@reduxjs/toolkit'

import type { ProductList, ProductTrackingInfo } from 'models/tracking/utils'

const ADD_TO_BAG = 'ADD_TO_BAG'
const ADD_TO_BAG_REQUEST = 'ADD_TO_BAG_REQUEST'
const ADD_TO_BAG_SUCCESS = 'ADD_TO_BAG_SUCCESS'
const ADD_TO_BAG_FAILURE = 'ADD_TO_BAG_FAILURE'
const ADD_ROOM_TO_BAG = 'ADD_ROOM_TO_BAG'
const ADD_ROOM_TO_BAG_REQUEST = 'ADD_ROOM_TO_BAG_REQUEST'
const ADD_ROOM_TO_BAG_SUCCESS = 'ADD_ROOM_TO_BAG_SUCCESS'
const ADD_ROOM_TO_BAG_FAILURE = 'ADD_ROOM_TO_BAG_FAILURE'
const ADD_ROOM_TO_BAG_WITH_RETRY = 'ADD_ROOM_TO_BAG_WITH_RETRY'
const OPEN_BAG = 'OPEN_BAG'
const CLEAR_ADDED_PRODUCT_ID = 'CLEAR_ADDED_PRODUCT_ID'
const CLEAR_ROOM_ADDED = 'CLEAR_ROOM_ADDED'
export const actionTypes = {
    ADD_TO_BAG,
    ADD_TO_BAG_REQUEST,
    ADD_TO_BAG_SUCCESS,
    ADD_TO_BAG_FAILURE,
    ADD_ROOM_TO_BAG,
    ADD_ROOM_TO_BAG_REQUEST,
    ADD_ROOM_TO_BAG_SUCCESS,
    ADD_ROOM_TO_BAG_FAILURE,
    ADD_ROOM_TO_BAG_WITH_RETRY,
    OPEN_BAG,
    CLEAR_ADDED_PRODUCT_ID,
    CLEAR_ROOM_ADDED,
}

export const addToBag = createAction(
    actionTypes.ADD_TO_BAG,
    (
        furnitureId: number,
        trackingInfo: ProductTrackingInfo,
        source?: string,
        hideToast?: boolean,
        uniqueId?: string | number,
    ) => ({
        payload: {
            furnitureId,
            trackingInfo,
            source,
            hideToast,
            uniqueId,
        },
    }),
)
// TODO: This action should be renamed to addItemsToBag
export const addRoomToBag = createAction(
    actionTypes.ADD_ROOM_TO_BAG,
    (
        localItemNumbers: string[],
        region: string | null,
        trackingInfo: ProductList,
        blockRedirect = false,
        hideToast = false,
    ) => ({
        payload: {
            localItemNumbers,
            region,
            trackingInfo,
            blockRedirect,
            hideToast,
        },
    }),
)
export const openBag = createAction(actionTypes.OPEN_BAG)

// Internal actions for managing loading state
export const addToBagRequest = createAction(
    actionTypes.ADD_TO_BAG_REQUEST,
    (productId: number, source?: string, uniqueId?: string | number) => ({
        payload: { productId, source, uniqueId },
    }),
)
export const addToBagSuccess = createAction(
    actionTypes.ADD_TO_BAG_SUCCESS,
    (productId: number, source?: string, uniqueId?: string | number) => ({
        payload: { productId, source, uniqueId },
    }),
)
export const addToBagFailure = createAction(actionTypes.ADD_TO_BAG_FAILURE)
export const clearAddedProductId = createAction(actionTypes.CLEAR_ADDED_PRODUCT_ID)
export const clearRoomAdded = createAction(actionTypes.CLEAR_ROOM_ADDED)
export const addRoomToBagRequest = createAction(actionTypes.ADD_ROOM_TO_BAG_REQUEST)
export const addRoomToBagSuccess = createAction(actionTypes.ADD_ROOM_TO_BAG_SUCCESS)
export const addRoomToBagFailure = createAction(actionTypes.ADD_ROOM_TO_BAG_FAILURE)
