import Button, { ButtonProps } from '@ingka/button'
import mobileHandover from '@ingka/ssr-icon/paths/mobile-handover'
import {
    APP_STORE_SOURCE_MOBILE_DASHBOARD,
    GA_CATEGORY_DYH_SUGARCUBE,
    OPTIMIZELY_APP_DOWNLOAD_CLICK,
} from 'models/tracking/constants'
import { navigateExternal } from 'models/location/helpers'
import * as tracker from 'utils/tracker'
import { experimentsService } from 'services/experiments'
import { getAppStoreUrl } from 'utils/buildUrls'

import React from 'react'
import { useTranslation } from 'react-i18next'

export type GetAppButtonProps = Omit<ButtonProps, 'onClick'> & {
    track?: { action: string; from: string }
    customCtaText?: string
    displayIcon?: boolean
}

export const GetAppButton: React.FunctionComponent<GetAppButtonProps> = ({
    track,
    customCtaText,
    displayIcon = true,
    ...props
}) => {
    const { t } = useTranslation('dashboard')
    const appStoreLink = getAppStoreUrl({ source: APP_STORE_SOURCE_MOBILE_DASHBOARD })

    return (
        <Button
            text={customCtaText || t('dashboard.get ikea app')}
            ssrIcon={displayIcon ? mobileHandover : undefined}
            onClick={() => {
                navigateExternal(appStoreLink, {
                    before: async () => {
                        if (!track) {
                            return
                        }
                        // FIXME: ga tracking calls do not return a promise and cannot be awaited, so they might be cancelled during navigation.
                        tracker.trackGoogleAnalytics({
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            action: track.action,
                            label: track.from,
                        })
                        await Promise.all([
                            tracker.click('Dashboard.GetIkeaApp', {
                                AccessFrom: track.from,
                            }),
                            experimentsService.track(OPTIMIZELY_APP_DOWNLOAD_CLICK),
                        ])
                    },
                })
            }}
            {...props}
        />
    )
}
