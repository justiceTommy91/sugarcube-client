import React from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import starIcon from '@ingka/ssr-icon/paths/star-filled'

require('./StarRating.scss')

export type StarRatingProps = {
    rating: number
    showText?: boolean
}

/**
 * A star rating display component that shows filled/empty stars based on rating value.
 *
 * @param rating - The rating value (1-5)
 * @param showText - Whether to show the numeric rating text next to stars
 */
export const StarRating = ({ rating, showText = true }: StarRatingProps): React.ReactElement => (
    <div className="StarRating">
        {[1, 2, 3, 4, 5].map((star) => (
            <SSRIcon
                key={star}
                paths={starIcon}
                className={classNames('StarRating__star', {
                    'StarRating__star--filled': star <= rating,
                    'StarRating__star--empty': star > rating,
                })}
            />
        ))}
        {showText && <span className="StarRating__text">{rating}</span>}
    </div>
)
