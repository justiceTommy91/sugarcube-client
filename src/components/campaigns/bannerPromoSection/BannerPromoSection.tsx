import React, { useRef } from 'react'
import { graphql, withPrefix } from 'gatsby'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

import AspectRatioBox from '@ingka/aspect-ratio-box'
import Card, { ContentCard } from '@ingka/card'
import Image from '@ingka/image'
import mobileHandover from '@ingka/ssr-icon/paths/mobile-handover'

import { useAppDispatch, useScrollTracking } from 'hooks'
import { showAppDownloadModal } from 'models/ui/actions'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

import AppDownloadQRModal from 'components/AppDownloadQRModal'
import { AfterFoldSessionKeyType } from 'models/sessionStorage'

import { APP_STORE_SOURCE_WEB_CAMPAIGN, GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'
import { navigateExternal } from 'models/location/helpers'
import { getAppStoreUrl } from 'utils/buildUrls'
import { click, trackGoogleAnalytics } from 'utils/tracker'

import { BannerPromoSectionData } from './BannerPromoSection.types'

import './BannerPromoSection.scss'

export const BannerPromoSection: React.FC<BannerPromoSectionData> = ({
    slug,
    id,
    title,
    alt,
    body,
    cta,
    image,
    tracking,
    hideCta,
    mobileOnly,
}) => {
    const { isMobile } = useSugarcubeContext()
    const dispatch = useAppDispatch()
    const { t } = useTranslation('campaigns')

    const bannerPromoRef = useRef<HTMLDivElement | null>(null)

    useScrollTracking(
        bannerPromoRef,
        `ScrolledPast:BannerPromoSection/${id}/${slug}` as AfterFoldSessionKeyType,
        tracking?.onBannerPromoScrollPast?.mixPanel.section,
        slug,
        0.5,
    )

    const appStoreLink = getAppStoreUrl({
        source: APP_STORE_SOURCE_WEB_CAMPAIGN,
        route: cta?.mobileUrl,
    })

    const onCardClick = () => {
        if (hideCta) {
            return
        }
        const trackInfo = () => {
            click(
                tracking?.onBannerPromoCardClick.mixPanel.eventName,
                tracking?.onBannerPromoCardClick.mixPanel.metadata,
            )

            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: tracking?.onBannerPromoCardClick?.ga.action,
                label: tracking?.onBannerPromoCardClick?.ga.label,
                custom: tracking?.onBannerPromoCardClick?.ga.custom,
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
            dispatch(showAppDownloadModal(true))
        }
    }

    return (
        <section className={classNames('BannerPromoSection', { mobileOnly, hideCta })} id={id} ref={bannerPromoRef}>
            <Card
                content={
                    <ContentCard
                        id={title}
                        title={t(title).toString()}
                        body={t(body).toString()}
                        titleHeadingTag="h1"
                        fixed
                        onClick={onCardClick}
                        buttonProps={
                            hideCta
                                ? undefined
                                : {
                                      text: isMobile ? t(cta.text.mobile).toString() : t(cta.text.web).toString(),
                                      ssrIcon: mobileHandover,
                                      // eslint-disable-next-line i18next/no-literal-string
                                      iconPosition: 'leading',
                                  }
                        }
                    />
                }
                mediaPosition="trailing"
                media={
                    <AspectRatioBox ratio="wide">
                        <Image
                            // eslint-disable-next-line i18next/no-literal-string
                            src={withPrefix(`/images/graphics/campaigns/${image}`)}
                            className="media"
                            alt={t(alt).toString()}
                        />
                    </AspectRatioBox>
                }
            />
            <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_CAMPAIGN} />
        </section>
    )
}

export default BannerPromoSection

export const BannerPromoFragment = graphql`
    fragment BannerPromoFragment on CampaignsJsonSections {
        type
        id
        title
        body
        image
        alt
        tracking
        hideCta
        mobileOnly
        cta {
            text {
                web
                mobile
            }
            url
            mobileUrl
        }
    }
`
