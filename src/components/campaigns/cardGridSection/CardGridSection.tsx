import React, { useRef } from 'react'
import { graphql, withPrefix } from 'gatsby'
import classNames from 'classnames'
import { useScrollTracking } from 'hooks'
import { useTranslation } from 'react-i18next'
import Image from '@ingka/image'
import CompactCard from '@ingka/compact-card'
import { Typography } from '@ingka/typography-shared'
import { generateRoomLink } from 'models/location/selectors'
import { AfterFoldSessionKeyType } from 'models/sessionStorage'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { APP_STORE_SOURCE_WEB_CAMPAIGN, GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { getAppStoreUrl } from 'utils/buildUrls'
import { navigateExternal } from 'models/location/helpers'

import { CardGridItem, CardGridSectionData } from './CardGridSection.types'

import './CardGridSection.scss'

export const CardGridSection: React.FC<CardGridSectionData> = ({ id, title, subtitle, slug, cards, tracking }) => {
    const { isMobile } = useSugarcubeContext()
    const cardGridRef = useRef<HTMLDivElement | null>(null)
    const { t } = useTranslation('campaigns')

    useScrollTracking(
        cardGridRef,
        `ScrolledPast:CardGridSection/${slug}` as AfterFoldSessionKeyType,
        tracking?.onCardGridScrollPast?.mixPanel?.section,
        slug,
        0.55,
    )

    const onCardClick = (card: CardGridItem, e: React.MouseEvent<HTMLAnchorElement | HTMLImageElement, MouseEvent>) => {
        e.preventDefault()
        const trackCardClick = () => {
            click(card.tracking.onCardClick.mixPanel.eventName, card.tracking.onCardClick.mixPanel.metadata)
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: card.tracking.onCardClick.ga.action,
                label: card.tracking.onCardClick.ga.label,
                custom: card.tracking.onCardClick.ga.custom,
            })
        }

        if (isMobile) {
            const appStoreLink = getAppStoreUrl({
                source: APP_STORE_SOURCE_WEB_CAMPAIGN,
                route: card.mobileUrl,
            })

            navigateExternal(appStoreLink, {
                before: async () => {
                    await Promise.all([trackCardClick()])
                },
            })
        } else {
            trackCardClick()
            window.location.assign(generateRoomLink(card.url))
        }
    }

    return (
        <section className="CardGridSection" id={id} ref={cardGridRef}>
            <div className="header">
                <div className="title">
                    <h2 className={Typography.Heading.XL}>{t(title)}</h2>
                </div>
                <div className="subtitle">
                    <p className={Typography.Body.L}>{t(subtitle)}</p>
                </div>
            </div>

            <div className="cards">
                {cards.map((card) => (
                    <div className="cardGrid">
                        <CompactCard
                            title={t(card.label).toString()}
                            href={isMobile ? '' : generateRoomLink(card.url)}
                            // eslint-disable-next-line i18next/no-literal-string
                            aspectRatio="4:3"
                            onClick={(e) => onCardClick(card, e)}
                            // eslint-disable-next-line i18next/no-literal-string
                            media={
                                <Image
                                    alt={t(card.alt).toString()}
                                    src={withPrefix(`/images/graphics/campaigns/${card.image}`)}
                                    onClick={(e) => onCardClick(card, e)}
                                />
                            }
                            simple
                            className={classNames('cardGrid__card', {
                                [card.backgroundColor as string]: card.backgroundColor,
                            })}
                            theme="default"
                        />
                    </div>
                ))}
            </div>
        </section>
    )
}

export const CardGridFragment = graphql`
    fragment CardGridFragment on CampaignsJsonSections {
        id
        type
        title
        subtitle
        tracking
        cards {
            image
            alt
            label
            url
            mobileUrl
            tracking
            backgroundColor
        }
    }
`
