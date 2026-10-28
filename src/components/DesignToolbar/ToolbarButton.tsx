import React, { SVGProps } from 'react'
import Button from '@ingka/button'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import chevronDown from '@ingka/ssr-icon/paths/chevron-down'

interface ToolbarButtonProps {
    active?: boolean
    small?: boolean
    size?: 'small' | 'xsmall' | 'medium' | undefined
    disabled?: boolean
    className?: string
    icon?: ((prefix?: string | undefined) => SVGProps<SVGElement>[]) | undefined
    label?: string
    onClick: () => void
    dropdown?: boolean
    children?: React.ReactNode
    role?: string
    id?: string
}

const ToolbarButton = ({
    active,
    small,
    size,
    disabled,
    className,
    icon,
    label,
    onClick,
    dropdown,
    children,
    role,
    id,
}: ToolbarButtonProps) => (
    <Button
        className={classNames(`toggleButton ${className}`, {
            active,
            small,
        })}
        onClick={onClick}
        type="primary"
        disabled={disabled}
        size={size}
        inverseTheme
        role={role}
        id={id}
    >
        <SSRIcon paths={icon} className="button-icon" />
        {label?.trim()}
        {dropdown && <SSRIcon paths={chevronDown} className="chevron" />}
        {children}
    </Button>
)

export default ToolbarButton
