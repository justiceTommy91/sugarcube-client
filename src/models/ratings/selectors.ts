import { createSelector } from 'reselect'

import { getSelectedScene } from 'models/compositions/selectors'
import { RootState } from 'store'
import { Scene } from 'models/scenes'

export const getIsFetching = (state: RootState) => state.ratings.isFetching
export const getRatingsByJobId = (state: RootState) => state.ratings.ratingsByJobId
export const getRatingOptions = (state: RootState) => state.ratings.options

export const getRatingForSelectedScene = createSelector(
    [getRatingsByJobId, getSelectedScene],
    (ratingsByJobId, selectedScene: Scene) => {
        if (!selectedScene) {
            return {}
        }
        return ratingsByJobId[selectedScene.jobId] || {}
    },
)
