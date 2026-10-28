import React, { useRef } from 'react'
import { navigate, withPrefix } from 'gatsby'
import classNames from 'classnames'

import { useAppDispatch, useAppSelector, useScrollTracking, useExperiments, useWindowSize } from 'hooks'
import { useTranslation } from 'react-i18next'

import Image from '@ingka/image'
import Skeleton from '@ingka/skeleton'
import Tag from '@ingka/tag'
import Card, { ContentCard } from '@ingka/card'
import { Typography } from '@ingka/typography-shared'
import Button from '@ingka/button'
import chevronRight from '@ingka/ssr-icon/paths/chevron-right'

import { SHOWROOMS_HASH } from 'models/location/constants'
import { showAppDownloadModal, showUploadImageModal } from 'models/ui/actions'
import { getContextFromReferrer } from 'models/referrer/selector'
import { useHeaderContentFromContextualCard } from 'models/referrer/hooks'
import { generateRoomLink, getBannerImageParam } from 'models/location/selectors'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import {
    ACCESS_FROM_DESIGN_NOW_OPTIONS,
    GA_ACTION_DASHBOARD_CHOOSE_ROOM,
    GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK,
    GA_ACTION_KREATIVLITE_OPEN,
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_LABEL_DESIGN_NOW_OPTIONS,
    KREATIVLITE_DASHBOARD_OPEN,
    OPTIMIZELY_APP_DOWNLOAD_CLICK,
    TRACK_LOCATION_DASHBOARD,
    ROOM_BUILDER_MODE_CREATE,
} from 'models/tracking/constants'
import { experimentsService } from 'services/experiments'
import { withTimeout } from 'utils/async'
import { USER_SCROLLED_PAST_CONTEXTUAL_CARD } from 'models/sessionStorage/constants'
import { formatReferrerContextForTracking } from './utils'
import { CONTEXTUAL_CARDS, ContextualCardType } from './constants'

require('./ContextualCard.scss')

export const TRACKING_CONTEXTUAL_CARD_SECTION = 'ContextualCard'

const ROOM_PLANNER_TITLES: Record<string, string> = {
    'living-room': 'dashboard.planner.living-room.title',
    workspace: 'dashboard.planner.workspace.title',
    hallway: 'dashboard.planner.hallway.title',
    dining: 'dashboard.planner.dining.title',
    'childrens-room': 'dashboard.planner.childrens-room.title',
    bedroom: 'dashboard.planner.bedroom.title',
}

const IKEA_DAM_BASE_URL = 'https://www.ikea.com/ext/ingkadam/m'

/**
 * Build a full IKEA DAM image URL from a short image ID.
 * The planners team passes a short ID like "29251a8de04458f7/PH205956"
 * and we construct the full URL: https://www.ikea.com/ext/ingkadam/m/29251a8de04458f7/original/PH205956.jpg?f=xl
 *
 * If the param is already a full URL (starts with http), return it as-is.
 */
const buildBannerImageUrl = (imageParam: string): string => {
    if (!imageParam) return ''
    if (imageParam.startsWith('http')) return imageParam

    const parts = imageParam.split('/')
    if (parts.length === 2) {
        const [hash, filename] = parts
        return `${IKEA_DAM_BASE_URL}/${hash}/original/${filename}.jpg?f=xl`
    }

    return imageParam
}

type ContextualCardProps = {
    onOpenPlanner: ({ trackingInfo, gaLabel }: { trackingInfo?: Record<string, unknown>; gaLabel?: string }) => void
}

