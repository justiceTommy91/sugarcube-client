import React from 'react'
import { useTranslation } from 'react-i18next'

import SSRIcon from '@ingka/ssr-icon'
import star from '@ingka/ssr-icon/paths/star'
import starFilled from '@ingka/ssr-icon/paths/star-filled'
import starHalfFilled from '@ingka/ssr-icon/paths/star-half-filled'
import { string, number } from 'prop-types'

require('./StarRatings.scss')

const STAR_FILLED_SVG = starFilled
const STAR_HALF_FILLED_SVG = starHalfFilled
const STAR_EMPTY_SVG = star
const STAR_RATING_MAX_VALUE = 5

// This function returns an array of icon svg codes, given
//     value: string value of a number between 0.0 to maxValue
//     maxValue: number of maximum stars
// This function rounds up the ratings like ikea.
// Ex: 4.2 -> 4 and a half stars, 4.8 -> 5 stars

// TODO: put this helper function in another file and unit test
const getStarIconArray = (value, maxValue) => {
    const resultArray = []
    const valueNumber = parseFloat(value)
    if (!maxValue || Number.isNaN(valueNumber)) {
        return resultArray
    }
    const fullStarsIndex = Math.round(valueNumber)
    const decimalPart = valueNumber - Math.floor(valueNumber)

    const needsHalfStar = decimalPart > 0 && decimalPart < 0.5

    for (let i = 1; i <= maxValue; i += 1) {
        if (i <= fullStarsIndex) {
            resultArray.push(STAR_FILLED_SVG)
        } else if (i === fullStarsIndex + 1 && needsHalfStar) {
            resultArray.push(STAR_HALF_FILLED_SVG)
        } else {
            resultArray.push(STAR_EMPTY_SVG)
        }
    }
    return resultArray
}

const StarRatings = ({ value, count }) => {
    const { t } = useTranslation()
    const starIconArray = getStarIconArray(value, STAR_RATING_MAX_VALUE)
    const ariaLabelText = t('aria.star-rating', { rating: value, maxRating: STAR_RATING_MAX_VALUE })

    if (!starIconArray.length) {
        return null
    }
    return (
        <div className="StarRatings" role="img" aria-label={ariaLabelText}>
            <span className="stars" aria-hidden="true">
                {starIconArray.map((starIconCode, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <span key={`StarRatings-${starIconCode}-${index}`}>
                        <SSRIcon paths={starIconCode} />
                    </span>
                ))}
            </span>

            {count && <span className="reviewCount">{count}</span>}
        </div>
    )
}
StarRatings.defaultProps = {
    count: null,
}

StarRatings.propTypes = {
    value: string.isRequired,
    count: number,
}
export default StarRatings
