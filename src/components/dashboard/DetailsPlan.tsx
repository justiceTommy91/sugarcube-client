import Card, { ContentCard } from '@ingka/card'
import Image from '@ingka/image'
import classNames from 'classnames'
import { withPrefix } from 'gatsby'
import { useAppSelector, useScrollTracking } from 'hooks'
import { useTracker } from 'apps/TrackingBoundary'
import { getPlannersUrl, getSearch, getDesignLabUrl } from 'models/location/selectors'
import { getShouldShowExpertCheck } from 'models/ui/selectors'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import headsetActive from '@ingka/ssr-icon/paths/headset-active'
import SSRIcon from '@ingka/ssr-icon'
import { BEDROOM, PARTLY_FURNISHED } from 'models/scenes/constants'
import {
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_ACTION_DASHBOARD_EXPERT_CHECK_BANNER_CLICK,
    ACTION_DASHBOARD_EXPERT_CHECK_BANNER,
    TRACK_LOCATION_DASHBOARD,
} from 'models/tracking/constants'
import { withTimeout } from 'utils/async'
import { trackGoogleAnalytics } from 'utils/tracker'
import { USER_SCROLLED_PAST_GO_TO_PLANNERS } from 'models/sessionStorage/constants'
import { Typography } from '@ingka/typography-shared'

require('./DetailsPlan.scss')

const TRACKING_PLANNERS_SECTION = 'GoToPlanners'

export const DetailsPlan: React.FC = () => {
    const { t } = useTranslation('dashboard')
    const isExpertCheckEnabled = useAppSelector(getShouldShowExpertCheck)
    const track = useTracker()
    const plannersRef = useRef<HTMLDivElement | null>(null)

    useScrollTracking(
        plannersRef,
        USER_SCROLLED_PAST_GO_TO_PLANNERS,
        TRACKING_PLANNERS_SECTION,
        TRACK_LOCATION_DASHBOARD,
    )

    let imgSrc = withPrefix('/images/graphics/dashboard/plannerTools.jpg')
    let bannerTitle = t('dashboard.looking for our planner')
    let hrefUrl = getPlannersUrl()
    let extraProps = {}

    if (isExpertCheckEnabled) {
        imgSrc = withPrefix('/images/graphics/dashboard/kreativExpertCheck.jpg')
        bannerTitle = t('dashboard.expertCheck.banner title')
        hrefUrl = `#`
        extraProps = {
            buttonProps: { text: t('dashboard.expertCheck.banner cta') },
            onCardClick: (e: React.MouseEvent<HTMLElement>) => {
                e.preventDefault()
                trackGoogleAnalytics({
                    category: GA_CATEGORY_DYH_SUGARCUBE,
                    action: GA_ACTION_DASHBOARD_EXPERT_CHECK_BANNER_CLICK,
                    label: '',
                })
                withTimeout(
                    track.click({
                        target: 'dashboard.expertCheckBanner',
                        intendedAction: ACTION_DASHBOARD_EXPERT_CHECK_BANNER,
                    }),
                    2_000,
                ).finally(() => {
                    window.location.href = `${getDesignLabUrl()}?furnishingType=${PARTLY_FURNISHED}&roomType=${BEDROOM.toLowerCase()}&${getSearch()}#furnishedrooms`
                })
            },
        }
    }

    return (
        <div className={classNames('DetailsPlan', { isExpertCheckEnabled })} ref={plannersRef}>
            <Card
                content={
                    <ContentCard
                        id="dashboard-planner-banner"
                        title={
                            !isExpertCheckEnabled ? (
                                <h2 className={Typography.Heading.L}>{bannerTitle}</h2>
                            ) : (
                                bannerTitle
                            )
                        }
                        body={
                            !isExpertCheckEnabled ? (
                                <p className={Typography.Body.L}>{t('dashboard.visit our planner tools')}</p>
                            ) : (
                                <>
                                    <p className="bannerParagraph">{t('dashboard.expertCheck.banner body 1')}</p>
                                    <p>{t('dashboard.expertCheck.banner body 2')}</p>
                                    <p>
                                        {t('dashboard.expertCheck.banner body 3')}
                                        <SSRIcon paths={headsetActive} />
                                    </p>
                                </>
                            )
                        }
                        href={hrefUrl}
                        {...extraProps}
                    />
                }
                mediaPosition="trailing"
                media={<Image alt="" src={imgSrc} />}
                className={classNames('detailsPlan__card', {
                    isExpertCheckEnabled,
                })}
            />
        </div>
    )
}