export const ContextualCard: React.FC<ContextualCardProps> = ({ onOpenPlanner }) => {
    const { t } = useTranslation('dashboard')
    const dispatch = useAppDispatch()
    const context = useAppSelector(getContextFromReferrer)
    const referrerContext = formatReferrerContextForTracking(context)
    const contextualCardRef = useRef<HTMLDivElement | null>(null)
    const { variations } = useExperiments()
    const { width } = useWindowSize()
    const isKreativLite = variations?.KreativLite === 'enabled'
    const currentSearch = typeof window !== 'undefined' ? window.location.search : ''
    const roomBuilderUrl = generateRoomLink('/room-builder') + currentSearch

    const onClickEmptyRoom = () => {
        click('Dashboard.ChooseRoom', {
            AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS,
        })

        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_DASHBOARD_CHOOSE_ROOM,
            label: GA_LABEL_DESIGN_NOW_OPTIONS,
            custom: {
                ReferrerContext: referrerContext || '',
                AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS,
            },
        })

        const element = document.getElementById(SHOWROOMS_HASH)
        if (element) {
            element.scrollIntoView({ block: 'start', behavior: 'smooth' })
            // Move focus into the target section so screen-reader users get an
            // announcement of the new location instead of staying on the card.
            element.setAttribute('tabindex', '-1')
            element.focus({ preventScroll: true })
        }
    }

    const onClickRoomBuilder = () => {
        click('RoomBuilder.OpenModal', {
            AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS,
            RoomBuilderMode: ROOM_BUILDER_MODE_CREATE,
        })

        onOpenPlanner({
            trackingInfo: {
                AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS as string,
            },
            gaLabel: GA_LABEL_DESIGN_NOW_OPTIONS,
        })
    }

    const onAppDownloadCardClick = () => {
        click('Dashboard.GetIkeaApp', {
            AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS,
        })

        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_DASHBOARD_GET_IKEA_APP_CLICK,
            label: GA_LABEL_DESIGN_NOW_OPTIONS,
            custom: {
                ReferrerContext: referrerContext || '',
                AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS,
            },
        })

        experimentsService.track(OPTIMIZELY_APP_DOWNLOAD_CLICK)
        dispatch(showAppDownloadModal(true))
    }

    const onKreativLiteUploadClick = () => {
        trackGoogleAnalytics({
            action: GA_ACTION_KREATIVLITE_OPEN,
            category: GA_CATEGORY_DYH_SUGARCUBE,
            label: '',
        })
        click(KREATIVLITE_DASHBOARD_OPEN)
        dispatch(showUploadImageModal(true))
    }

    const onCardClick = (type: ContextualCardType) => {
        if (type === ContextualCardType.showroom) onClickEmptyRoom()
        if (type === ContextualCardType.roomBuilder) onClickRoomBuilder()
        if (type === ContextualCardType.appDownload) onAppDownloadCardClick()
        if (type === ContextualCardType.kreativLite) onKreativLiteUploadClick()
    }

    const onLearnMoreClick = () => {
        withTimeout(
            click('Dashboard.LearnMoreClick', {
                AccessFrom: ACCESS_FROM_DESIGN_NOW_OPTIONS,
            }),
            500,
        ).finally(() => {
            navigate('/learnmore')
        })
    }

    const { isRoomPlannerIntegration, roomPlannerSlug } = useSugarcubeContext()
    const referrerHeaderContent = useHeaderContentFromContextualCard(context)
    const bannerImageParam = getBannerImageParam()
    const bannerImageUrl = buildBannerImageUrl(bannerImageParam)

    // Override header content when in room planner mode
    const { title, subtitle, images, loading } =
        isRoomPlannerIntegration && roomPlannerSlug
            ? {
                  title: String(t('dashboard.contextual.get started below')),
                  subtitle: String(
                      t(
                          (ROOM_PLANNER_TITLES[roomPlannerSlug] ||
                              'dashboard.contextual.ways to start') as keyof typeof t,
                      ),
                  ),
                  images: bannerImageUrl ? [bannerImageUrl] : undefined,
                  loading: false,
              }
            : referrerHeaderContent

    const hasNoImages = !images

    // Filter cards based on KreativLite experiment: show kreativLite card instead of appDownload when enabled
    const cardsToDisplay = CONTEXTUAL_CARDS.filter((card) =>
        isKreativLite ? card.id !== ContextualCardType.appDownload : card.id !== ContextualCardType.kreativLite,
    )

    useScrollTracking(
        contextualCardRef,
        USER_SCROLLED_PAST_CONTEXTUAL_CARD,
        TRACKING_CONTEXTUAL_CARD_SECTION,
        TRACK_LOCATION_DASHBOARD,
    )

    return (
        <div className="ContextualCard" ref={contextualCardRef} id="value-prop">
            <div className="content">
                <div className="header">
                    <div className={classNames('contextualHeader', { planner: isRoomPlannerIntegration })}>
                        {!hasNoImages && (
                            <div className={classNames('images', { planner: isRoomPlannerIntegration })}>
                                {loading && !images?.length ? (
                                    <Skeleton aria-busy height="90px" width="90px" tagName="div" />
                                ) : (
                                    images?.map((src) => (
                                        <div
                                            className={classNames('imageContainer', {
                                                planner: isRoomPlannerIntegration,
                                            })}
                                            key={src}
                                        >
                                            <Image
                                                className="productImage"
                                                src={isRoomPlannerIntegration ? src : withPrefix(src)}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        <div className="info">
                            {subtitle && <p className={Typography.Caption.L}>{subtitle}</p>}
                            <h2
                                className={classNames(Typography.Heading.XL, {
                                    'no-variant-title': !context && !isRoomPlannerIntegration,
                                })}
                            >
                                {title}
                            </h2>
                        </div>
                    </div>

                    <Button
                        className="learnMoreButton"
                        text={t('dashboard.learn more')}
                        onClick={() => onLearnMoreClick()}
                        size="small"
                        aria-label={t('dashboard.learn more')}
                    />
                </div>
                <div className="cards">
                    {cardsToDisplay.map((card) => {
                        const imageSrc =
                            card.id === ContextualCardType.kreativLite
                                ? withPrefix(`/images/kreativLite/dashboardCard.jpg`)
                                : withPrefix(`/images/graphics/dashboard/${card.image}`)

                        return loading ? (
                            <Skeleton aria-busy className="skeletonCard" height="450px" key={card.id} />
                        ) : (
                            <Card
                                key={card.id}
                                content={
                                    <ContentCard
                                        href={card.id === ContextualCardType.roomBuilder ? roomBuilderUrl : undefined}
                                        onCardClick={() => onCardClick(card.id)}
                                        linkAttributes={
                                            card.id === ContextualCardType.roomBuilder
                                                ? undefined
                                                : {
                                                      // eslint-disable-next-line i18next/no-literal-string
                                                      role: 'button',
                                                      tabIndex: 0,
                                                      onKeyDown: (e) => {
                                                          if (e.key === 'Enter' || e.key === ' ') {
                                                              e.preventDefault()
                                                              onCardClick(card.id)
                                                          }
                                                      },
                                                  }
                                        }
                                        addOn={<Tag label={t(card.badge)} />}
                                        id={card.id.toString()}
                                        title={
                                            <h2
                                                className={
                                                    width < 899
                                                        ? Typography.Heading.M
                                                        : width < 1199
                                                        ? Typography.Heading.M
                                                        : Typography.Heading.XL
                                                }
                                            >
                                                {t(card.alternateTitle)}
                                            </h2>
                                        }
                                        fixed
                                        buttonProps={{
                                            text: <p className={Typography.Label.M}>{t(card.ctaText)}</p>,
                                        }}
                                    />
                                }
                                media={
                                    card.id === ContextualCardType.roomBuilder ? (
                                        <a href={roomBuilderUrl} rel="noreferrer" tabIndex={-1}>
                                            <Image
                                                alt={t(card.alt)}
                                                src={imageSrc}
                                                onClick={() => onCardClick(card.id)}
                                            />
                                        </a>
                                    ) : (
                                        <Image alt={t(card.alt)} src={imageSrc} onClick={() => onCardClick(card.id)} />
                                    )
                                }
                            />
                        )
                    })}
                </div>
                <Button
                    className="learnMoreButton--not-wide"
                    onClick={() => onLearnMoreClick()}
                    fluid
                    ssrIcon={chevronRight}
                    text={t('dashboard.learn more')}
                    aria-label={t('dashboard.learn more')}
                />
            </div>
        </div>
    )
}
