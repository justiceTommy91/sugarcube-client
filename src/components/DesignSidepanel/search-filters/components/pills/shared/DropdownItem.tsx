import React, { useId } from 'react'
import classNames from 'classnames'
import Checkbox from '@ingka/checkbox'
import { useAriaOption } from 'hooks/aria/useAriaOption'
import { StarRating } from '../../shared/StarRating'

require('./DropdownItem.scss')

export type DropdownItemProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'role'> & {
    value: string
    label: string
    count: number
    checked: boolean
    showStarRating?: boolean
    'aria-controls'?: string
    'aria-selected'?: React.AriaAttributes['aria-selected']
}

/**
 * A clickable dropdown item button used in filter pill dropdowns.
 * Displays an option label/stars, item count, and checkbox selection state.
 */
export const DropdownItem = ({
    value,
    label,
    count,
    checked,
    disabled,
    className,
    showStarRating,
    'aria-controls': ariaControls,
    ...props
}: DropdownItemProps): React.ReactElement => {
    const id = useId()
    const countId = `${id}-count`

    const { optionButtonProps } = useAriaOption({
        'aria-controls': ariaControls || '',
    })

    const displayContent = showStarRating ? (
        <StarRating rating={Number.isNaN(parseInt(label, 10)) ? 0 : parseInt(label, 10)} showText />
    ) : (
        label
    )

    return (
        <button
            {...optionButtonProps(props)}
            className={classNames('DropdownItem', className)}
            disabled={disabled}
            role="option"
            aria-selected={checked}
            aria-describedby={countId}
            tabIndex={-1}
        >
            {displayContent}{' '}
            <span className="DropdownItem__count" id={countId}>
                {count}{' '}
                <Checkbox
                    className="DropdownItem__checkbox"
                    subtle
                    id={id}
                    value={value}
                    checked={checked}
                    disabled={disabled}
                    size={18}
                    tabIndex={-1}
                    readOnly
                />
            </span>
        </button>
    )
}
