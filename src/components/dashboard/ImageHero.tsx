import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import play from '@ingka/ssr-icon/paths/play'
import { ACCESS_FROM_HERO, GA_ACTION_HERO, GA_CATEGORY_DESIGN_LAB } from 'models/tracking/constants'
import React from 'react'
import { useTranslation } from 'react-i18next'
import * as tracker from 'utils/tracker'

require('./ImageHero.scss')

const trackClickPlayVideo = () => {
    const trackingInfo = {
        category: GA_CATEGORY_DESIGN_LAB,
        action: GA_ACTION_HERO,
        label: 'play_video',
    }
    tracker.trackGoogleAnalytics(trackingInfo)
    tracker.click('Dashboard.WatchVideoClick', {
        AccessFrom: ACCESS_FROM_HERO,
    })
}

export type ImageHeroProps = {
    onClickPlayVideo?: () => void
}

export const ImageHero: React.FunctionComponent<ImageHeroProps> = ({ onClickPlayVideo }) => {
    const { t } = useTranslation('dashboard')
    return (
        <div className="ImageHero">
            <div className="heroText">
                <div className="heroTitle">
                    <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                    {t('dashboard.ikea kreativ')}
                </div>
                <h1 className="heroTagline">{t('dashboard.bring your ideal')}</h1>
                <div className="heroTaglineDescription">{t('dashboard.a friendly experience')}</div>
                {onClickPlayVideo && (
                    <Button
                        type="primary"
                        text={t('dashboard.play video')}
                        ssrIcon={play}
                        onClick={() => {
                            trackClickPlayVideo()
                            onClickPlayVideo()
                        }}
                        className="videoButton"
                    />
                )}
            </div>
        </div>
    )
}
