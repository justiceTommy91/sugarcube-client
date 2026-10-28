import React, { Component } from 'react'
import { string, func, bool } from 'prop-types'
import classNames from 'classnames'

require('./ActionButton.scss')

class ActionButton extends Component {
    constructor(props) {
        super(props)
        this.onClick = this.onClick.bind(this)
    }

    onClick(e) {
        if (this.props.onClick) {
            this.props.onClick(e)
        }
    }

    render() {
        const { active, children, disabled, type } = this.props
        return (
            <button
                type={type}
                className={classNames(`ActionButton ${type}`, { active, disabled })}
                onClick={this.onClick}
                disabled={disabled}
            >
                <div className="inner">{children}</div>
            </button>
        )
    }
}
ActionButton.defaultProps = {
    onClick: null,
    active: false,
    children: null,
    disabled: false,
    type: '',
}
ActionButton.propTypes = {
    onClick: func,
    active: bool,
    children: string,
    disabled: bool,
    type: string,
}

export default ActionButton
