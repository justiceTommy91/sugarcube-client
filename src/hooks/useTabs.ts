import React from 'react'

export type UseTabsOptions<T> = {
    focusedTab: T
    onChange: (tab: T, event?: React.SyntheticEvent) => void
}

type HTMLElementProps<T> = React.HTMLAttributes<T> & React.RefAttributes<T>

export type UseTabsResult<T> = {
    focusedTab: T
    focusTab: (tab: T) => void

    tablistAttributes: <E extends HTMLElement>(attributes?: HTMLElementProps<E>) => HTMLElementProps<E>
    tabAttributes: <E extends HTMLElement>(tab: T, attributes?: HTMLElementProps<E>) => HTMLElementProps<E>
    tabpanelAttributes: <E extends HTMLElement>(tab: T, attributes?: HTMLElementProps<E>) => HTMLElementProps<E>
}

export const useTabs = <T extends string>(
    tabs: T[] | readonly T[],
    { focusedTab, onChange }: UseTabsOptions<T>,
): UseTabsResult<T> => {
    const tabsRef = React.useRef<Partial<Record<T, HTMLElement>>>({})
    const tabpanelsRef = React.useRef<Partial<Record<T, HTMLElement>>>({})

    const onChangeRef = React.useRef(onChange)
    React.useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    const baseId = React.useId()
    return React.useMemo((): UseTabsResult<T> => {
        const unregisterTab = (tab: T): void => {
            delete tabsRef.current[tab]
        }

        const registerTab = (tab: T, el: HTMLElement): void => {
            tabsRef.current[tab] = el
        }

        const focusTabAtIndex = (i: number, event?: React.SyntheticEvent): T => {
            const tab = tabs[i]
            const el = tabsRef.current[tab]
            el?.focus()
            onChange(tab, event)
            return tab
        }
        const focusNextTab = (event?: React.SyntheticEvent) => {
            const registeredTabs = Object.keys(tabsRef.current)
            const i = registeredTabs.indexOf(focusedTab)
            if (i >= registeredTabs.length - 1) {
                focusTabAtIndex(0, event)
            } else {
                focusTabAtIndex(i + 1, event)
            }
        }
        const focusPrevTab = (event?: React.SyntheticEvent) => {
            const registeredTabs = Object.keys(tabsRef.current)
            const i = registeredTabs.indexOf(focusedTab)
            if (i <= 0) {
                focusTabAtIndex(registeredTabs.length - 1, event)
            } else {
                focusTabAtIndex(i - 1, event)
            }
        }

        const registerTabpanel = (tab: T, el: HTMLElement): void => {
            tabpanelsRef.current[tab] = el
        }

        const tabId = (tab: T) => `${baseId}-tab-${tab}`
        const tabPanelId = (tab: T) => `${baseId}-tabpanel-${tab}`
        return {
            focusedTab,
            focusTab: onChange,
            tablistAttributes: (attrs = {}) => ({
                ...attrs,
                role: 'tablist',
                onKeyDown: (event) => {
                    attrs.onKeyDown?.(event)
                    if (event.key === 'ArrowLeft') {
                        event.preventDefault()
                        focusPrevTab(event)
                    } else if (event.key === 'ArrowRight') {
                        event.preventDefault()
                        focusNextTab(event)
                    } else if (event.key === 'Tab') {
                        event.preventDefault()
                        tabpanelsRef.current[focusedTab]?.focus()
                    }
                },
            }),
            tabAttributes: (tab, attrs = {}) => {
                const selected = focusedTab === tab
                return {
                    ...attrs,
                    ref: (el) => {
                        if (!el) {
                            unregisterTab(tab)
                            return
                        }
                        registerTab(tab, el)
                    },
                    id: tabId(tab),
                    role: 'tab',
                    'aria-controls': tabPanelId(tab),
                    'aria-selected': selected,
                    tabIndex: selected ? 0 : -1,
                    onClick: (event) => {
                        onChange?.(tab, event)
                        attrs.onClick?.(event)
                    },
                }
            },
            tabpanelAttributes: (tab, attrs = {}) => ({
                ...attrs,
                ref: (el) => {
                    if (!el) {
                        return
                    }
                    registerTabpanel(tab, el)
                },
                id: tabPanelId(tab),
                role: 'tabpanel',
                'aria-labelledby': tabId(tab),
                tabIndex: -1,
                hidden: focusedTab !== tab,
            }),
        }
    }, [focusedTab])
}
