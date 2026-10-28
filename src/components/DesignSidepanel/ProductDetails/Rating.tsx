import React from 'react'
import { useTranslation } from 'react-i18next'

import SSRIcon from '@ingka/ssr-icon'
import starFilledIcon from '@ingka/ssr-icon/paths/star-filled'
import starHalfFilledIcon from '@ingka/ssr-icon/paths/star-half-filled'

require('./Rating.scss')

export type RatingProps = {
    rating: number
}

export const Rating = ({ rating }: RatingProps): React.ReactElement => {
    const { t } = useTranslation()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const starIcons: React.ReactElement[] = []
    for (let i = 1; i <= 5; i += 1) {
        if (rating < i - 0.5) {
            // eslint-disable-next-line i18next/no-literal-string
            starIcons.push(<SSRIcon key={i} className="Rating__star Rating__star_empty" paths={starFilledIcon} />)
        } else if (rating < i) {
            starIcons.push(<SSRIcon key={i} className="Rating__star" paths={starHalfFilledIcon} />)
        } else {
            starIcons.push(<SSRIcon key={i} className="Rating__star" paths={starFilledIcon} />)
        }
    }

    // ACCESSIBILITY: Add role="img" and aria-label for screen readers
    const ariaLabel = t('aria.rating', { rating: rating.toFixed(1), maxRating: 5 })

    return (
        <div className="Rating" role="img" aria-label={ariaLabel}>
            {starIcons}
        </div>
    )
}
