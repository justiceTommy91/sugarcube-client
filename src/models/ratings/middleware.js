import * as types from 'models/actionTypes'
import { receiveRating, receiveRatings, receiveRatingOptions } from 'models/ratings/actions'
import * as ratingApi from 'services/rating'

const ratingMiddleware = (store) => (next) => (action) => {
    switch (action.type) {
        case types.REQUEST_RATING_OPTIONS:
            ratingApi.getRatingOptions().then(({ data: options }) => store.dispatch(receiveRatingOptions(options)))
            return next(action)
        case types.REQUEST_RATINGS: {
            const { jobId } = action.payload
            ratingApi
                .getRatingById(jobId)
                .then(({ data }) => store.dispatch(receiveRatings(action.payload.jobId, data)))
            return next(action)
        }

        case types.SUBMIT_RATING: {
            ratingApi
                .saveRating(action.payload)
                .then(({ data }) => store.dispatch(receiveRating(action.payload.jobId, data)))
            return next(action)
        }
        default:
            return next(action)
    }
}

export default ratingMiddleware
