import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import SimpleVideo from '@ingka/simple-video'
import AspectRatioBox from '@ingka/aspect-ratio-box'
import { withPrefix } from 'gatsby'
import SSRIcon from '@ingka/ssr-icon'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import classNames from 'classnames'
import { Page } from 'constants/pages'
import * as tracker from 'utils/tracker'
import {
    ACCESS_FROM_FIND_PERFECT_ITEM,
    ACCESS_FROM_FURNISH_ENTIRE_ROOM,
    ACCESS_FROM_HERO,
    ACCESS_FROM_REFRESH_SPACE,
    GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK,
    TRACK_LOCATION_MOBILE_DASHBOARD,
} from 'models/tracking/constants'
import { useOrientation, useScrollTracking } from 'hooks'
import {
    USER_SCROLLED_PAST_FIND_THE_PERFECT_ITEM,
    USER_SCROLLED_PAST_FURNISH_ENTIRE_ROOM,
    USER_SCROLLED_PAST_MOBILE_HERO,
    USER_SCROLLED_PAST_REFRESH_YOUR_SPACE,
} from 'models/sessionStorage/constants'
import { GetAppButton } from './GetAppButton'
import { MobileDashboardCard } from './MobileDashboardCard'
import './MobileDashboardV2.scss'

const TRACKING_MOBILE_DASHBOARD_HERO = 'Hero'
const TRACKING_MOBILE_DASHBOARD_PERFECT_ITEM = 'FindThePerfectItem'
const TRACKING_MOBILE_DASHBOARD_REFRESH_YOUR_SPACE = 'RefreshYourSpace'
const TRACKING_MOBILE_DASHBOARD_FURNISH_ENTIRE_ROOM = 'FurnishAnEntireRoom'

const CARD_THRESHOLD = 0.3

