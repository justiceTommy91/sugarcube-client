import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { graphql, withPrefix } from 'gatsby'
import classNames from 'classnames'
import { useScrollTracking } from 'hooks'

import Card, { ContentCard, ContentCardButtonProps } from '@ingka/card'
import Image from '@ingka/image'
import { Typography } from '@ingka/typography-shared'
import { LOCALE_US_EN } from 'models/location/constants'
import { AfterFoldSessionKeyType } from 'models/sessionStorage'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { GA_CATEGORY_DYH_SUGARCUBE } from 'models/tracking/constants'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

import { TipsSectionData } from './TipsSection.types'
import './TipsSection.scss'

export const TipsSection: React.FC<TipsSectionData> = ({
    id,
    title,
    slug,
    cta,
    firstCard,
    secondCard,
    blogLink,
    tracking,
}) => {
    const { isMobile } = useSugarcubeContext()
    const { t } = useTranslation('campaigns')
    const isUSMarket = process.env.GATSBY_IKEA_MARKET === LOCALE_US_EN
    const tipsRef = useRef<HTMLDivElement | null>(null)

    useScrollTracking(
        tipsRef,
        `ScrolledPast:TipsSection/${slug}` as AfterFoldSessionKeyType,
        tracking?.onTipsScrollPast?.mixPanel?.section,
        slug,
        0.55,
    )
    const onCardClick = () => {
        if (!isUSMarket) {
            return
        }
        click(tracking?.onTipsClick.mixPanel.eventName, tracking?.onTipsClick.mixPanel.metadata)
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: tracking?.onTipsClick?.ga.action,
            label: tracking?.onTipsClick?.ga.label,
            custom: tracking?.onTipsClick?.ga.custom,
        })
        window.location.assign(blogLink)
    }

    // Keep reading button should only be visible for US market
    const buttonProps: ContentCardButtonProps = {
        text: isMobile ? t(cta?.text.mobile).toString() : t(cta?.text.web).toString(),
        ssrIcon: undefined,
        iconPosition: isMobile ? 'leading' : 'trailing',
    }

    return (
        <section className={classNames('TipsSection', { isNonUSMarket: !isUSMarket })} id={id} ref={tipsRef}>
            <div className="header">
                <h2 className={Typography.Heading.XL}>{t(title)}</h2>
            </div>
            <Card
                content={
                    <ContentCard
                        id="tips-card-0"
                        title={t(firstCard.title).toString()}
                        body={t(firstCard.body).toString()}
                        titleHeadingTag="h3"
                        fixed
                        href={!isUSMarket ? undefined : cta.url}
                        onClick={onCardClick}
                        buttonProps={!isUSMarket ? undefined : buttonProps}
                    />
                }
                mediaPosition="trailing"
                media={
                    <Image
                        alt={t(firstCard.alt).toString()}
                        src={withPrefix(`/images/graphics/campaigns/${firstCard.image}`)}
                        className="media"
                    />
                }
            />
            <Card
                content={
                    <ContentCard
                        id="tips-card-1"
                        title={t(secondCard.title).toString()}
                        body={t(secondCard.body).toString()}
                        titleHeadingTag="h3"
                        href={!isUSMarket ? undefined : cta.url}
                        buttonProps={!isUSMarket ? undefined : buttonProps}
                        fixed
                        onClick={onCardClick}
                    />
                }
                mediaPosition="trailing"
                media={
                    <Image
                        alt={t(secondCard.alt).toString()}
                        src={withPrefix(`/images/graphics/campaigns/${secondCard.image}`)}
                        className="media"
                    />
                }
            />
        </section>
    )
}

export const TipsFragment = graphql`
    fragment TipsFragment on CampaignsJsonSections {
        type
        id
        title
        blogLink
        cta {
            text {
                web
                mobile
            }
            url
        }
        firstCard {
            image
            title
            body
            alt
            alt
        }
        secondCard {
            image
            title
            body
            alt
        }
        tracking
    }
`
