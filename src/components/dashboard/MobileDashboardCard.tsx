import React from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import Image from '@ingka/image'
import AspectRatioBox from '@ingka/aspect-ratio-box'
import Card, { ContentCard } from '@ingka/card'
import { withPrefix } from 'gatsby'
import { GetAppButton } from './GetAppButton'
import { LearnMoreButton } from './LearnMoreButton'
import './MobileDashboardCard.scss'

export type MobileDashboardCardProps = {
    imagePrefix?: string
    hasCardLayout?: boolean
    track?: { action: string; from: string }
    title: string
    subtitle: string
}

export const MobileDashboardCard: React.FunctionComponent<MobileDashboardCardProps> = (props) => {
    const { imagePrefix, hasCardLayout = true, title, subtitle, track } = props
    const { t } = useTranslation('translation')

    return (
        <div className="MobileDashboardCard">
            {!hasCardLayout && (
                <>
                    <p className="no-card-title">{title}</p>
                    <p className="no-card-label">{subtitle}</p>
                </>
            )}

            <Card
                content={
                    <ContentCard
                        id="dashboard-mobile-get-app"
                        body={
                            <span className="cardCtaContainer">
                                <GetAppButton
                                    type="primary"
                                    customCtaText={t('searchBrowse.go to ikea app').toString()}
                                    track={track}
                                />
                                <LearnMoreButton className="ctaLearnMore" type="secondary" track={track} />
                            </span>
                        }
                        title={hasCardLayout ? <span className="dashboardCtaTitle">{title}</span> : undefined}
                        subtitle={hasCardLayout ? subtitle : undefined}
                        className={classNames('mobileDashboardCtas', { noImage: !hasCardLayout })}
                    />
                }
                mediaPosition="leading"
                media={
                    imagePrefix ? (
                        <AspectRatioBox ratio="wide">
                            <Image alt="" src={withPrefix(imagePrefix)} srcSet={withPrefix(imagePrefix)} />
                        </AspectRatioBox>
                    ) : undefined
                }
            />
        </div>
    )
}