export const MobileDashboardV2: React.FunctionComponent = () => {
    const { t } = useTranslation(['dashboard', 'translation'])
    const orientation = useOrientation()
    const hasLandscapeOrientation = orientation === 'landscape'

    const heroRef = useRef<HTMLDivElement | null>(null)
    const perfectItemRef = useRef<HTMLDivElement | null>(null)
    const refreshYourSpaceRef = useRef<HTMLDivElement | null>(null)
    const furnishEntireRoomRef = useRef<HTMLDivElement | null>(null)

    useScrollTracking(
        heroRef,
        USER_SCROLLED_PAST_MOBILE_HERO,
        TRACKING_MOBILE_DASHBOARD_HERO,
        TRACK_LOCATION_MOBILE_DASHBOARD,
        CARD_THRESHOLD,
    )
    useScrollTracking(
        perfectItemRef,
        USER_SCROLLED_PAST_FIND_THE_PERFECT_ITEM,
        TRACKING_MOBILE_DASHBOARD_PERFECT_ITEM,
        TRACK_LOCATION_MOBILE_DASHBOARD,
        CARD_THRESHOLD,
    )
    useScrollTracking(
        refreshYourSpaceRef,
        USER_SCROLLED_PAST_REFRESH_YOUR_SPACE,
        TRACKING_MOBILE_DASHBOARD_REFRESH_YOUR_SPACE,
        TRACK_LOCATION_MOBILE_DASHBOARD,
        CARD_THRESHOLD,
    )
    useScrollTracking(
        furnishEntireRoomRef,
        USER_SCROLLED_PAST_FURNISH_ENTIRE_ROOM,
        TRACKING_MOBILE_DASHBOARD_FURNISH_ENTIRE_ROOM,
        TRACK_LOCATION_MOBILE_DASHBOARD,
        0.5,
    )

    useEffect(() => {
        tracker.pageInteractive(Page.DASHBOARD)
    }, [])

    return (
        <div className="MobileDashboardV2">
            <div className="headerContainer">
                <div className="kreativIconText">
                    <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                    <span className="label">{t('translation:design.ikea kreativ')}</span>
                </div>

                <div className="cardContainer" ref={heroRef}>
                    <div>
                        <AspectRatioBox ratio="16:9">
                            <SimpleVideo
                                preload="metadata"
                                descriptionId={t('translation:mobile.reimagine your home')}
                                src={`${process.env.GATSBY_ASSET_BUCKET}/videos/mobile_web_header.mp4`}
                                type="video/mp4"
                                className="media"
                                playAriaLabel={t('dashboard:dashboard.play')}
                                pauseAriaLabel={t('dashboard:dashboard.pause')}
                                descriptionBody={t('translation:mobile.personalize your shopping experience')}
                                muted
                                loop
                                autoPlay
                                poster={withPrefix('/images/graphics/dashboard/mobile_web_header.jpg')}
                                emphasised={false}
                                additionalControls="bottomTrailing"
                            />
                        </AspectRatioBox>
                    </div>

                    <MobileDashboardCard
                        title={t('translation:mobile.reimagine your home')}
                        subtitle={t('translation:mobile.personalize your shopping experience')}
                        track={{
                            action: GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK,
                            from: ACCESS_FROM_HERO,
                        }}
                        hasCardLayout={false}
                    />
                </div>
            </div>
            <div className={classNames('fullWidthCard', 'purple')} ref={perfectItemRef}>
                <div className={classNames('content', { hasLandscapeOrientation })}>
                    <AspectRatioBox ratio="4:5">
                        <SimpleVideo
                            preload="metadata"
                            descriptionId={t('translation:mobile.find the perfect item')}
                            src={`${process.env.GATSBY_ASSET_BUCKET}/videos/mobile_web_swap.mp4`}
                            type="video/mp4"
                            className="media"
                            playAriaLabel={t('dashboard:dashboard.play')}
                            pauseAriaLabel={t('dashboard:dashboard.pause')}
                            descriptionBody={t('translation:mobile.scan your space')}
                            muted
                            loop
                            autoPlay
                            poster={withPrefix('/images/graphics/dashboard/mobile_web_swap.jpg')}
                            emphasised={false}
                            additionalControls="bottomTrailing"
                        />
                    </AspectRatioBox>
                    <div className="textAndCta">
                        <div className="titleDescription">
                            <div className="title">{t('translation:mobile.find the perfect item')}</div>
                            <div className="description">{t('translation:mobile.scan your space')}</div>
                        </div>

                        <GetAppButton
                            className="getAppButton"
                            customCtaText={t('translation:mobile.try ikea kreativ').toString()}
                            type="primary"
                            inverseTheme
                            track={{
                                action: GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK,
                                from: ACCESS_FROM_FIND_PERFECT_ITEM,
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className={classNames('fullWidthCard', 'blue')} ref={refreshYourSpaceRef}>
                <div className={classNames('content', { hasLandscapeOrientation })}>
                    <AspectRatioBox ratio="4:5">
                        <SimpleVideo
                            preload="metadata"
                            descriptionId={t('translation:mobile.refresh your space')}
                            src={`${process.env.GATSBY_ASSET_BUCKET}/videos/mobile_web_gww.mp4`}
                            type="video/mp4"
                            className="media"
                            playAriaLabel={t('dashboard:dashboard.play')}
                            pauseAriaLabel={t('dashboard:dashboard.pause')}
                            descriptionBody={t('translation:mobile.explore combinations of products')}
                            muted
                            loop
                            autoPlay
                            poster={withPrefix('/images/graphics/dashboard/mobile_web_gww.jpg')}
                            emphasised={false}
                            additionalControls="bottomTrailing"
                        />
                    </AspectRatioBox>
                    <div className="textAndCta">
                        <div className="titleDescription">
                            <div className="title">{t('translation:mobile.refresh your space')}</div>
                            <div className="description">
                                {t('translation:mobile.explore combinations of products')}
                            </div>
                        </div>

                        <GetAppButton
                            className="getAppButton"
                            customCtaText={t('translation:mobile.try ikea kreativ').toString()}
                            type="primary"
                            inverseTheme
                            track={{
                                action: GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK,
                                from: ACCESS_FROM_REFRESH_SPACE,
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className={classNames('fullWidthCard', 'green')} ref={furnishEntireRoomRef}>
                <div className={classNames('content', { hasLandscapeOrientation })}>
                    <AspectRatioBox ratio="4:5">
                        <SimpleVideo
                            preload="metadata"
                            descriptionId={t('translation:mobile.furnish an entire room')}
                            src={`${process.env.GATSBY_ASSET_BUCKET}/videos/mobile_web_entire_room.mp4`}
                            type="video/mp4"
                            className="media"
                            playAriaLabel={t('dashboard:dashboard.play')}
                            pauseAriaLabel={t('dashboard:dashboard.pause')}
                            descriptionBody={t('translation:mobile.start from scratch')}
                            muted
                            loop
                            autoPlay
                            poster={withPrefix('/images/graphics/dashboard/mobile_web_entire_room.jpg')}
                            emphasised={false}
                            additionalControls="bottomTrailing"
                        />
                    </AspectRatioBox>
                    <div className="textAndCta">
                        <div className="titleDescription">
                            <div className="title">{t('translation:mobile.furnish an entire room')}</div>
                            <div className="description">{t('translation:mobile.start from scratch')}</div>
                        </div>

                        <GetAppButton
                            className="getAppButton"
                            customCtaText={t('translation:mobile.try ikea kreativ').toString()}
                            type="primary"
                            inverseTheme
                            track={{
                                action: GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK,
                                from: ACCESS_FROM_FURNISH_ENTIRE_ROOM,
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
