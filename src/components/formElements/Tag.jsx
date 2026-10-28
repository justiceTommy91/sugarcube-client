import React from 'react'
import classNames from 'classnames'
import { func, bool, string } from 'prop-types'

const Tag = ({ name, children, value, onChange }) => (
    <button
        className={classNames('Tag', { checked: value > 0 })}
        onClick={() =>
            onChange({
                target: {
                    name,
                    value: !value,
                },
            })
        }
    >
        {children}
    </button>
)

Tag.defaultProps = {
    value: false,
}
Tag.propTypes = {
    name: string.isRequired,
    children: string.isRequired,
    value: bool,
    onChange: func.isRequired,
}

export default Tag
