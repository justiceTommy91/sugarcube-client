import React, { useCallback, useEffect, useRef, useState } from 'react'
import { navigate, withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'
import { useAppSelector, useElementInViewport, useScrollTracking } from 'hooks'

import Carousel from '@ingka/carousel'
import SSRIcon from '@ingka/ssr-icon'
import Card, { ContentCard } from '@ingka/card'
import SimpleVideo from '@ingka/simple-video'
import arrowDown from '@ingka/ssr-icon/paths/arrow-down'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import AspectRatioBox from '@ingka/aspect-ratio-box'

import { click } from 'utils/tracker'
import { DESIGN_NOW_HASH } from 'models/location/constants'
import { ACCESS_FROM_CAROUSEL_HERO_BANNER, TRACK_LOCATION_DASHBOARD } from 'models/tracking/constants'
import { USER_SCROLLED_PAST_HERO } from 'models/sessionStorage/constants'
import { getShowAppDownloadModal } from 'models/ui/selectors'
import { handleVideoError } from 'utils/handleVideoError'
import './Carousel.scss'

export const TRACKING_HERO_SECTION = 'CarouselHero'

const NUM_ITEMS = 2

const CarouselSlideshow: React.FC = () => {
    const [slideIndex, setSlideIndex] = useState(0)

    const { t } = useTranslation('dashboard')

    const video1ref = useRef<HTMLVideoElement | null>(null)
    const video2ref = useRef<HTMLVideoElement | null>(null)
    const carouselRef = useRef<Carousel | null>(null)
    const carouselHeroRef = useRef<HTMLDivElement | null>(null)
    const isCarouselVisible = useElementInViewport(carouselHeroRef.current)

    const videoRefs = [video1ref, video2ref]
    const activeVideo = videoRefs[slideIndex]

    const isAppDownloadModalVisible = useAppSelector(getShowAppDownloadModal)

    useScrollTracking(carouselHeroRef, USER_SCROLLED_PAST_HERO, TRACKING_HERO_SECTION, TRACK_LOCATION_DASHBOARD)

    const setAndTrackSlideChange = useCallback(
        (slide: number, auto?: boolean) => {
            setSlideIndex(slide)

            if (isCarouselVisible && !auto) {
                click('Dashboard.HeroSlideChanges', {
                    SlideIndex: slide,
                })
            }
        },
        [click, isCarouselVisible],
    )

    const prevButtonClick = useCallback(
        (auto: boolean) => {
            const targetIndex = slideIndex > 0 ? slideIndex - 1 : 0

            const currentVid = videoRefs[slideIndex].current
            if (currentVid) {
                currentVid.pause()
                currentVid.currentTime = 0
            }

            const targetVid = videoRefs[targetIndex].current
            if (targetVid) {
                targetVid.currentTime = 0
                targetVid.play()
            }

            setAndTrackSlideChange(targetIndex, auto)
        },
        [slideIndex, setAndTrackSlideChange],
    )

    const nextButtonClick = useCallback(
        (auto: boolean) => {
            const targetIndex = slideIndex < NUM_ITEMS - 1 ? slideIndex + 1 : 0

            const currentVid = videoRefs[slideIndex].current
            if (currentVid) {
                currentVid.pause()
                currentVid.currentTime = 0
            }

            const targetVid = videoRefs[targetIndex].current
            if (targetVid) {
                targetVid.currentTime = 0
                targetVid.play()
            }

            setAndTrackSlideChange(targetIndex, auto)
        },
        [slideIndex, setAndTrackSlideChange],
    )

    const onVideoEnd = (idx: number) => {
        const isLastSlide = idx === NUM_ITEMS - 1
        if (isLastSlide) {
            if (activeVideo.current) {
                activeVideo.current?.pause()
                activeVideo.current.currentTime = 0
            }
            videoRefs[0].current?.play()
            setAndTrackSlideChange(0, true)
        } else {
            nextButtonClick(true)
        }
    }

    const onGetStartedClick = (idx: number, customUrl?: string) => {
        click('Dashboard.GetStartedClick', {
            SlideIndex: idx,
            AccessFrom: ACCESS_FROM_CAROUSEL_HERO_BANNER,
        })
        const element = document.getElementById(DESIGN_NOW_HASH)

        if (element && !customUrl) {
            try {
                element.scrollIntoView({ block: 'start', behavior: 'smooth' })
            } catch {
                element.scrollIntoView(true)
            }
        } else if (customUrl) {
            navigate(customUrl)
        }
    }

    const trackPlayPause = (slide: number) => {
        const playedVideoRef = videoRefs[slide]?.current
        click('Dashboard.HeroPlayPause', {
            isPlaying: !playedVideoRef?.paused,
            SlideIndex: slide,
            AccessFrom: ACCESS_FROM_CAROUSEL_HERO_BANNER,
        })
    }

    const handleVideoStatus = useCallback(() => {
        if (isAppDownloadModalVisible) {
            activeVideo.current?.pause()
        } else {
            activeVideo.current?.play()
        }
    }, [isAppDownloadModalVisible])

    useEffect(() => {
        handleVideoStatus()
    }, [handleVideoStatus])

    const slides = [
        // Slide 0
        <Card
            key="slide-0"
            content={
                <ContentCard
                    id="card-visualize-your-dream-space"
                    title={t('dashboard.visualize your dream space')}
                    body={t('dashboard.search or browse the catalog')}
                    onCardClick={() => onGetStartedClick(0)}
                    titleHeadingTag="h1"
                    buttonProps={{
                        text: t('dashboard.get started'),
                        ssrIcon: arrowDown,
                        // eslint-disable-next-line i18next/no-literal-string
                        iconPosition: 'leading',
                    }}
                />
            }
            mediaPosition="leading"
            media={
                <AspectRatioBox ratio="16:9" onClick={() => trackPlayPause(0)}>
                    <SimpleVideo
                        // eslint-disable-next-line i18next/no-literal-string
                        preload="metadata"
                        ref={video1ref}
                        descriptionId={t('dashboard.search or browse the catalog')}
                        src={`${process.env.GATSBY_ASSET_BUCKET}/videos/dream-space.mp4`}
                        type="video/mp4"
                        className="media"
                        playAriaLabel={t('dashboard.play')}
                        pauseAriaLabel={t('dashboard.pause')}
                        descriptionBody={t('dashboard.visualize your dream space')}
                        muted
                        loop={false}
                        autoPlay
                        onEnded={() => onVideoEnd(0)}
                        poster={withPrefix('/images/graphics/dashboard/slide-carousel-1.jpg')}
                        onError={() =>
                            handleVideoError(video1ref.current, {
                                section: TRACK_LOCATION_DASHBOARD,
                                slideIndex: 0,
                            })
                        }
                        playsInline
                        emphasised={false}
                        additionalControls="bottomTrailing"
                    />
                </AspectRatioBox>
            }
        />,
        <Card
            key="slide-final"
            content={
                <ContentCard
                    id="card-bring-your-vision-to-life"
                    title={t('dashboard.bring your vision to life')}
                    body={t('dashboard.explore products in a true to scale scan of your space')}
                    onCardClick={() => onGetStartedClick(1)}
                    titleHeadingTag="h1"
                    buttonProps={{
                        text: t('dashboard.get started'),
                        ssrIcon: arrowDown,
                        // eslint-disable-next-line i18next/no-literal-string
                        iconPosition: 'leading',
                    }}
                />
            }
            mediaPosition="leading"
            media={
                <AspectRatioBox ratio="16:9" onClick={() => trackPlayPause(1)}>
                    <SimpleVideo
                        // eslint-disable-next-line i18next/no-literal-string
                        preload="metadata"
                        ref={video2ref}
                        descriptionId={t('dashboard.explore products in a true to scale scan of your space')}
                        src={`${process.env.GATSBY_ASSET_BUCKET}/videos/carousel-2.mp4`}
                        type="video/mp4"
                        className="media"
                        playAriaLabel={t('dashboard.play')}
                        pauseAriaLabel={t('dashboard.pause')}
                        descriptionBody={t('dashboard.bring your vision to life')}
                        muted
                        loop={false}
                        autoPlay
                        onEnded={() => onVideoEnd(1)}
                        poster={withPrefix('/images/graphics/dashboard/slide-carousel-2.jpg')}
                        onError={() =>
                            handleVideoError(video2ref.current, {
                                section: TRACK_LOCATION_DASHBOARD,
                                slideIndex: 1,
                            })
                        }
                        playsInline
                        emphasised={false}
                        additionalControls="bottomTrailing"
                    />
                </AspectRatioBox>
            }
        />,
    ].filter((slide): slide is React.ReactElement => slide !== null) // Removing null/undefined values

    return (
        <div className="CarouselSlideshow" data-testid="dashboard-header-video" ref={carouselHeroRef}>
            <div className="ikeaKreativ">
                <SSRIcon className="paintBrushIcon" paths={paintbrush} />
                <p>{t('dashboard.ikea kreativ')}</p>
            </div>

            <Carousel
                id="dashboard-carousel"
                controlBtnType="primary"
                isSlideShow
                slideIndex={slideIndex}
                onBtnLeftClick={() => prevButtonClick(false)}
                onBtnRightClick={() => nextButtonClick(false)}
                ref={carouselRef}
            >
                {slides}
            </Carousel>
        </div>
    )
}

export default CarouselSlideshow
