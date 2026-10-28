import React, { Component } from 'react'
import classNames from 'classnames'
import { string, func, oneOfType, number, bool } from 'prop-types'
import { withPrefix } from 'gatsby'

require('./Icon.scss')

class Icon extends Component {
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
        const { code, label, className, onClick, svg } = this.props
        const toggledClassnames = {
            label,
            onClick,
            svg,
        }

        return (
            <div className={classNames('Icon', toggledClassnames, className)} data-label={label} onClick={this.onClick}>
                <img src={withPrefix(`images/icons/${code}.svg`)} alt={label} draggable={false} />
            </div>
        )
    }
}
Icon.defaultProps = {
    onClick: null,
    label: null,
    className: null,
    svg: false,
}
Icon.propTypes = {
    code: string.isRequired,
    onClick: func,
    label: oneOfType([string, number]),
    className: string,
    svg: bool,
}

export default Icon
