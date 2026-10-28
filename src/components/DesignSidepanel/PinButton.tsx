import React from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import chevronRightIcon from '@ingka/ssr-icon/paths/chevron-right'
import chevronLeftIcon from '@ingka/ssr-icon/paths/chevron-left'
import pinFilledIcon from '@ingka/ssr-icon/paths/pin-filled'

import { useTracker } from 'apps/TrackingBoundary'

import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import Tooltip from 'components/Tooltip'

require('./PinButton.scss')

export const PinButton = () => {
    const { isSidepanelPinned, pinSidepanel, unpinSidepanel } = useDesignSidebarContext()
    const { t } = useTranslation()
    /* eslint-disable i18next/no-literal-string */
    const autoHideKey = 'tooltip.auto hide' as const
    const keepExpandedKey = 'tooltip.keep expanded' as const
    const label = isSidepanelPinned ? t(autoHideKey) : t(keepExpandedKey)

    const track = useTracker()

    const tooltipId = React.useId()
    return (
        <Tooltip describedById={tooltipId} title={label}>
            <button
                className={classNames('PinButton', { PinButton_pinned: isSidepanelPinned })}
                aria-label={label}
                aria-expanded={isSidepanelPinned}
                onClick={(event) => {
                    if (isSidepanelPinned) {
                        track('DecorateRoom.DesignSidepanel.Unpin', {
                            hints: {
                                userInteraction: {
                                    event,
                                    elementName: autoHideKey,
                                },
                            },
                        })
                        unpinSidepanel()
                    } else {
                        track('DecorateRoom.DesignSidepanel.Pin', {
                            hints: {
                                userInteraction: {
                                    event,
                                    elementName: keepExpandedKey,
                                },
                            },
                        })
                        pinSidepanel()
                    }
                }}
            >
                <SSRIcon className="PinButton__icon" paths={isSidepanelPinned ? chevronLeftIcon : chevronRightIcon} />
                <SSRIcon className="PinButton__pinIcon" paths={pinFilledIcon} />
            </button>
        </Tooltip>
    )
}
