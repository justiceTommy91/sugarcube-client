import { createSlice } from '@reduxjs/toolkit'
import * as ratingTypes from 'models/ratings/constants'
import { Rating, RatingOption } from '.'
import { receiveRating, receiveRatings, receiveRatingOptions, submitRating, requestRatings } from './actions'

type RatingsState = {
    isFetching: boolean
    ratingsByJobId: Record<string, Record<number, Rating>>
    options: RatingOption[] | null
}

const initialState: RatingsState = {
    isFetching: false,
    ratingsByJobId: {},
    options: null,
}

const processServerRating = (rating: Rating) => ({
    [rating.ratingTag]: {
        ...rating,
    },
})

export const slice = createSlice({
    name: 'ratings',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(requestRatings, (state) => {
                state.isFetching = true
            })
            .addCase(receiveRating, (state, action) => {
                const { rating, jobId } = action.payload
                state.isFetching = false

                if (Object.keys(rating).length) {
                    state.ratingsByJobId[jobId] = {
                        ...state.ratingsByJobId[jobId],
                        ...processServerRating(rating),
                    }
                }
            })
            .addCase(receiveRatings, (state, action) => {
                const { jobId } = action.payload
                state.isFetching = false

                const ratings = [...action.payload.ratings]
                ratings.sort((a, b) => a.id - b.id)
                state.ratingsByJobId = {
                    [jobId]: Object.assign({}, state.ratingsByJobId[jobId], ...ratings.map(processServerRating)),
                }
            })
            .addCase(receiveRatingOptions, (state, action) => {
                const ops = [...action.payload.options]
                ops.sort((a, b) => a.position - b.position)
                state.options = ops
            })
            .addCase(submitRating, (state, action) => {
                const { jobId, kind, tagId, value, note } = action.payload
                state.isFetching = true

                if (
                    (kind === ratingTypes.RATING && !value) ||
                    (kind === ratingTypes.SEVERITY && !value) ||
                    (kind === ratingTypes.NOTE && !note) ||
                    (kind === ratingTypes.TAG && !value)
                ) {
                    delete state.ratingsByJobId[jobId][tagId]
                } else {
                    const rating = state.ratingsByJobId[jobId]?.[tagId]

                    state.ratingsByJobId[jobId] = {
                        ...state.ratingsByJobId[jobId],
                        [tagId]: {
                            ...rating,
                            value,
                            note,
                            job: jobId,
                            ratingTag: tagId,
                        },
                    }
                }
            })
    },
})
