/* eslint-disable jsx-a11y/media-has-caption */

import React, { useState, useRef } from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import Modal, { ModalHeader, Theatre } from '@ingka/modal'

import play from '@ingka/ssr-icon/paths/play'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import Button from '@ingka/button'
import { GATrackingInfoProps } from 'models/tracking'
import { click } from 'utils/tracker'
import { ACCESS_FROM_HERO } from 'models/tracking/constants'
import './Hero.scss'
import { useTranslation } from 'react-i18next'

interface Props {
    isMobile: boolean
    imgSrc: (arg0: string) => string
    trackGaEvent: (trackingInfo: GATrackingInfoProps) => void
    isMorpheusEnabled?: boolean
}
const Hero = ({ isMobile, imgSrc, trackGaEvent, isMorpheusEnabled }: Props) => {
    const [viewVideoModal, setViewVideoModal] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const { t } = useTranslation('learnmore')

    const kreativVideoLink = isMobile
        ? `${process.env.GATSBY_ASSET_BUCKET}/videos/learn_more_video_mobile_1080.mp4`
        : `${process.env.GATSBY_ASSET_BUCKET}/videos/learn_more_video_desktop_1080.mp4`

    const playVideo = () => {
        const trackingInfo = {
            action: 'learnmore_watch_video_click',
            label: 'hero',
        }
        trackGaEvent(trackingInfo)
        click('LearnMore.WatchVideoClick', { AccessFrom: ACCESS_FROM_HERO })
        setViewVideoModal(!viewVideoModal)
        const videoElement = videoRef && videoRef.current
        if (videoElement && videoElement.paused) {
            videoElement.play()
        }
    }

    return (
        <div className={classNames('Hero', { isMobile })}>
            <div className="heroContainer">
                <img src={imgSrc('hero_mobile.jpg')} alt={t('learnmore.living room')} className="heroImage" />
                <div className="heroText">
                    <div className="ikeaKreativ">
                        <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                        <p>{t('learnmore.ikea kreativ')}</p>
                    </div>
                    <h1>
                        <p className="heroTagline">
                            {t(isMorpheusEnabled ? 'learnmore.reimagine your home' : 'learnmore.bring your ideal')}{' '}
                        </p>
                    </h1>

                    <Button type="primary" onClick={playVideo} inverseTheme={!isMobile}>
                        <SSRIcon className="heroPlayIcon" paths={play} />
                        <p>{t('learnmore.watch video')}</p>
                    </Button>
                </div>
            </div>

            <Modal className="videoModal" handleCloseBtn={() => setViewVideoModal(false)} visible={viewVideoModal}>
                <Theatre className="theatreModal" header={<ModalHeader floating />}>
                    <div className="learnMoreVideo">
                        <video ref={videoRef} autoPlay controls poster={imgSrc('videoPoster.jpg')} playsInline>
                            <source src={kreativVideoLink} type="video/mp4" />
                            <track />
                        </video>
                    </div>
                </Theatre>
            </Modal>
        </div>
    )
}

export default Hero
