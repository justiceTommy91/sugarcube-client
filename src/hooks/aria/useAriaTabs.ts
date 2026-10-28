import React from 'react'
import { HtmlAttributeBag, Labelled, OverrideableHtmlAttributes } from './common'

type ControlledProps<Tab extends string | number> = {
    defaultTab?: undefined
    selectedTab: Tab
    onChange(tab: Tab): void
}

type UncontrolledProps<Tab extends string | number> = {
    defaultTab: Tab
    onChange?: undefined
    selectedTab?: undefined
}

export type UseAriaTabsArgs<Tab extends string | number> = Labelled & {
    tabs: Tab[]
} & (ControlledProps<Tab> | UncontrolledProps<Tab>)

export type UseAriaTabsResult<Tab extends string | number> = {
    selectedTab: Tab
    selectNextTab(): void
    selectPrevTab(): void
    selectTab(tab: Tab): void
    tablistProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
    tabProps<T extends HTMLElement>(tab: Tab, props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
    tabpanelProps<T extends HTMLElement>(tab: Tab, props?: OverrideableHtmlAttributes<T>): HtmlAttributeBag<T>
}

export const useAriaTabs = <Tab extends string | number>({
    tabs,
    defaultTab,
    selectedTab: selectedTabFromProps,
    onChange: onChangeFromProps,
    'aria-label': label,
    'aria-labelledby': labelledBy,
}: UseAriaTabsArgs<Tab>): UseAriaTabsResult<Tab> => {
    const [internalSelectedTab, setInternalSelectedTab] = React.useState<Tab>(defaultTab ?? tabs[0])

    const selectedTab = selectedTabFromProps ?? internalSelectedTab
    const onChange = React.useCallback(
        (tab: Tab): void => {
            onChangeFromProps?.(tab)
            setInternalSelectedTab(tab)
        },
        [onChangeFromProps],
    )

    const nTabs = tabs.length
    const tablistId = React.useId()
    const tabId = (tab: Tab) => `${tablistId}_${tab}`
    return React.useMemo(() => {
        const selectTab = (tabN: number): void => {
            if (tabN < 0) {
                tabN = nTabs - 1
            }
            if (tabN >= nTabs) {
                tabN = 0
            }
            const tab = tabs[tabN]
            onChange?.(tab)
            // For programatic tab changing, ensure that the selected tab is focused.
            const tabElem = document.getElementById(tabId(tab))
            try {
                tabElem?.focus({ preventScroll: true })
            } catch {
                // For older browsers that don't support preventScroll, don't crash
                tabElem?.focus()
            }
        }
        const selectFirstTab = (): void => {
            selectTab(0)
        }
        const selectLastTab = (): void => {
            selectTab(nTabs - 1)
        }
        const selectNextTab = (): void => {
            const tabN = tabs.indexOf(selectedTab)
            selectTab(tabN + 1)
        }
        const selectPrevTab = (): void => {
            const tabN = tabs.indexOf(selectedTab)
            selectTab(tabN - 1)
        }
        return {
            selectedTab,
            selectTab(tab) {
                selectTab(tabs.indexOf(tab))
            },
            selectPrevTab,
            selectNextTab,
            tablistProps<T extends HTMLElement>(props?: OverrideableHtmlAttributes<T>) {
                return {
                    ...props,
                    id: tablistId,
                    role: 'tablist',
                    'aria-label': label,
                    'aria-labelledby': labelledBy,
                    onKeyDown(event: React.KeyboardEvent<T>) {
                        if (event.key === 'ArrowLeft') {
                            event.preventDefault()
                            selectPrevTab()
                        } else if (event.key === 'ArrowRight') {
                            event.preventDefault()
                            selectNextTab()
                        } else if (event.key === 'Home') {
                            event.preventDefault()
                            selectFirstTab()
                        } else if (event.key === 'End') {
                            event.preventDefault()
                            selectLastTab()
                        }
                        props?.onKeyDown?.(event)
                    },
                }
            },
            tabProps<T extends HTMLElement>(tab: Tab, props?: OverrideableHtmlAttributes<T>) {
                return {
                    ...props,
                    id: tabId(tab),
                    type: 'button',
                    role: 'tab',
                    'aria-controls': tablistId,
                    'aria-selected': selectedTab === tab,
                    // Only the active tab allows for tab-focus
                    tabIndex: selectedTab === tab ? 0 : -1,
                    onClick(event: React.MouseEvent<T>) {
                        selectTab(tabs.indexOf(tab))
                        props?.onClick?.(event)
                    },
                }
            },
            tabpanelProps<T extends HTMLElement>(tab: Tab, props?: OverrideableHtmlAttributes<T>) {
                return {
                    ...props,
                    role: 'tabpanel',
                    'aria-labelledby': tabId(tab),
                    hidden: selectedTab !== tab,
                }
            },
        }
    }, [selectedTab, label, labelledBy])
}
