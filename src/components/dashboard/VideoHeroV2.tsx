import SimpleVideo from '@ingka/simple-video'
import SSRIcon from '@ingka/ssr-icon'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import { withPrefix } from 'gatsby'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import arrowDown from '@ingka/ssr-icon/paths/arrow-down'
import Button from '@ingka/button'
import { click } from 'utils/tracker'

require('./VideoHeroV2.scss')

const VIDEO_URL = `${process.env.GATSBY_ASSET_BUCKET}/videos/learn-more-morpheus-hero-video.mp4`

export const VideoHeroV2: React.FunctionComponent = () => {
    const { t } = useTranslation(['dashboard', 'learnmore'])

    const videoRef = useRef<HTMLVideoElement>(null)

    const scrollToContent = () => {
        const contentElement = document.getElementById('EmptyShowroomsTitle')
        contentElement?.scrollIntoView({ behavior: 'smooth', inline: 'start' })
        click('Dashboard.GetStartedClick', { AccessFrom: 'HeroBanner' })
    }

    return (
        <div className="VideoHero">
            <div className="heroContainer">
                <div className="heroTextContainer">
                    <div className="heroText">
                        <div className="ikeaKreativ">
                            <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                            <p>{t('learnmore:learnmore.ikea kreativ')}</p>
                        </div>
                        <h1>
                            <p className="heroTagline">{t('learnmore:learnmore.reimagine your home')}</p>
                        </h1>
                    </div>
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
                    data-testid="dashboard-hero-video"
                    emphasised={false}
                    additionalControls="bottomTrailing"
                />

                <Button
                    type="primary"
                    className="videoHeroCta"
                    text={t('learnmore:learnmore.get started')}
                    iconPosition="trailing"
                    ssrIcon={arrowDown}
                    inverseTheme
                    onClick={scrollToContent}
                />
            </div>
        </div>
    )
}
