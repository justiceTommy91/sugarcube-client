import React from 'react'

type DesignIconButtonProps = {
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export const DesignIconButton: React.FunctionComponent<DesignIconButtonProps> = (props) => {
    const { onClick, children, ...rest } = props

    const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.currentTarget.blur()
        if (onClick) {
            onClick(e)
        }
    }

    return (
        <button {...rest} onClick={handleClick}>
            {children}
        </button>
    )
}
