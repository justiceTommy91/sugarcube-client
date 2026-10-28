import React, { useContext } from 'react'
import { graphql } from 'gatsby'
import { useTranslation } from 'react-i18next'

import mobileHandover from '@ingka/ssr-icon/paths/mobile-handover'
import Button, { ButtonType } from '@ingka/button'

import SugarcubeContext from 'apps/SugarcubeContext'
import { getAppStoreUrl } from 'utils/buildUrls'
import { navigateExternal } from 'models/location/helpers'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { APP_STORE_SOURCE_WEB_CAMPAIGN, GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'

import { AppMobileButtonData } from './AppMobileButton.type'
import './AppMobileButton.scss'

export const AppMobileButtonSection: React.FC<AppMobileButtonData> = ({
    text,
    id,
    buttonType,
    mobileUrl,
    tracking,
}) => {
    const { isMobile } = useContext(SugarcubeContext)
    const { t } = useTranslation('campaigns')

    const appStoreLink = getAppStoreUrl({
        source: APP_STORE_SOURCE_WEB_CAMPAIGN,
        route: mobileUrl,
    })

    const onButtonClick = () => {
        const trackInfo = () => {
            click(tracking.onButtonClick.mixPanel.eventName, tracking.onButtonClick.mixPanel.metadata)
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: tracking.onButtonClick?.ga.action,
                label: tracking.onButtonClick?.ga.label,
                custom: tracking.onButtonClick?.ga.custom,
            })
        }

        navigateExternal(appStoreLink, {
            before: async () => {
                await Promise.all([trackInfo()])
            },
        })
    }

    return isMobile ? (
        <div className="AppMobileSection" onClick={onButtonClick} id={id}>
            <Button
                ssrIcon={mobileHandover}
                text={t(text).toString()}
                onClick={onButtonClick}
                type={buttonType as ButtonType}
            />
        </div>
    ) : null
}

export const AppDownloadButtonFragment = graphql`
    fragment AppDownloadButtonFragment on CampaignsJsonSections {
        type
        id
        text
        buttonType
        tracking
        mobileUrl
        alt
    }
`
