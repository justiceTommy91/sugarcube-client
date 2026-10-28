import React, { useRef } from 'react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import SimpleVideo from '@ingka/simple-video'
import SSRIcon from '@ingka/ssr-icon'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'

import { useScrollTracking } from 'hooks'
import { TRACK_LOCATION_LEARNMORE } from 'models/tracking/constants'
import { USER_SCROLLED_PAST_LEARNMORE_HERO } from 'models/sessionStorage/constants'

import './Hero.scss'

const VIDEO_URL = `${process.env.GATSBY_ASSET_BUCKET}/videos/learn-more-morpheus-hero-video.mp4`
const TRACKING_LEARNMORE_HERO_SECTION = 'Hero'

export type LearnMoreMorpheusHeroProp = {
    isMobile: boolean
}

export const LearnMoreMorpheusHero: React.FunctionComponent<LearnMoreMorpheusHeroProp> = ({ isMobile }) => {
    const { t } = useTranslation(['dashboard', 'learnmore'])

    const videoRef = useRef<HTMLVideoElement>(null)
    const heroRef = useRef<HTMLDivElement>(null)

    useScrollTracking(
        heroRef,
        USER_SCROLLED_PAST_LEARNMORE_HERO,
        TRACKING_LEARNMORE_HERO_SECTION,
        TRACK_LOCATION_LEARNMORE,
    )

    return (
        <div ref={heroRef} className={classNames('Hero', { isMobile })}>
            <div className="heroContainer">
                <div className="heroText">
                    <div className="ikeaKreativ morpheusHeroText">
                        <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                        <p>{t('learnmore:learnmore.ikea kreativ')}</p>
                    </div>
                    <h1>
                        <p className="heroTagline morpheusHeroText">{t('learnmore:learnmore.reimagine your home')}</p>
                    </h1>
                </div>
                <SimpleVideo
                    ref={videoRef}
                    descriptionId="dashboard-hero-video"
                    src={VIDEO_URL}
                    type="video/mp4"
                    playAriaLabel={t('dashboard:dashboard.play')}
                    pauseAriaLabel={t('dashboard:dashboard.pause')}
                    className="heroVideo"
                    descriptionBody={t('learnmore:learnmore.reimagine your home')}
                    poster={withPrefix('/images/graphics/learnmore/reimagine-your-home.png')}
                    emphasised={false}
                    additionalControls="bottomTrailing"
                />
            </div>
        </div>
    )
}
