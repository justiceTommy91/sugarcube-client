import React from 'react'
import type { HtmlAttributeBag, OverrideableHtmlAttributes, Labelled } from './common'

export type UseAriaListboxArgs = Labelled

export type UseAriaListboxResults = {
    listboxProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T> | undefined): HtmlAttributeBag<T>
}

export function useAriaListbox({
    'aria-label': label,
    'aria-labelledby': labelledBy,
}: UseAriaListboxArgs): UseAriaListboxResults {
    return React.useMemo(() => {
        const result: UseAriaListboxResults = {
            listboxProps(props = {}) {
                return {
                    ...props,
                    role: 'listbox',
                    'aria-label': label,
                    'aria-labelledby': labelledBy,
                }
            },
        }
        return result
    }, [])
}
