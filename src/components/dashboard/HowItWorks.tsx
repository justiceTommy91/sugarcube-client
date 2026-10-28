import React, { useCallback, useEffect, useRef, useState } from 'react'
import { withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'

import SimpleVideo from '@ingka/simple-video'
import Image from '@ingka/image'
import { Typography } from '@ingka/typography-shared'

import { useScrollTracking } from 'hooks'
import { click } from 'utils/tracker'
import { TRACK_LOCATION_DASHBOARD } from 'models/tracking/constants'
import { USER_SCROLLED_PAST_DESIGN_NOW } from 'models/sessionStorage/constants'
import { DashboardKeys } from 'types/i18next'
import AspectRatioBox from '@ingka/aspect-ratio-box'

import { HowItWorksGrid } from './HowItWorksGrid'
import './HowItWorks.scss'

export const TRACKING_HOW_IT_WORKS_SECTION = 'HowItWorks'

const SLIDE_DURATION_IMAGE = 4000 // 4 seconds for image slides
const TOTAL_SLIDES = 3

type SlideContent = {
    id: number
    titleKey: string
    descriptionKey: string
    type: 'grid' | 'video' | 'image'
}

const SLIDES: SlideContent[] = [
    {
        id: 1,
        titleKey: 'dashboard.how it works.step 1.title',
        descriptionKey: 'dashboard.how it works.step 1.description',
        type: 'grid',
    },
    {
        id: 2,
        titleKey: 'dashboard.how it works.step 2.title',
        descriptionKey: 'dashboard.how it works.step 2.description',
        type: 'video',
    },
    {
        id: 3,
        titleKey: 'dashboard.how it works.step 3.title',
        descriptionKey: 'dashboard.how it works.step 3.description',
        type: 'image',
    },
]

export const HowItWorks: React.FC = () => {
    const { t } = useTranslation('dashboard')
    const componentId = React.useId()
    const [currentSlide, setCurrentSlide] = useState(0)
    const [progress, setProgress] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const howItWorksRef = useRef<HTMLDivElement | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const pausedProgressRef = useRef<number>(0)

    useScrollTracking(
        howItWorksRef,
        USER_SCROLLED_PAST_DESIGN_NOW,
        TRACKING_HOW_IT_WORKS_SECTION,
        TRACK_LOCATION_DASHBOARD,
    )

    const clearIntervals = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
        }
    }, [])

    // Track visibility and reset to step 1 when component goes out of view
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    // Component is out of view, reset to step 1
                    setIsVisible(false)
                    clearIntervals()
                    setCurrentSlide(0)
                    setProgress(0)

                    // Pause video if playing
                    if (videoRef.current) {
                        videoRef.current.pause()
                        videoRef.current.currentTime = 0
                    }
                } else {
                    // Component is in view
                    setIsVisible(true)
                    // Reset to step 1
                    setCurrentSlide(0)
                    setProgress(0)
                }
            },
            {
                threshold: 0.1, // Trigger when 10% is visible
                // eslint-disable-next-line i18next/no-literal-string
                rootMargin: '0px',
            },
        )

        if (howItWorksRef.current) {
            observer.observe(howItWorksRef.current)
        }

        return () => {
            if (howItWorksRef.current) {
                observer.unobserve(howItWorksRef.current)
            }
        }
    }, [clearIntervals])

    const startProgressBar = useCallback(
        (duration: number, startFrom: number) => {
            setProgress(startFrom)
            clearIntervals()

            const progressStep = 100 / (duration / 50) // Update every 50ms

            progressIntervalRef.current = setInterval(() => {
                setProgress((prev) => {
                    const newProgress = prev + progressStep
                    if (newProgress >= 100) {
                        if (progressIntervalRef.current) {
                            clearInterval(progressIntervalRef.current)
                            progressIntervalRef.current = null
                        }
                        return 100
                    }
                    return newProgress
                })
            }, 50)
        },
        [clearIntervals],
    )

    const goToNextSlide = useCallback(() => {
        setCurrentSlide((prev) => {
            const nextSlide = prev + 1
            if (nextSlide >= TOTAL_SLIDES) {
                clearIntervals()
                return prev // Stay on last slide
            }

            click('Dashboard.HowItWorksSlideChange', {
                FromSlide: prev + 1,
                ToSlide: nextSlide + 1,
            })

            return nextSlide
        })
    }, [clearIntervals])

    const handleVideoEnd = useCallback(() => {
        goToNextSlide()
    }, [goToNextSlide])

    const handleStepButtonClick = useCallback(
        (slideIndex: number) => {
            if (slideIndex === currentSlide) return // Don't do anything if clicking current slide

            // Pause and reset video if currently playing
            if (videoRef.current && SLIDES[currentSlide].type === 'video') {
                videoRef.current.pause()
                videoRef.current.currentTime = 0
            }

            clearIntervals()

            click('Dashboard.HowItWorksManualSlideChange', {
                FromSlide: currentSlide + 1,
                ToSlide: slideIndex + 1,
            })

            setCurrentSlide(slideIndex)
        },
        [currentSlide, clearIntervals],
    )

    useEffect(() => {
        // Only start auto-play if component is visible
        if (!isVisible) return

        const currentSlideData = SLIDES[currentSlide]

        // Reset progress when changing slides
        setProgress(0)
        pausedProgressRef.current = 0

        if (currentSlideData.type === 'grid' || currentSlideData.type === 'image') {
            // For image slides, use 4 second timer
            startProgressBar(SLIDE_DURATION_IMAGE, 0)
            intervalRef.current = setTimeout(() => {
                goToNextSlide()
            }, SLIDE_DURATION_IMAGE)
        } else if (currentSlideData.type === 'video' && videoRef.current) {
            // For video, start progress based on video duration
            const video = videoRef.current

            // Handle metadata loaded to get the actual video duration
            const handleLoadedMetadata = () => {
                const videoDuration = video.duration * 1000
                if (!Number.isNaN(videoDuration) && videoDuration > 0) {
                    startProgressBar(videoDuration, pausedProgressRef.current as number)
                }
            }

            // Handle video play event
            const handlePlay = () => {
                const videoDuration = video.duration * 1000
                if (!Number.isNaN(videoDuration) && videoDuration > 0) {
                    // Resume from where it was paused
                    startProgressBar(videoDuration, pausedProgressRef.current as number)
                }
            }

            // Handle video pause event
            const handlePause = () => {
                // Save current progress when pausing
                setProgress((currentProgress) => {
                    pausedProgressRef.current = currentProgress
                    return currentProgress
                })
                clearIntervals()
            }

            video.addEventListener('loadedmetadata', handleLoadedMetadata)
            video.addEventListener('play', handlePlay)
            video.addEventListener('pause', handlePause)

            video.play().catch(() => {
                // Ignore error
            })

            // eslint-disable-next-line consistent-return
            return () => {
                video.removeEventListener('loadedmetadata', handleLoadedMetadata)
                video.removeEventListener('play', handlePlay)
                video.removeEventListener('pause', handlePause)
            }
        }

        // eslint-disable-next-line consistent-return
        return () => {
            clearIntervals()
            // Pause video when leaving the slide
            if (videoRef.current) {
                videoRef.current.pause()
            }
        }
    }, [currentSlide, isVisible, startProgressBar, goToNextSlide, clearIntervals])

    const renderSlideContent = () => {
        const currentSlideData = SLIDES[currentSlide]

        switch (currentSlideData.type) {
            case 'grid':
                return (
                    <div className="howItWorksGridContainer">
                        <HowItWorksGrid />
                    </div>
                )
            case 'video':
                return (
                    <div className="videoContainer">
                        <AspectRatioBox ratio="1:1">
                            <SimpleVideo
                                ref={videoRef}
                                src={`${process.env.GATSBY_ASSET_BUCKET}/videos/how-it-works-video.mp4`}
                                type="video/mp4"
                                className="howItWorksVideo"
                                descriptionId={t(currentSlideData.descriptionKey as DashboardKeys).toString()}
                                descriptionBody={t(currentSlideData.titleKey as DashboardKeys).toString()}
                                additionalControls="bottomTrailing"
                                playAriaLabel={t('dashboard.play')}
                                pauseAriaLabel={t('dashboard.pause')}
                                muted
                                loop={false}
                                autoPlay
                                onEnded={handleVideoEnd}
                                playsInline
                                emphasised={false}
                                controls={false}
                                poster={withPrefix('/images/graphics/dashboard/how-it-works-2.jpg')}
                            />
                        </AspectRatioBox>
                    </div>
                )
            case 'image':
                return (
                    <div className="imageContainer">
                        <Image
                            src={withPrefix('/images/graphics/dashboard/how-it-works-3.jpg')}
                            alt={t('dashboard.how it works.alt.step 3')}
                            className="howItWorksImage"
                        />
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="HowItWorks" ref={howItWorksRef}>
            <div className="contentArea">
                <div className="slideContent">{renderSlideContent()}</div>

                <div className="stepsSection">
                    <div className="header">
                        <h2 className={Typography.Heading.XL}>{t('dashboard.how it works.title')}</h2>
                    </div>

                    <div className="stepsWrapper">
                        {SLIDES.map((slide, index) => (
                            <div
                                key={`${componentId}-step`}
                                className={`step ${index === currentSlide ? 'active' : ''} ${
                                    index < currentSlide ? 'completed' : ''
                                }`}
                            >
                                <button
                                    className="stepContent"
                                    onClick={() => handleStepButtonClick(index)}
                                    aria-label={t(slide.titleKey as DashboardKeys).toString()}
                                >
                                    <div className="stepNumber">
                                        <span className={Typography.Label.L}>{index + 1}</span>
                                    </div>

                                    <div className="stepInfo">
                                        <h3 className={Typography.Heading.M}>{t(slide.titleKey as DashboardKeys)}</h3>
                                        <p className={Typography.Body.M}>{t(slide.descriptionKey as DashboardKeys)}</p>
                                    </div>
                                </button>

                                {index < TOTAL_SLIDES - 1 && (
                                    <div className="verticalProgressContainer">
                                        <div
                                            className={`verticalProgressBar ${index === currentSlide ? 'active' : ''}`}
                                            style={{
                                                height:
                                                    index < currentSlide
                                                        ? '100%' // Completed steps show full bar
                                                        : index === currentSlide
                                                        ? `${progress}%` // Current step shows progress
                                                        : '0%', // Future steps show empty
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
