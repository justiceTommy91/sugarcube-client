import React, { SVGProps } from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import chevronDown from '@ingka/ssr-icon/paths/chevron-down'

interface ToolbarLinkProps {
    active?: boolean
    small?: boolean
    className?: string
    icon?: ((prefix?: string | undefined) => SVGProps<SVGElement>[]) | undefined
    label?: string
    tooltipLabel?: string
    toolTipData?: string
    onClick: () => void
    dropdown?: boolean
    children?: React.ReactNode
    role?: string
    id?: string
    href?: string
    openInNewTab?: boolean
}

const ToolbarLink = ({
    active,
    small,
    className,
    icon,
    label,
    tooltipLabel,
    toolTipData,
    onClick,
    dropdown,
    children,
    role,
    id,
    href,
    openInNewTab,
}: ToolbarLinkProps) => (
    <a
        className={classNames(`toggleButton ${className}`, {
            active,
            small,
        })}
        onClick={onClick}
        type="primary"
        data-tip={tooltipLabel}
        data-for={toolTipData}
        role={role}
        id={id}
        href={href}
        target={openInNewTab ? '_blank' : '_self'}
        rel="noreferrer"
    >
        <SSRIcon paths={icon} className="button-icon" />
        {label?.trim()}
        {dropdown && <SSRIcon paths={chevronDown} className="chevron" />}
        {children}
    </a>
)

export default ToolbarLink
