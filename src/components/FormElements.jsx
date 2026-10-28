import React, { useEffect, useRef } from 'react'
import { string, func, bool, oneOfType, number } from 'prop-types'
import classNames from 'classnames'

require('./FormElements.scss')

export const Input = ({
    type,
    placeholder,
    onFocus,
    onBlur,
    value,
    onChange,
    name,
    disabled,
    onKeyDown,
    autoFocus,
    autoSelect,
    step,
    className,
    error,
    ...props
}) => {
    const inputRef = useRef()
    useEffect(() => {
        if (autoSelect) {
            inputRef.current.setSelectionRange(0, inputRef.current.value.length)
        }
    }, [])
    return (
        <div className={classNames('Input', className)}>
            <input
                ref={inputRef}
                type={type}
                placeholder={placeholder}
                onFocus={onFocus}
                onBlur={onBlur}
                value={value}
                onChange={onChange}
                name={name}
                disabled={disabled}
                onKeyDown={onKeyDown}
                autoFocus={autoFocus}
                step={step}
                {...props}
            />
            {error && <div className="Input__error">{error}</div>}
        </div>
    )
}
Input.defaultProps = {
    placeholder: '',
    onFocus: null,
    onBlur: null,
    value: null,
    name: null,
    disabled: false,
    onKeyDown: null,
    autoFocus: false,
    autoSelect: false,
    step: 1,
    className: '',
    error: '',
}
Input.propTypes = {
    type: string.isRequired,
    placeholder: string,
    onFocus: func,
    onBlur: func,
    value: oneOfType([string, number]),
    onChange: func.isRequired,
    onKeyDown: func,
    name: string,
    disabled: bool,
    autoFocus: bool,
    autoSelect: bool,
    step: number,
    className: string,
    error: string,
}

export const Checkbox = ({ name, label, onChange }) => (
    <div className="Checkbox">
        <div className="checkboxContents">
            <input type="checkbox" name={name} onChange={onChange} />
            {label ? <span className="label">{label}</span> : null}
        </div>
    </div>
)
Checkbox.defaultProps = {
    name: '',
    label: '',
}
Checkbox.propTypes = {
    name: string,
    label: string,
    onChange: func.isRequired,
}
