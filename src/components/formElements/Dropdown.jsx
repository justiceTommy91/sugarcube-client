/**
 * LegacyDropdown - Legacy class-based dropdown component used exclusively in admin/debug panels.
 */
import React, { Component } from 'react'
import { string, func } from 'prop-types'
import classNames from 'classnames'

import { dropdownOptionsType, dropdownOptionKeyType } from 'models/propTypes'

import chevronUpSmall from '@ingka/ssr-icon/paths/chevron-up-small'
import chevronDownSmall from '@ingka/ssr-icon/paths/chevron-down-small'
import SSRIcon from '@ingka/ssr-icon'

require('./Dropdown.scss')

class Dropdown extends Component {
    constructor(props) {
        super(props)
        this.toggleOpen = this.toggleOpen.bind(this)
        this.onChange = this.onChange.bind(this)
        this.close = this.close.bind(this)

        this.state = {
            open: false,
        }
    }

    onChange(e, item) {
        const event = e
        event.target = {
            name: this.props.name,
            value: item.key,
        }

        this.toggleOpen()
        this.props.onChange(event)
    }

    close() {
        document.removeEventListener('click', this.close)
        this.setState({ open: false })
    }

    toggleOpen() {
        const isOpen = this.state.open
        this.setState({ open: !isOpen }, () => {
            if (this.state.open) {
                const timeoutId = window.setTimeout(() => {
                    document.addEventListener('click', this.close)
                    window.clearTimeout(timeoutId)
                }, 100)
            }
        })
    }

    render() {
        const { value, options, placeholder } = this.props
        const { open } = this.state
        const selectedItem = options.find((item) => item.key === value)
        const offDefault = value !== options[0].key
        return (
            <div className={classNames('LegacyDropdown', { expanded: open, offDefault })}>
                <div className="selectedItem" onClick={this.toggleOpen}>
                    <div className="value">{(selectedItem && selectedItem.label) || placeholder}</div>
                    <SSRIcon paths={open ? chevronUpSmall : chevronDownSmall} />
                </div>
                <div className={classNames('items', { open })}>
                    {options.map((item) => (
                        <div
                            key={item.key}
                            className={classNames('item', { selected: item.key === value })}
                            onClick={(e) => this.onChange(e, item)}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>
        )
    }
}

Dropdown.defaultProps = {
    placeholder: '',
}

Dropdown.propTypes = {
    value: dropdownOptionKeyType.isRequired,
    options: dropdownOptionsType.isRequired,
    onChange: func.isRequired,
    placeholder: string,
    name: string.isRequired,
}

export default Dropdown
