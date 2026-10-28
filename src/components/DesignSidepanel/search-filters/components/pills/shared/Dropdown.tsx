import React, { useRef, useImperativeHandle } from 'react'
import classNames from 'classnames'
import { useOutsideAlerter } from 'hooks'
import { useAriaListbox } from 'hooks/aria/useAriaListbox'
import { DropdownPosition } from '../hooks/useSmartDropdownPosition'

require('./Dropdown.scss')

export type DropdownProps = React.PropsWithChildren<{
    className?: string
    onClose: () => void
    excludeRefs?: React.RefObject<HTMLElement>[]
    position?: DropdownPosition
    style?: React.CSSProperties
    'aria-labelledby'?: string
    id?: string
    'aria-multiselectable'?: boolean
}>

export const Dropdown = React.forwardRef<HTMLUListElement, DropdownProps>(
    (
        {
            children,
            onClose,
            className,
            excludeRefs,
            position,
            style,
            'aria-labelledby': labelledBy,
            id,
            'aria-multiselectable': ariaMultiselectable,
        },
        ref,
    ) => {
        const rootRef = useRef<HTMLUListElement | null>(null)

        // Merge external ref with internal ref
        useImperativeHandle(ref, () => rootRef.current as HTMLUListElement, [])

        // Enhanced outside alerter with ESC key support
        useOutsideAlerter({
            ref: rootRef,
            onClickOutside: onClose,
            excludeRefs,
            enableEscapeKey: true,
        })

        // ARIA listbox support for proper screen reader semantics
        const { listboxProps } = useAriaListbox({
            'aria-labelledby': labelledBy,
        })

        const dynamicStyles: React.CSSProperties = {
            ...(position
                ? {
                      position: position.position,
                      top: position.top,
                      bottom: position.bottom,
                      left: position.left,
                      right: position.right,
                      maxHeight: position.maxHeight,
                  }
                : {}),
            ...style,
        }

        const handleMouseDown = (event: React.MouseEvent) => {
            // Prevent blur events from incorrectly closing the dropdown when clicking on whitespace
            //
            // Issue: When clicking on whitespace/padding within the dropdown (the <ul> element itself),
            // it causes the pill button to lose focus. The useAriaFilterCombobox.handleBlur then
            // incorrectly interprets this as "focus moved outside the dropdown" and closes it.
            //
            // Solution: Stop the mousedown event from propagating to prevent the blur event
            // from firing, while still allowing normal click handling within the dropdown content.
            event.stopPropagation()
            event.preventDefault()
            event.nativeEvent.stopImmediatePropagation()
        }

        return (
            <ul
                {...listboxProps()}
                ref={rootRef}
                className={classNames('Dropdown', className, {
                    'Dropdown--positioned': !!position,
                })}
                style={dynamicStyles}
                id={id}
                role="listbox"
                aria-multiselectable={ariaMultiselectable}
                onMouseDown={handleMouseDown}
            >
                {React.Children.map(children, (child) => (
                    <li>{child}</li>
                ))}
            </ul>
        )
    },
)
