import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { func, bool } from 'prop-types'

import { ratingType, sceneType, ratingOptionsType } from 'models/propTypes'
import * as ratingTypes from 'models/ratings/constants'
import { getRatingForSelectedScene, getIsFetching, getRatingOptions } from 'models/ratings/selectors'
import { getSelectedScene } from 'models/compositions/selectors'
import { requestRatings, submitRating, requestRatingOptions } from 'models/ratings/actions'
import { NEW_SCENE_ID } from 'models/scenes/constants'

import RatingPanelView from './RatingPanelView'

const RatingPanelViewContainer = ({ rating, options, scene, submit, fetchRatings, fetchRatingOptions, isFetching }) => {
    const onChange = (e, tagId, kind) => {
        if (scene) {
            const value = kind !== ratingTypes.NOTE ? e.target.value : null
            const note = kind === ratingTypes.NOTE ? e.target.value : null
            const id = rating[tagId] && rating[tagId].id

            if (!value && !note && !id) {
                // If no value and no id then we can't delete
                return
            }

            submit(scene.jobId, tagId, id, kind, value, note)
        }
    }
    useEffect(() => {
        if (scene && scene.sceneId !== NEW_SCENE_ID) {
            fetchRatings(scene.jobId)
        }
        if (!options) {
            fetchRatingOptions()
        }
    }, [scene])

    return (
        <RatingPanelView
            rating={rating}
            options={scene && scene.jobId && options}
            onChange={onChange}
            isFetching={isFetching}
        />
    )
}

RatingPanelViewContainer.defaultProps = {
    rating: {},
    scene: null,
    options: null,
}

RatingPanelViewContainer.propTypes = {
    rating: ratingType,
    options: ratingOptionsType,
    scene: sceneType,
    submit: func.isRequired,
    fetchRatings: func.isRequired,
    fetchRatingOptions: func.isRequired,
    isFetching: bool.isRequired,
}

const mapStateToProps = (state) => ({
    rating: getRatingForSelectedScene(state),
    scene: getSelectedScene(state),
    isFetching: getIsFetching(state),
    options: getRatingOptions(state),
})

const mapDispatchToProps = (dispatch) => ({
    submit: (...args) => dispatch(submitRating(...args)),
    fetchRatings: (jobId) => dispatch(requestRatings(jobId)),
    fetchRatingOptions: () => dispatch(requestRatingOptions()),
})

export default connect(mapStateToProps, mapDispatchToProps)(RatingPanelViewContainer)
