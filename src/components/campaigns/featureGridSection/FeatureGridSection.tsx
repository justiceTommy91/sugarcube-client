import React, { useRef } from 'react'
import { graphql, navigate, withPrefix } from 'gatsby'
import { useTranslation } from 'react-i18next'

import { useScrollTracking, useAppDispatch } from 'hooks'

import Image from '@ingka/image'
import Card, { ContentCard } from '@ingka/card'
import { Typography } from '@ingka/typography-shared'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { AfterFoldSessionKeyType } from 'models/sessionStorage'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { APP_STORE_SOURCE_WEB_CAMPAIGN, GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'
import { generateRoomLink } from 'models/location/selectors'
import { showAppDownloadModal } from 'models/ui/actions'
import AppDownloadQRModal from 'components/AppDownloadQRModal'
import { FeatureGridActions, FeatureGridCard, FeatureGridSectionData } from './FeatureGridSection.types'

import './FeatureGridSection.scss'

export const FeatureGridSection: React.FC<FeatureGridSectionData> = ({ id, title, slug, cards, tracking }) => {
    const { isMobile } = useSugarcubeContext()
    const dispatch = useAppDispatch()
    const { t } = useTranslation('campaigns')
    const featureGridRef = useRef<HTMLDivElement | null>(null)
    const hasQRModal = cards.some((card) => card.action === FeatureGridActions.OPEN_QR_MODAL)

    useScrollTracking(
        featureGridRef,
        `ScrolledPast:FeatureGridSection/${slug}` as AfterFoldSessionKeyType,
        tracking?.onFeatureGridScrollPast?.mixPanel?.section,
        slug,
        0.55,
    )

    const onCardClick = (card: FeatureGridCard) => {
        click(card.tracking.onCardClick.mixPanel.eventName, card.tracking.onCardClick.mixPanel.metadata)
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: card.tracking.onCardClick.ga.action,
            label: card.tracking.onCardClick.ga.label,
            custom: card.tracking.onCardClick.ga.custom,
        })
        switch (card.action) {
            case FeatureGridActions.OPEN_ROOM_BUILDER:
                navigate(card.url)
                break
            case FeatureGridActions.OPEN_ROOM:
                window.location.assign(generateRoomLink(card.url))
                break
            case FeatureGridActions.OPEN_QR_MODAL:
                dispatch(showAppDownloadModal(true))
                break
            default:
                break
        }
    }

    return !isMobile ? (
        <section className="FeatureGridSection" id={id} ref={featureGridRef}>
            <div className="heading">
                <h2 className={Typography.Heading.XL}>{t(title)}</h2>
            </div>

            <div className="cards">
                {cards.map((card) => (
                    <Card
                        content={
                            <ContentCard
                                id="feature-grid-card"
                                title={t(card.title).toString()}
                                body={t(card.subtitle).toString()}
                                titleHeadingTag="h3"
                                fixed
                                onClick={() => onCardClick(card)}
                            />
                        }
                        mediaPosition="leading"
                        media={
                            <Image
                                alt={t(card.alt).toString()}
                                src={withPrefix(`/images/graphics/campaigns/${card.image}`)}
                                onClick={() => onCardClick(card)}
                            />
                        }
                    />
                ))}
            </div>
            {hasQRModal && <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_CAMPAIGN} />}
        </section>
    ) : null
}

export const FeatureGridFragment = graphql`
    fragment FeatureGridFragment on CampaignsJsonSections {
        id
        type
        title
        cards {
            image
            alt
            action
            title
            subtitle
            url
            tracking
        }
        tracking
    }
`
