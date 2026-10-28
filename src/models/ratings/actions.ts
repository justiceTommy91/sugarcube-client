import { createAction } from '@reduxjs/toolkit'
import * as types from 'models/actionTypes'
import type { Rating, RatingOption } from './index'

export const requestRatings = createAction(types.REQUEST_RATINGS, (jobId: string) => ({
    payload: {
        jobId,
    },
}))

export const receiveRating = createAction(types.RECEIVE_RATING, (jobId: string, rating: Rating) => ({
    payload: {
        jobId,
        rating,
    },
}))

export const receiveRatings = createAction(types.RECEIVE_RATINGS, (jobId: string, ratings: Rating[]) => ({
    payload: {
        jobId,
        ratings,
    },
}))

export const requestRatingOptions = createAction(types.REQUEST_RATING_OPTIONS)

export const receiveRatingOptions = createAction(types.RECEIVE_RATING_OPTIONS, (options: RatingOption[]) => ({
    payload: {
        options,
    },
}))

export const submitRating = createAction(
    types.SUBMIT_RATING,
    (jobId: string, tagId: number, id: number, kind: string, value: number, note: string) => ({
        payload: {
            jobId,
            tagId,
            id,
            kind,
            value,
            note,
        },
    }),
)
export { Rating }
