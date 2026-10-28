import React, { useCallback } from 'react'
import { number, bool, func, element, string, oneOfType } from 'prop-types'

import classNames from 'classnames'

require('./Range.scss')

const Range = React.forwardRef((props, ref) => {
    const { min, max, step, value, onChange, onMouseDown, unit, sideLabel, onKeyDown, disabled } = props
    const change = useCallback(
        (e) => {
            onChange(parseFloat(e.target.value, 10))
        },
        [onChange],
    )

    return (
        <div className={classNames('Range', { sideLabel })}>
            <div className="indicator">
                {value}
                {unit}
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={change}
                onMouseDown={onMouseDown}
                tabIndex={-1}
                onKeyDown={onKeyDown}
                ref={ref}
                disabled={disabled}
            />
        </div>
    )
})

Range.defaultProps = {
    onMouseDown: null,
    unit: null,
    sideLabel: false,
    onKeyDown: null,
    disabled: false,
}

Range.propTypes = {
    min: number.isRequired,
    max: number.isRequired,
    step: number.isRequired,
    value: number.isRequired,
    onChange: func.isRequired,
    onMouseDown: func,
    onKeyDown: func,
    unit: oneOfType([element, string]),
    sideLabel: bool,
    disabled: bool,
}

export default Range
