/* eslint-disable i18next/no-literal-string */

import React, { useRef } from 'react'
import { graphql, withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'

import Carousel from '@ingka/carousel'
import Image from '@ingka/image'
import Badge from '@ingka/badge'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import Button from '@ingka/button'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import { Typography } from '@ingka/typography-shared'
import { AfterFoldSessionKeyType } from 'models/sessionStorage'
import { useScrollTracking } from 'hooks'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'

import { generateRoomLink } from 'models/location/selectors'
import { SocialCarouselPost, SocialCarouselSectionData } from './SocialCarouselSection.types'
import './SocialCarouselSection.scss'

type CardClick = 'badge' | 'card'

export const SocialCarouselSection: React.FC<SocialCarouselSectionData> = ({
    id,
    slug,
    title,
    subtitle,
    posts,
    tracking,
}) => {
    const { isMobile } = useSugarcubeContext()
    const { t } = useTranslation('campaigns')
    const socialSectionRef = useRef<HTMLDivElement | null>(null)

    useScrollTracking(
        socialSectionRef,
        `ScrolledPast:SocialCarouselSection/${slug}` as AfterFoldSessionKeyType,
        tracking?.onSocialSectionScrollPast?.mixPanel?.section,
        slug,
        0.55,
    )

    const onCardClick = (from: CardClick, card: SocialCarouselPost) => {
        if (from === 'badge') {
            click(
                card.tracking.onPostUsernameClick.mixPanel.eventName,
                card.tracking.onPostUsernameClick.mixPanel.metadata,
            )
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: card.tracking.onPostUsernameClick.ga.action,
                label: card.tracking.onPostUsernameClick.ga.label,
                custom: card.tracking.onPostUsernameClick.ga.custom,
            })
        } else if (from === 'card') {
            click(card.tracking.onPostCardClick.mixPanel.eventName, card.tracking.onPostCardClick.mixPanel.metadata)
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: card.tracking.onPostCardClick.ga.action,
                label: card.tracking.onPostCardClick.ga.label,
                custom: card.tracking.onPostCardClick.ga.custom,
            })
        }

        if (card.CompositionUuid) {
            const url = generateRoomLink(`/share/${card.CompositionUuid}/`)
            window.location.assign(url)
        }
    }

    return isMobile ? null : (
        <section className="SocialCarouselSection" id={id} ref={socialSectionRef}>
            <div className="header">
                <div className="title">
                    <h2 className={Typography.Heading.XL}>{t(title)}</h2>
                </div>
                <div className="subtitle">
                    <p className={Typography.Body.L}>{t(subtitle)}</p>
                </div>
            </div>

            <Carousel id="social-carousel">
                {posts.map((post) => (
                    <div className="socialCard" onClick={() => onCardClick('card', post)}>
                        <div
                            onClick={(e) => {
                                e.stopPropagation()
                                onCardClick('badge', post)
                            }}
                        >
                            <Badge label={t(post.username).toString()} />
                        </div>
                        <Image
                            alt={t(post.alt).toString()}
                            src={withPrefix(`/images/graphics/campaigns/${post.image}`)}
                            className="cardImage"
                        />

                        <Button
                            expanding
                            href=""
                            iconPosition="leading"
                            size="medium"
                            text={t(post.cta.text.web).toString()}
                            type="primary"
                            ssrIcon={arrowRight}
                            className="buttonContainer"
                            onClick={(e: { stopPropagation: () => void }) => {
                                e.stopPropagation()
                                onCardClick('card', post)
                            }}
                        />
                    </div>
                ))}
            </Carousel>
        </section>
    )
}

export const SocialCarouselFragment = graphql`
    fragment SocialCarouselFragment on CampaignsJsonSections {
        type
        id
        title
        subtitle
        tracking
        posts {
            image
            alt
            username
            tracking
            CompositionUuid
            cta {
                text {
                    web
                    mobile
                }
                url
            }
        }
    }
`
