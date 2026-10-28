import React from 'react'
import classNames from 'classnames'
import { number, string, func, element, bool } from 'prop-types'

import SSRIcon from '@ingka/ssr-icon'
import starFilled from '@ingka/ssr-icon/paths/star-filled'
import star from '@ingka/ssr-icon/paths/star'

require('./StarRating.scss')

const StarRating = ({ max, name, value, iconChecked, iconUnchecked, onChange, children, highlightCurrentOnly }) => (
    <div className="StarRating">
        {[...Array(max).keys()].map((i) => {
            const key = i + 1
            const isCurrentValue = key === value
            const checked = highlightCurrentOnly ? isCurrentValue : key <= value
            return (
                <button
                    key={key}
                    className={classNames(`star num-${key}`, { checked })}
                    onClick={() =>
                        onChange({
                            target: {
                                name,
                                value: isCurrentValue ? 0 : key,
                            },
                        })
                    }
                >
                    {children || <SSRIcon paths={checked ? iconChecked || starFilled : iconUnchecked || star} />}
                </button>
            )
        })}
    </div>
)

StarRating.defaultProps = {
    max: 4,
    value: 0,
    iconChecked: null,
    iconUnchecked: null,
    children: null,
    highlightCurrentOnly: false,
}

StarRating.propTypes = {
    max: number,
    value: number,
    name: string.isRequired,
    iconUnchecked: string,
    iconChecked: string,
    onChange: func.isRequired,
    children: element,
    highlightCurrentOnly: bool,
}

export default StarRating
