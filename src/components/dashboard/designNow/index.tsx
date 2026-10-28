import React, { useRef } from 'react'
import { navigate, withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'

import Card, { ContentCard } from '@ingka/card'
import Button from '@ingka/button'
import Image from '@ingka/image'
import AspectRatioBox from '@ingka/aspect-ratio-box'

import { useAppDispatch, useScrollTracking, useExperiments } from 'hooks'

import AppDownloadQRModal from 'components/AppDownloadQRModal'

import { generateRoomLink } from 'models/location/selectors'
import { SHOWROOMS_HASH } from 'models/location/constants'
import { showAppDownloadModal, showUploadImageModal } from 'models/ui/actions'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { USER_SCROLLED_PAST_DESIGN_NOW } from 'models/sessionStorage/constants'
import {
    ACCESS_FROM_DESIGN_NOW_OPTIONS,
    APP_STORE_SOURCE_WEB_DESIGN_NOW,
    GA_ACTION_DASHBOARD_CHOOSE_ROOM,
    GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK,
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_LABEL_DESIGN_NOW_OPTIONS,
    OPTIMIZELY_APP_DOWNLOAD_CLICK,
    TRACK_LOCATION_DASHBOARD,
    KREATIVLITE_DASHBOARD_OPEN,
    GA_ACTION_KREATIVLITE_OPEN,
} from 'models/tracking/constants'
import { withTimeout } from 'utils/async'
import { isSmallScreenDevice } from 'utils/isMobile'
import { experimentsService } from 'services/experiments'
import './DesignNow.scss'
import { CONTEXTUAL_CARDS } from '../contextualCard/constants'

export const TRACKING_DESIGN_NOW_SECTION = 'DesignNow'

type DesignNowProps = {
    onOpenPlanner: ({ trackingInfo, gaLabel }: { trackingInfo?: Record<string, unknown>; gaLabel?: string }) => void
}

const DesignNow: React.FC<DesignNowProps> = ({ onOpenPlanner }) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation('dashboard')

    const isSmallDevice = isSmallScreenDevice()
    const designNowRef = useRef<HTMLDivElement | null>(null)
    const { variations } = useExperiments()
    const isKreativLite = variations?.KreativLite === 'enabled'

    useScrollTracking(
        designNowRef,
        USER_SCROLLED_PAST_DESIGN_NOW,
        TRACKING_DESIGN_NOW_SECTION,
        TRACK_LOCATION_DASHBOARD,
    )

    const scrollToEmptyShowrooms = () => {
        click('Dashboard.ChooseRoom')
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_DASHBOARD_CHOOSE_ROOM,
            label: '',
        })

        const element = document.getElementById(SHOWROOMS_HASH)
        if (element) {
            element.scrollIntoView({ block: 'start', behavior: 'smooth' })
        }
    }

    const onClickStarterRoom = () => {
        scrollToEmptyShowrooms()
    }

    const onClickRoomBuilder = () => {
        onOpenPlanner({
            trackingInfo: {
                AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS as string,
            },
            gaLabel: GA_LABEL_DESIGN_NOW_OPTIONS,
        })
    }

    const onAppDownloadCardClick = () => {
        dispatch(showAppDownloadModal(true))
        click('Dashboard.GetIkeaApp', {
            AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS,
        })

        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK,
            label: GA_LABEL_DESIGN_NOW_OPTIONS,
            custom: {
                AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS,
            },
        })
        experimentsService.track(OPTIMIZELY_APP_DOWNLOAD_CLICK)
    }

    const onKreativLiteUploadClick = () => {
        trackGoogleAnalytics({
            action: GA_ACTION_KREATIVLITE_OPEN,
            category: GA_CATEGORY_DYH_SUGARCUBE,
            label: '',
        })
        click(KREATIVLITE_DASHBOARD_OPEN)
        dispatch(showUploadImageModal(true))
    }

    const onClickLearnMore = () => {
        withTimeout(
            click('Dashboard.LearnMoreClick', {
                AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS,
            }),
            500,
        ).finally(() => {
            navigate('/learnmore')
        })
    }

    const currentSearch = typeof window !== 'undefined' ? window.location.search : ''
    const roomBuilderUrl = generateRoomLink('/room-builder') + currentSearch

    return (
        <div className="DesignNow" id="designnow" ref={designNowRef}>
            <div className="header" id="value-prop">
                <div className="roomsTitle">{t('dashboard.design now')}</div>
                <Button text={t('dashboard.learn more')} onClick={onClickLearnMore} size="small" />
            </div>

            <div className="cards">
                {isKreativLite && (
                    <Card
                        content={
                            <ContentCard
                                id="dashboard-desktop-kreativ-lite"
                                title={t('dashboard.upload an image')}
                                body={t('dashboard.erase existing furniture in your photo')}
                                onCardClick={onKreativLiteUploadClick}
                                titleHeadingTag="h3"
                            />
                        }
                        mediaPosition="leading"
                        media={
                            <AspectRatioBox ratio="16:9">
                                <Image
                                    src={withPrefix(`/images/kreativLite/dashboardCard.jpg`)}
                                    onClick={onKreativLiteUploadClick}
                                    alt=""
                                />
                            </AspectRatioBox>
                        }
                    />
                )}
                <Card
                    content={
                        <ContentCard
                            id="dashboard-desktop-try-starter"
                            title={t('dashboard.try a starter room')}
                            body={t('dashboard.jump into a space to try product')}
                            onCardClick={onClickStarterRoom}
                            titleHeadingTag="h3"
                        />
                    }
                    mediaPosition="leading"
                    media={
                        <AspectRatioBox ratio="16:9">
                            <Image
                                src={withPrefix(`/images/graphics/dashboard/${CONTEXTUAL_CARDS[0].image}`)}
                                onClick={onClickStarterRoom}
                                alt={CONTEXTUAL_CARDS[0].alt}
                            />
                        </AspectRatioBox>
                    }
                />
                {!isSmallDevice && (
                    <a href={roomBuilderUrl} target="_blank" rel="noreferrer">
                        <Card
                            content={
                                <ContentCard
                                    id="dashboard-desktop-build-room"
                                    title={t('dashboard.build a room')}
                                    body={t('dashboard.choose a shape and set precise dimensions')}
                                    onCardClick={onClickRoomBuilder}
                                    titleHeadingTag="h3"
                                />
                            }
                            mediaPosition="leading"
                            media={
                                <AspectRatioBox ratio="16:9">
                                    <Image
                                        src={withPrefix(`/images/graphics/dashboard/${CONTEXTUAL_CARDS[1].image}`)}
                                        onClick={onClickRoomBuilder}
                                        alt={CONTEXTUAL_CARDS[1].alt}
                                    />
                                </AspectRatioBox>
                            }
                        />
                    </a>
                )}
                {!isKreativLite && (
                    <Card
                        content={
                            <ContentCard
                                id="dashboard-desktop-get-app"
                                title={t('dashboard.scan your room')}
                                body={t('dashboard.see how products look and fit in your own home')}
                                onCardClick={onAppDownloadCardClick}
                                titleHeadingTag="h3"
                            />
                        }
                        mediaPosition="leading"
                        media={
                            <AspectRatioBox ratio="16:9">
                                <Image
                                    src={withPrefix(`/images/graphics/dashboard/${CONTEXTUAL_CARDS[2].image}`)}
                                    onClick={onAppDownloadCardClick}
                                    alt={CONTEXTUAL_CARDS[2].alt}
                                />
                            </AspectRatioBox>
                        }
                    />
                )}
            </div>

            <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_DESIGN_NOW} />
        </div>
    )
}

export default DesignNow
