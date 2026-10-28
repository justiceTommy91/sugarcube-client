import React from 'react'

import './ArtOptionsGroup.scss'
import { useAriaRadioGroup } from 'hooks/aria/useAriaRadioGroup'

export type ArtOptionsGroupProps<T extends string | number> = {
    title: string
    description: string
    options: { label: string; value: T }[]
    value: T
    onChange(option: T): void
    children(option: T): React.ReactNode
}

export const ArtOptionsGroup = <T extends string | number>({
    title,
    description,
    options,
    value,
    onChange,
    children,
}: ArtOptionsGroupProps<T>): React.ReactElement => {
    const titleId = React.useId()
    const { radioGroupProps, radioProps } = useAriaRadioGroup({
        options: options.map((opt) => opt.value),
        onChange,
        value,
        'aria-labelledby': titleId,
    })
    return (
        <div className="ArtOptionsGroup">
            <div className="ArtOptionsGroup__header">
                <div className="ArtOptionsGroup__title" id={titleId}>
                    {title}
                </div>
                <div className="ArtOptionsGroup__description">{description}</div>
            </div>

            <div {...radioGroupProps()}>
                {options.map((opt) => (
                    <div {...radioProps(opt.value, { 'aria-label': opt.label })}>{children(opt.value)}</div>
                ))}
            </div>
        </div>
    )
}
