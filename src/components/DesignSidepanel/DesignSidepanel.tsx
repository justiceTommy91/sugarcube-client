/* eslint-disable consistent-return */
import React from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import Button from '@ingka/button'
import SSRIcon, { SSRIconProps } from '@ingka/ssr-icon'
import menuIcon from '@ingka/ssr-icon/paths/menu'
import plusIcon from '@ingka/ssr-icon/paths/plus'
import documentPencilIcon from '@ingka/ssr-icon/paths/document-pencil'
import heartIcon from '@ingka/ssr-icon/paths/heart'
import gearIcon from '@ingka/ssr-icon/paths/gear'
import starIcon from '@ingka/ssr-icon/paths/star-filled'

import { useTracker, withTrackingBoundary } from 'apps/TrackingBoundary'

import { getAreDebugFeaturesEnabled } from 'models/user/selectors'

import { useAppSelector } from 'hooks/useAppSelector'
import { useHoverIntent } from 'hooks/useHoverIntent'
import { useOutsideAlerter } from 'hooks/useOutsideAlerter'
import { useTabs, UseTabsOptions } from 'hooks/useTabs'

import { DesignSidepanelView, useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import SkipLinks from 'components/SkipLinks'
import { BROWSE, DESIGN, HEADER, NAVIGATION } from 'components/SkipLinks/constants'
import Tooltip from 'components/Tooltip'

import type { ValueOf } from 'utils/object'
import { capitalize } from 'utils/string'
import { assertUnreachable } from 'utils/semantics'

import { DebugTab } from './tabs/DebugTab'
import { RatingsTab } from './tabs/RatingsTab'

import { AddProductTab } from './tabs/AddProductTab'
import { EditFurnitureTab } from './tabs/EditFurnitureTab'
import { FavoritesTab } from './tabs/FavoritesTab'
import { PinButton } from './PinButton'
import { FurnitureOptionsOverlayPanel } from './FurnitureOptionsOverlayPanel'
import { ProductDetailsOverlayPanel } from './ProductDetailsOverlayPanel'
import { StarterSetSidepanelOverlayPanel } from './StarterSetSidepanelOverlayPanel/StarterSetSidepanelOverlayPanel'
import { PAXImportPanel } from './PAXImportPanel'
import { PAXCustomizePanel } from './PAXCustomizePanel'

require('./DesignSidepanel.scss')

const tabIcon = (tab: DesignSidepanelView) => {
    switch (tab) {
        case DesignSidepanelView.ADD: {
            return plusIcon
        }
        case DesignSidepanelView.EDIT: {
            return documentPencilIcon
        }
        case DesignSidepanelView.FAVORITES: {
            return heartIcon
        }
        case DesignSidepanelView.RATINGS: {
            return starIcon
        }
        case DesignSidepanelView.DEBUG: {
            return gearIcon
        }
        default: {
            return assertUnreachable(tab)
        }
    }
}

const tabpanelContent = (tab: DesignSidepanelView): React.ReactElement => {
    switch (tab) {
        case DesignSidepanelView.ADD: {
            return <AddProductTab />
        }
        case DesignSidepanelView.EDIT: {
            return <EditFurnitureTab />
        }
        case DesignSidepanelView.FAVORITES: {
            return <FavoritesTab />
        }
        case DesignSidepanelView.RATINGS: {
            return <RatingsTab />
        }
        case DesignSidepanelView.DEBUG: {
            return <DebugTab />
        }
        default: {
            return assertUnreachable(tab)
        }
    }
}

type TabProps = React.PropsWithChildren<React.HTMLAttributes<HTMLElement>> & {
    tooltip?: string | undefined
}

const Tab = React.forwardRef<HTMLButtonElement, TabProps>(({ children, tooltip, ...props }, ref) => {
    const tooltipId = React.useId()
    return (
        <Tooltip describedById={tooltipId} title={tooltip} hide={!tooltip}>
            <button {...props} ref={ref} className="tab">
                {children}
            </button>
        </Tooltip>
    )
})

type TabPanelProps = React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>

const TabPanel = React.forwardRef<HTMLDivElement, TabPanelProps>(({ children, ...props }, ref) => (
    <div {...props} ref={ref} className="tabpanel">
        {children}
    </div>
))

type OverflowMenuItemProps = React.HTMLAttributes<HTMLButtonElement> &
    React.PropsWithChildren<{
        icon: SSRIconProps['paths']
    }>

const OverflowMenuItem = React.forwardRef<HTMLButtonElement, OverflowMenuItemProps>(
    ({ icon, children, ...props }, ref) => (
        <button {...props} ref={ref} className="overflowMenuItem" role="menuitem tab">
            <SSRIcon paths={icon} /> {children}
        </button>
    ),
)

type OverflowMenuProps = React.PropsWithChildren<{
    visible: boolean
    onClickToggle: React.MouseEventHandler<HTMLElement>
    onHide: () => void
}>

const OverflowMenu: React.FunctionComponent<OverflowMenuProps> = ({ children, visible, onClickToggle, onHide }) => {
    const ref = React.useRef<HTMLDivElement>(null)
    useOutsideAlerter({
        ref,
        onClickOutside: onHide,
    })
    return (
        <div ref={ref} className="overflowMenuWrapper">
            <Button
                type="tertiary"
                ssrIcon={menuIcon}
                onClick={onClickToggle}
                iconOnly
                size="small"
                // eslint-disable-next-line i18next/no-literal-string
                text="Toggle Debug Menu"
                tabIndex={-1}
            />

            <ol
                className={classNames('overflowMenu', { visible })}
                role="menu"
                aria-label="Debug Menu"
                style={visible ? { opacity: 1, pointerEvents: 'all' } : { opacity: 0, pointerEvents: 'none' }}
            >
                {React.Children.map(children, (child) => (
                    <li>{child}</li>
                ))}
            </ol>
        </div>
    )
}

const MAIN_TABS = [DesignSidepanelView.ADD, DesignSidepanelView.EDIT, DesignSidepanelView.FAVORITES] as const
const ADMIN_TABS = [DesignSidepanelView.RATINGS, DesignSidepanelView.DEBUG] as const
const ALL_TABS = [...MAIN_TABS, ...ADMIN_TABS] as const

export const DesignSidepanel = withTrackingBoundary('DesignSidepanel')(() => {
    const { t } = useTranslation()

    const {
        sidepanelViewDisplayed,
        displaySidepanelView,
        isSidepanelExpanded,
        isSidepanelPinned,
        expandSidepanel,
        collapseSidepanel,
        visibleOverlay,
    } = useDesignSidebarContext()

    const { intendsToExit, intendsToHover } = useHoverIntent({
        delay: 350,
        onHover: expandSidepanel,
        onExit: collapseSidepanel,
    })

    const track = useTracker()
    const tabNameKey = React.useCallback((view: DesignSidepanelView) => {
        switch (view) {
            case DesignSidepanelView.ADD: {
                return `design.add` as const
            }
            case DesignSidepanelView.EDIT: {
                return `design.list` as const
            }
            case DesignSidepanelView.FAVORITES: {
                return `design.favorites` as const
            }
            case DesignSidepanelView.RATINGS: {
                return `design.ratings` as const
            }
            case DesignSidepanelView.DEBUG: {
                return `design.debug` as const
            }
            default: {
                return assertUnreachable(view)
            }
        }
    }, [])
    const tooltip = (view: ValueOf<typeof MAIN_TABS>) => {
        switch (view) {
            case DesignSidepanelView.ADD: {
                return t('design.add new products')
            }
            case DesignSidepanelView.EDIT: {
                return t('design.edit list of items')
            }
            case DesignSidepanelView.FAVORITES: {
                return t('design.favorite items')
            }
            default: {
                assertUnreachable(view)
            }
        }
    }
    const changeTab: UseTabsOptions<DesignSidepanelView>['onChange'] = React.useCallback(
        (tab, event) => {
            displaySidepanelView(tab)
            track(`DecorateRoom.DesignSidepanel.${capitalize(tab)}Tab.Focus`, {
                hints: {
                    userInteraction: event
                        ? {
                              event,
                              elementName: tabNameKey(tab),
                          }
                        : undefined,
                },
            })
        },
        [tabNameKey],
    )
    const { tablistAttributes, tabAttributes, tabpanelAttributes } = useTabs(ALL_TABS, {
        focusedTab: sidepanelViewDisplayed,
        onChange: changeTab,
    })

    const debugEnabled = useAppSelector(getAreDebugFeaturesEnabled) as boolean

    const [isDebugMenuVisible, setIsDebugMenuVisible] = React.useState(false)
    const toggleDebugMenu = () => setIsDebugMenuVisible((o) => !o)
    const showDebugMenu = () => setIsDebugMenuVisible(true)
    const hideDebugMenu = () => setIsDebugMenuVisible(false)

    const pinButtonRef = React.useRef<HTMLDivElement | null>(null)
    return (
        <div
            className={classNames('DesignSidepanel', {
                DesignSidepanel_open: isSidepanelExpanded,
                DesignSidepanel_pinned: isSidepanelPinned,
            })}
            onPointerLeave={() => {
                intendsToExit()
            }}
            onPointerEnter={(event) => {
                // Don't signal hover intent if the user is hovering over the pin button.
                if (event.target instanceof HTMLElement && pinButtonRef.current?.contains(event.target)) {
                    return
                }
                intendsToHover()
            }}
            onFocus={(event) => {
                // Don't open the sidepanel on focus for the pin button.
                if (pinButtonRef.current?.contains(event.target)) {
                    return
                }
                expandSidepanel()
            }}
            onBlur={(event) => {
                // Don't close the sidepanel on blur if the new focus target is still within the sidepanel.
                if (event.currentTarget.contains(event.relatedTarget)) {
                    return
                }
                collapseSidepanel()
            }}
        >
            <div className="DesignSidepanel__content">
                <div className="DesignSidepanel__panel">
                    <div className="tablistWrapper">
                        <SkipLinks
                            label={t('accessibility.skiplinks for sidepanel tabs')}
                            skipLinks={[BROWSE, DESIGN, NAVIGATION]}
                            skipContext={HEADER}
                            floating
                        />

                        <div
                            {...tablistAttributes()}
                            className="tablist"
                            // KLUDGE: workaround for https://github.com/facebook/react/issues/17157
                            inert={!isSidepanelExpanded || visibleOverlay != null ? '' : null}
                        >
                            {MAIN_TABS.map((tab) => (
                                <Tab
                                    key={tab}
                                    {...tabAttributes<HTMLButtonElement>(tab, {
                                        onFocus: hideDebugMenu,
                                    })}
                                    tooltip={tooltip(tab)}
                                >
                                    <SSRIcon paths={tabIcon(tab)} />
                                    {t(tabNameKey(tab))}
                                </Tab>
                            ))}

                            {debugEnabled && (
                                <OverflowMenu
                                    visible={isDebugMenuVisible}
                                    onClickToggle={toggleDebugMenu}
                                    onHide={hideDebugMenu}
                                >
                                    {ADMIN_TABS.map((tab) => (
                                        <OverflowMenuItem
                                            {...tabAttributes<HTMLButtonElement>(tab, { onFocus: showDebugMenu })}
                                            key={tab}
                                            icon={tabIcon(tab)}
                                        >
                                            {t(tabNameKey(tab))}
                                        </OverflowMenuItem>
                                    ))}
                                </OverflowMenu>
                            )}
                        </div>
                    </div>

                    <div className="DesignSidepanel__tabpanelWrapper">
                        <SkipLinks
                            label={t('accessibility.skiplinks for sidepanel tab content')}
                            skipLinks={[DESIGN, HEADER]}
                            skipContext={BROWSE}
                            floating
                        />

                        {ALL_TABS.map((tab) => (
                            <TabPanel
                                key={tab}
                                {...tabpanelAttributes<HTMLDivElement>(tab)}
                                // KLUDGE: workaround for https://github.com/facebook/react/issues/17157
                                inert={!isSidepanelExpanded || visibleOverlay != null ? '' : null}
                            >
                                {tabpanelContent(tab)}
                            </TabPanel>
                        ))}
                    </div>
                </div>

                <PAXImportPanel />
                <PAXCustomizePanel />
                <StarterSetSidepanelOverlayPanel />

                <ProductDetailsOverlayPanel
                    productId={visibleOverlay?.overlay === 'product details' ? visibleOverlay.productId : undefined}
                />

                <FurnitureOptionsOverlayPanel
                    productId={visibleOverlay?.overlay === 'furniture options' ? visibleOverlay.productId : undefined}
                />
                <div ref={pinButtonRef} className="DesignSidepanel__pinButton">
                    <PinButton />
                </div>
            </div>
        </div>
    )
})
