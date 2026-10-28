import React, { useCallback } from 'react'
import { withPrefix } from 'gatsby'
import { Trans, useTranslation } from 'react-i18next'

import Button from '@ingka/button'
import Card, { ContentCard } from '@ingka/card'
import SSRIcon from '@ingka/ssr-icon'
import cube3d from '@ingka/ssr-icon/paths/cube-3d'
import link from '@ingka/ssr-icon/paths/link'
import Tag from '@ingka/tag'

import { GetAppButton } from 'components/dashboard/GetAppButton'
import { generateRoomLink } from 'models/location/selectors'
import { ACTION_NAVIGATOR_SHARE_FAILED, TRACK_SOURCE_FULL_EXPERIENCE_CAROUSEL } from 'models/tracking/constants'
import toastsService, { ToastType } from 'services/toasts'
import * as tracker from 'utils/tracker'
import './FullExperienceCarousel.scss'

export const FullExperienceCarousel = () => {
    const { t } = useTranslation()

    const handleShareRoombuilder = useCallback(async () => {
        const currentSearch = typeof window !== 'undefined' ? window.location.search : ''
        const url = generateRoomLink('/room-builder') + currentSearch
        if (navigator.share) {
            try {
                await navigator.share({ url })
            } catch (e) {
                if (e instanceof Error && e.name === 'AbortError') {
                    return
                }
                tracker.error(ACTION_NAVIGATOR_SHARE_FAILED, {
                    Source: TRACK_SOURCE_FULL_EXPERIENCE_CAROUSEL,
                    Error: e instanceof Error ? e.message : String(e),
                })
                toastsService.showToast({ toastType: ToastType.NAVIGATOR_SHARE_FAILED })
            }
        }
    }, [])

    return (
        <div className="FullExperienceCarousel">
            <div className="FullExperienceCarousel__description-container">
                <SSRIcon className="FullExperienceCarousel__icon" paths={cube3d} width={32} height={32} />
                <h5 className="UploadSection__heading">
                    <Trans i18nKey="design.kreativLite.full experience.heading">
                        Scan or build a room.
                        <br />
                        Then design in 3D.
                    </Trans>
                </h5>
                <p className="FullExperienceCarousel__description">
                    {t('design.kreativLite.full experience.description')}
                </p>
            </div>
            <div className="FullExperienceCarousel__cards">
                <Card
                    className="FullExperienceCarousel__card FullExperienceCarousel__card--app"
                    content={
                        <ContentCard
                            id="FullExperienceCarouselCard-1"
                            className="FullExperienceCarousel__card-content FullExperienceCarousel__card-content--app"
                            size="small"
                            fixed
                            title={t('design.kreativLite.full experience.app.heading')}
                            titleHeadingTag="h5"
                        >
                            <ul>
                                <Trans i18nKey="design.kreativLite.full experience.app.description">
                                    <li>First point</li>
                                    <li>Second point</li>
                                    <li>Third point</li>
                                </Trans>
                            </ul>
                            <GetAppButton
                                className="FullExperienceCarousel__card-button"
                                customCtaText={t('design.kreativLite.full experience.app.cta')}
                                iconPosition="leading"
                                type="secondary"
                                fluid
                                size="small"
                            />
                        </ContentCard>
                    }
                    mediaPosition="trailing"
                    media={
                        <div className="FullExperienceCarousel__card-media">
                            <Tag
                                label={t('design.kreativLite.full experience.app.badge')}
                                className="FullExperienceCarousel__card-badge"
                                role="presentation"
                                tabIndex={-1}
                            />
                            <video
                                src={`${process.env.GATSBY_ASSET_BUCKET}/videos/mobile-kreativ-lite-full-experience-app.mp4`}
                                poster={withPrefix('images/kreativLite/mobile/fullExperienceApp.jpg')}
                                className="FullExperienceCarousel__card-image"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                            <span className="FullExperienceCarousel__card-disclaimer">
                                {t('design.kreativLite.full experience.app.disclaimer')}
                            </span>
                        </div>
                    }
                />
                <Card
                    className="FullExperienceCarousel__card"
                    content={
                        <ContentCard
                            id="FullExperienceCarouselCard-2"
                            className="FullExperienceCarousel__card-content FullExperienceCarousel__card-content--desktop"
                            size="small"
                            fixed
                            title={t('design.kreativLite.full experience.desktop.heading')}
                            titleHeadingTag="h5"
                        >
                            <ul>
                                <Trans i18nKey="design.kreativLite.full experience.desktop.description">
                                    <li>First point</li>
                                    <li>Second point</li>
                                    <li>Third point</li>
                                </Trans>
                            </ul>
                            <Button
                                className="FullExperienceCarousel__card-button"
                                text={t('design.kreativLite.full experience.desktop.cta')}
                                ssrIcon={link}
                                iconPosition="leading"
                                type="secondary"
                                fluid
                                size="small"
                                onClick={handleShareRoombuilder}
                            />
                        </ContentCard>
                    }
                    mediaPosition="trailing"
                    media={
                        <div className="FullExperienceCarousel__card-media">
                            <Tag
                                label={t('design.kreativLite.full experience.desktop.badge')}
                                className="FullExperienceCarousel__card-badge"
                                role="presentation"
                                tabIndex={-1}
                            />
                            <video
                                src={`${process.env.GATSBY_ASSET_BUCKET}/videos/mobile-kreativ-lite-full-experience-desktop.mp4`}
                                poster={withPrefix('images/kreativLite/mobile/fullExperienceDesktop.jpg')}
                                className="FullExperienceCarousel__card-image"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        </div>
                    }
                />
            </div>
        </div>
    )
}
