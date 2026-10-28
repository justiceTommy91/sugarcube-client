import React, { useCallback, useRef } from 'react'
import { graphql, withPrefix } from 'gatsby'

import Card, { ContentCard } from '@ingka/card'
import Image from '@ingka/image'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import mobileHandover from '@ingka/ssr-icon/paths/mobile-handover'
import { useTranslation } from 'react-i18next'

import { useScrollTracking } from 'hooks'
import { getAppStoreUrl } from 'utils/buildUrls'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { navigateExternal } from 'models/location/helpers'
import { generateRoomLink } from 'models/location/selectors'
import { AfterFoldSessionKeyType } from 'models/sessionStorage'
import { APP_STORE_SOURCE_WEB_CAMPAIGN, GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'

import { ProductGridSectionData } from './ProductGridSection.types'

import './ProductGridSection.scss'

export const ProductGridSection: React.FC<ProductGridSectionData> = ({
    id,
    title,
    body,
    cta,
    image,
    tracking,
    slug,
    alt,
}) => {
    const { isMobile } = useSugarcubeContext()
    const { t } = useTranslation('campaigns')
    const productGridRef = useRef<HTMLDivElement | null>(null)

    const appStoreLink = getAppStoreUrl({
        source: APP_STORE_SOURCE_WEB_CAMPAIGN,
        route: cta.mobileUrl,
    })

    useScrollTracking(
        productGridRef,
        `ScrolledPast:ProductGrid/${slug}` as AfterFoldSessionKeyType,
        tracking.onProductGridScrollPast?.mixPanel.section,
        slug,
        0.55,
    )

    const onCardClick = useCallback(() => {
        const trackInfo = () => {
            click(
                tracking.onProductGridButtonClick.mixPanel.eventName,
                tracking.onProductGridButtonClick.mixPanel.metadata,
            )
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: tracking.onProductGridButtonClick?.ga.action,
                label: tracking.onProductGridButtonClick?.ga.label,
                custom: tracking.onProductGridButtonClick?.ga.custom,
            })
        }

        if (isMobile) {
            navigateExternal(appStoreLink, {
                before: async () => {
                    await Promise.all([trackInfo()])
                },
            })
        } else {
            trackInfo()
            window.location.assign(generateRoomLink(cta.url))
        }
    }, [isMobile])

    return (
        <section className="ProductGrid" id={id} ref={productGridRef}>
            <Card
                className="ProductGrid"
                content={
                    <ContentCard
                        id="product-grid-card"
                        title={t(title).toString()}
                        body={t(body).toString()}
                        onCardClick={onCardClick}
                        titleHeadingTag="h2"
                        buttonProps={{
                            text: isMobile ? t(cta.text.mobile).toString() : t(cta?.text.web).toString(),
                            ssrIcon: isMobile ? mobileHandover : arrowRight,
                            iconPosition: isMobile ? 'leading' : 'trailing',
                        }}
                    />
                }
                mediaPosition="trailing"
                media={
                    <Image
                        // eslint-disable-next-line i18next/no-literal-string
                        src={withPrefix(`/images/graphics/campaigns/${image}`)}
                        className="media"
                        alt={t(alt).toString()}
                    />
                }
            />
        </section>
    )
}

export const ProductGridFragment = graphql`
    fragment ProductGridFragment on CampaignsJsonSections {
        id
        type
        title
        body
        image
        alt
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
