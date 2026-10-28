import React from 'react'

import type { HtmlAttributeBag, OverrideableHtmlAttributes } from './common'

export type UseAriaOptionArgs = {
    'aria-controls': Required<React.AriaAttributes['aria-controls']>
    'aria-expanded'?: React.AriaAttributes['aria-expanded']
}

export type UseAriaOptionResults = {
    optionProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T> | undefined): HtmlAttributeBag<T>
    optionButtonProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T> | undefined): HtmlAttributeBag<T>
}

export function useAriaOption({
    'aria-controls': controls,
    'aria-expanded': expanded,
}: UseAriaOptionArgs): UseAriaOptionResults {
    return React.useMemo(() => {
        const result: UseAriaOptionResults = {
            optionProps(props = {}) {
                return {
                    ...props,
                    role: 'option',
                    'aria-controls': controls,
                    'aria-expanded': expanded,
                }
            },
            optionButtonProps(props = {}) {
                return {
                    ...props,
                    tabIndex: -1,
                    onMouseDown(event) {
                        // Ensure that focus does not shift to the button when a user clicks on it.
                        event.preventDefault()
                        props.onMouseDown?.(event)
                    },
                }
            },
        }
        return result
    }, [controls, expanded])
}
