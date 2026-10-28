import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import SSRIcon from '@ingka/ssr-icon'
import arrowDown from '@ingka/ssr-icon/paths/arrow-down'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import Card, { ContentCard } from '@ingka/card'
import SimpleVideo from '@ingka/simple-video'
import AspectRatioBox from '@ingka/aspect-ratio-box'
import { Typography } from '@ingka/typography-shared'
import { ModalFooter, ModalHeader, Prompt } from '@ingka/modal'
import Button from '@ingka/button'

import { AccessibleModal } from 'components/AccessibleModal'
import { useAppSelector, useScrollTracking } from 'hooks'
import { getIsLoggedIn } from 'models/user/selectors'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { GA_ACTION_HERO, GA_CATEGORY_DESIGN_LAB, TRACK_LOCATION_DASHBOARD } from 'models/tracking/constants'
import { USER_SCROLLED_PAST_HERO } from 'models/sessionStorage/constants'

import './HeroV2.scss'

// eslint-disable-next-line i18next/no-literal-string
export const TRACKING_HERO_V2_SECTION = 'HeroV2'

export const HeroV2 = () => {
    const { t } = useTranslation(['translation', 'dashboard'])
    const heroRef = useRef<HTMLDivElement | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const isLoggedIn = useAppSelector(getIsLoggedIn)
    const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)

    useScrollTracking(heroRef, USER_SCROLLED_PAST_HERO, TRACKING_HERO_V2_SECTION, TRACK_LOCATION_DASHBOARD)

    const trackVideoPlay = () => {
        click('Dashboard.HeroPlayPause', {
            isPlaying: true,
            AccessFrom: TRACKING_HERO_V2_SECTION,
        })
    }

    const trackVideoPause = () => {
        click('Dashboard.HeroPlayPause', {
            isPlaying: false,
            AccessFrom: TRACKING_HERO_V2_SECTION,
        })
    }

    const openTranscript = () => {
        videoRef.current?.pause()
        setIsTranscriptOpen(true)
    }

    const closeTranscript = () => {
        setIsTranscriptOpen(false)
    }

    const handleStartDesign = () => {
        const trackingInfo = {
            category: GA_CATEGORY_DESIGN_LAB,
            action: GA_ACTION_HERO,
            label: 'start_design',
        }
        trackGoogleAnalytics(trackingInfo)
        click('Dashboard.StartDesignClick', {
            AccessFrom: TRACKING_HERO_V2_SECTION,
        })

        const element = document.getElementById('value-prop')
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', inline: 'start' })
        }
    }

    const transcriptText = t('dashboard:dashboard.hero.transcript content') as string
    const transcriptTitle = t('dashboard:dashboard.hero.transcript title') as string

    const media = (
        <AspectRatioBox ratio="16:9" className="heroVideo">
            <SimpleVideo
                ref={videoRef}
                descriptionId="dashboard-hero-video"
                src={`${process.env.GATSBY_ASSET_BUCKET}/videos/header-video.mp4`}
                type="video/mp4"
                playAriaLabel={t('dashboard:dashboard.play')}
                pauseAriaLabel={t('dashboard:dashboard.pause')}
                descriptionBody={transcriptText}
                emphasised={false}
                additionalControls="bottomTrailing"
                onPlay={trackVideoPlay}
                onPause={trackVideoPause}
                transcriptButtonProps={{
                    text: t('dashboard:dashboard.readTranscript'),
                    onClick: openTranscript,
                }}
            />
        </AspectRatioBox>
    )

    return (
        <div className="HeroV2" ref={heroRef} data-testid="dashboard-header-video">
            <div className="heroContainer">
                <Card
                    content={
                        <ContentCard
                            id="hero-v2-content-card"
                            addOn={
                                <div className="ikeaKreativBadge">
                                    <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                                    <span className={Typography.Heading.L}>{t('translation:design.ikea kreativ')}</span>
                                </div>
                            }
                            title={t('dashboard:dashboard.hero.title')}
                            body={t('dashboard:dashboard.hero.description')}
                            buttonProps={{
                                text: (
                                    <p className={Typography.Label.M}>
                                        {isLoggedIn
                                            ? t('dashboard:dashboard.hero.create new room')
                                            : t('dashboard:dashboard.hero.cta')}
                                        <span>
                                            <SSRIcon paths={arrowDown} />
                                        </span>
                                    </p>
                                ),
                                className: 'staticButton',
                            }}
                            onCardClick={handleStartDesign}
                        />
                    }
                    mediaPosition="trailing"
                    media={media}
                />
            </div>
            <AccessibleModal
                className="HeroTranscriptModal"
                isOpen={isTranscriptOpen}
                onClose={closeTranscript}
                ariaLabel={transcriptTitle}
                wrapContent={false}
            >
                <Prompt
                    open={isTranscriptOpen}
                    titleId="hero-transcript-title"
                    title={transcriptTitle}
                    header={<ModalHeader ariaCloseTxt={t('aria.close')} />}
                    footer={
                        <ModalFooter className="modalFooter">
                            <Button type="secondary" text={t('aria.close')} onClick={closeTranscript} />
                        </ModalFooter>
                    }
                >
                    <p>{transcriptText}</p>
                </Prompt>
            </AccessibleModal>
        </div>
    )
}
