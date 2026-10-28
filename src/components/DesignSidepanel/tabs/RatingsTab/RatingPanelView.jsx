/* eslint-disable i18next/no-literal-string */
import React from 'react'
import { func, bool } from 'prop-types'

import { ratingType, ratingOptionsType } from 'models/propTypes'
import * as ratingTypes from 'models/ratings/constants'

import StarRating from 'components/formElements/StarRating'
import Textarea from 'components/formElements/Textarea'
import Icon from 'components/uiElements/Icon'

require('./RatingPanelView.scss')

const RatingPanelView = ({ onChange, rating, options, isFetching }) => {
    const getVal = (tagId, kind) => {
        if (!rating[tagId]) {
            return null
        }
        if (kind === ratingTypes.NOTE) {
            return rating[tagId].note
        }
        return rating[tagId].value
    }

    return (
        <div className="RatingPanel">
            <div className="ratingsHeader">
                <h3>Capture Score {isFetching ? <Icon className="loading" code="loading" svg /> : null}</h3>
                <h5>Stars go from 1=Terrible, 2=Borderline, 3=Acceptable, 4=Excellent</h5>
                <h5>Severity goes from Low=subtle, Med=noticeable, High=problematic</h5>
            </div>
            <div className="ratings">
                {options ? (
                    options.map((option) => {
                        let ratingElement = null
                        switch (option.kind) {
                            case ratingTypes.RATING:
                                ratingElement = (
                                    <StarRating
                                        name={option.name}
                                        value={getVal(option.id, option.kind)}
                                        onChange={(e) => onChange(e, option.id, option.kind)}
                                    />
                                )
                                break
                            case ratingTypes.SEVERITY:
                                ratingElement = (
                                    <StarRating
                                        name={option.name}
                                        value={getVal(option.id, option.kind)}
                                        onChange={(e) => onChange(e, option.id, option.kind)}
                                        max={3}
                                        highlightCurrentOnly
                                    >
                                        <span />
                                    </StarRating>
                                )
                                break
                            case ratingTypes.NOTE:
                                ratingElement = (
                                    <Textarea
                                        placeholder="Add notes, comments, etc."
                                        value={getVal(option.id, option.kind)}
                                        name={option.name}
                                        onChange={(e) => onChange(e, option.id, option.kind)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        debounce={500}
                                    />
                                )
                                break
                            default:
                                break
                        }
                        return (
                            <div className={`rating ${option.kind}`} key={option.name}>
                                <span className="optionName">{option.name}</span>
                                {ratingElement}
                            </div>
                        )
                    })
                ) : (
                    <div className="loading">Loading...</div>
                )}
            </div>
        </div>
    )
}

RatingPanelView.defaultProps = {
    options: null,
}

RatingPanelView.propTypes = {
    rating: ratingType.isRequired,
    options: ratingOptionsType,
    onChange: func.isRequired,
    isFetching: bool.isRequired,
}

export default RatingPanelView
