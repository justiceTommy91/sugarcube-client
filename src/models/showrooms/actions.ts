import { createAction } from '@reduxjs/toolkit'
import type { Showroom } from 'models/showrooms'
import * as types from 'models/actionTypes'
import { getShowroomsByTag, getDashboardShowrooms } from 'services/showrooms'
import type { AppDispatch } from 'store'
import { TAGS } from './constants'

export const requestShowrooms = createAction(types.REQUEST_SHOWROOMS)
export const receiveShowrooms = createAction<Showroom[]>(types.RECEIVE_SHOWROOMS)
export const failedReceiveShowrooms = createAction(types.FAILED_RECEIVE_SHOWROOMS)

export const requestAlternateShowrooms = createAction(types.REQUEST_ALTERNATE_SHOWROOMS)
export const receiveAlternateShowrooms = createAction<Record<string, Showroom[]>>(types.RECEIVE_ALTERNATE_SHOWROOMS)
export const failedReceiveAlternateShowrooms = createAction(types.FAILED_RECEIVE_ALTERNATE_SHOWROOMS)

export const filterShowrooms = createAction<string>(types.FILTER_SHOWROOMS)
export const filterFurnishingType = createAction<string>(types.FILTER_FURNISHING_TYPE)

export const fetchShowrooms = () => async (dispatch: AppDispatch) => {
    dispatch(requestShowrooms())

    return Promise.all([getDashboardShowrooms()])
        .then(([{ data: showroomsData }]) => {
            dispatch(receiveShowrooms(showroomsData))
        })
        .catch(() => {
            dispatch(failedReceiveShowrooms())
        })
}

export const fetchAlternateShowrooms = () => async (dispatch: AppDispatch) => {
    dispatch(requestAlternateShowrooms())

    return Promise.all([getShowroomsByTag(TAGS.SHOWROOM_AB), getShowroomsByTag(TAGS.SHOWROOM_AB_V2)])
        .then(([{ data: showroomsData }, { data: showroomsDataV2 }]) => {
            dispatch(
                receiveAlternateShowrooms({
                    [TAGS.SHOWROOM_AB]: showroomsData,
                    [TAGS.SHOWROOM_AB_V2]: showroomsDataV2,
                }),
            )
        })
        .catch(() => {
            dispatch(failedReceiveAlternateShowrooms())
        })
}
