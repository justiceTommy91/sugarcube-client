import { useTranslation } from 'react-i18next'
import { graphql, navigate } from 'gatsby'
import React, { useCallback, useRef } from 'react'
import classNames from 'classnames'
import arrowDown from '@ingka/ssr-icon/paths/arrow-down'
import SimpleVideo from '@ingka/simple-video'
import AspectRatioBox from '@ingka/aspect-ratio-box'
import mobileHandover from '@ingka/ssr-icon/paths/mobile-handover'
import Card, { ContentCard } from '@ingka/card'

import { useScrollTracking } from 'hooks'
import { getAppStoreUrl } from 'utils/buildUrls'
import { navigateExternal } from 'models/location/helpers'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { AfterFoldSessionKeyType } from 'models/sessionStorage'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { handleVideoError } from 'utils/handleVideoError'
import {
    APP_STORE_SOURCE_WEB_CAMPAIGN,
    GA_CATEGORY_DYH_SUGARCUBE,
    TRACK_LOCATION_CAMPAIGN,
} from 'models/tracking/constants'

import type { HeroSectionData } from '.'
import './HeroSection.scss'

export const HeroSection: React.FC<HeroSectionData> = (data) => {
    const { id, title, body, cta, media, tracking, alt, poster, backgroundColor, hideCta } = data
    const { isMobile } = useSugarcubeContext()
    const { t } = useTranslation(['dashboard', 'campaigns'])
    const heroRef = useRef<HTMLDivElement | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)

    useScrollTracking(
        heroRef,
        `ScrolledPast:HeroSection/${data.slug}` as AfterFoldSessionKeyType,
        tracking.onHeroScrollPast.mixPanel.section,
        data.slug,
    )

    const appStoreLink = getAppStoreUrl({
        source: APP_STORE_SOURCE_WEB_CAMPAIGN,
        route: cta.mobileUrl,
    })

    const onCardClick = useCallback(() => {
        if (hideCta) {
            return
        }
        const trackInfo = () => {
            click(tracking.onHeroCardClick.mixPanel.eventName, tracking.onHeroCardClick.mixPanel.metadata)
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: tracking.onHeroCardClick.ga.action,
                label: tracking.onHeroCardClick.ga.label,
            })
        }

        if (isMobile) {
            navigateExternal(appStoreLink, {
                before: async () => {
                    await Promise.all([trackInfo()])
                },
            })
        } else if (!cta.url.includes('/') && cta.url.includes('#')) {
            trackInfo()
            setTimeout(() => {
                const element = document.getElementById(cta.url.replace('#', ''))

                if (element) {
                    element.scrollIntoView({ block: 'start', behavior: 'smooth' })
                }
            }, 100)
        } else {
            trackInfo()
            navigate(cta.url)
        }
    }, [isMobile])

    const trackPlayPause = () => {
        const playedVideoRef = videoRef?.current
        click(tracking.onHeroPlayPause.mixPanel.eventName, {
            ...tracking.onHeroPlayPause.mixPanel.metadata,
            isPlaying: !playedVideoRef?.paused,
        })
    }

    return (
        <section className={classNames('HeroSection', { hideCta })} id={id} ref={heroRef}>
            <Card
                content={
                    <ContentCard
                        id={title}
                        title={t(`campaigns:${title}`).toString()}
                        body={t(`campaigns:${body}`).toString()}
                        onCardClick={onCardClick}
                        titleHeadingTag="h1"
                        buttonProps={
                            hideCta
                                ? undefined
                                : {
                                      text: isMobile
                                          ? t(`campaigns:${cta?.text.mobile}`).toString()
                                          : t(`campaigns:${cta?.text.web}`).toString(),
                                      ssrIcon: isMobile ? mobileHandover : arrowDown,
                                      iconPosition: isMobile ? 'leading' : 'trailing',
                                  }
                        }
                        theme="extendedPalette05"
                        className={classNames('hero-content-card', {
                            [backgroundColor as string]: backgroundColor,
                        })}
                    />
                }
                mediaPosition="leading"
                media={
                    <AspectRatioBox ratio="16:9" onClick={trackPlayPause}>
                        <SimpleVideo
                            preload="metadata"
                            aria-label={alt}
                            ref={videoRef}
                            descriptionId={alt}
                            src={`${process.env.GATSBY_ASSET_BUCKET}${media}`}
                            type="video/mp4"
                            className="media"
                            playAriaLabel={t('dashboard:dashboard.play')}
                            pauseAriaLabel={t('dashboard:dashboard.pause')}
                            descriptionBody={t(`campaigns:${alt}`, { defaultValue: alt })}
                            muted
                            loop
                            autoPlay
                            onError={() =>
                                handleVideoError(videoRef.current, {
                                    section: TRACK_LOCATION_CAMPAIGN,
                                })
                            }
                            playsInline
                            emphasised={false}
                            additionalControls="bottomTrailing"
                            poster={poster}
                        />
                    </AspectRatioBox>
                }
            />
        </section>
    )
}

export const HeroSectionFragment = graphql`
    fragment HeroSectionFragment on CampaignsJsonSections {
        id
        type
        media
        alt
        title
        body
        backgroundColor
        hideCta
        cta {
            text {
                web
                mobile
            }
            url
            mobileUrl
        }
        tracking
    }
`
