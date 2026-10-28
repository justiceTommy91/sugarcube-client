import React, { useEffect, useRef } from 'react'
import { withPrefix, navigate } from 'gatsby'
import { useTranslation } from 'react-i18next'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import SimpleVideo from '@ingka/simple-video'
import Card, { ContentCard } from '@ingka/card'
import AspectRatioBox from '@ingka/aspect-ratio-box'
import CompactCard from '@ingka/compact-card'
import { Typography } from '@ingka/typography-shared'
import Carousel from '@ingka/carousel'
import Image from '@ingka/image'
import arrowDown from '@ingka/ssr-icon/paths/arrow-down'
import { useAppSelector, useAppDispatch, useScrollTracking } from 'hooks'
import { fetchShowrooms } from 'models/showrooms/actions'
import { getShowroomNeutralStandard } from 'models/showrooms/selectors'
import { buildRoomUrlWithParamsAndHash } from 'models/compositions/utils'

import { BEDROOM, DINING_ROOM, OFFICE } from 'models/scenes/constants'
import { STORAGE_SHELVES } from 'containers/searchBrowse/types'
import { withTimeout } from 'utils/async'

import AppDownloadQRModal from 'components/AppDownloadQRModal'
import {
    APP_STORE_SOURCE_WEB_LIVING_ROOM,
    GA_ACTION_CATEGORY_GET_IKEA_APP,
    GA_ACTION_CATEGORY_GOTO_DASHBOARD,
    GA_ACTION_CATEGORY_GOTO_ROOMBUILDER,
    GA_ACTION_OPEN_ROOM,
    GA_CATEGORY_DYH_SUGARCUBE,
    ROOM_SOURCE_STOCK,
    ROOM_VIEW_TYPE_MULTI,
    TRACK_LOCATION_LIVING_ROOM_PAGE,
} from 'models/tracking/constants'
import { showAppDownloadModal } from 'models/ui/actions'
import { generateRoomLink } from 'models/location/selectors'

import './styles.scss'
import {
    USER_SCROLLED_PAST_CATEGORY_LR_CONTENT_LINKS,
    USER_SCROLLED_PAST_CATEGORY_LR_HERO,
    USER_SCROLLED_PAST_CATEGORY_LR_OTHER_ACTIONS,
    USER_SCROLLED_PAST_CATEGORY_LR_PRODUCT_CATEGORY,
} from 'models/sessionStorage/constants'
import { FILTER_TYPE_EMPTY } from 'models/showrooms/constants'
import { openComposition, selectComposition } from 'models/compositions/actions'
import { LOCALE_AU_EN, LOCALE_CA_EN, LOCALE_GB_EN, LOCALE_US_EN } from 'models/location/constants'

const LOCALE = process.env.GATSBY_IKEA_MARKET
const validLocales = [LOCALE_AU_EN, LOCALE_CA_EN, LOCALE_GB_EN, LOCALE_US_EN] as const
type AllowedLocale = (typeof validLocales)[number]

const fallbackLocale: AllowedLocale = LOCALE_CA_EN
const SAFE_LOCALE = validLocales.includes(LOCALE as AllowedLocale) ? (LOCALE as AllowedLocale) : fallbackLocale

const videoUrl = `${process.env.GATSBY_ASSET_BUCKET}/videos/category-living-room-header-1.MP4`
const CATEGORY_LIVING_ROOM_SLUG = 'living-room'
const TRACKING_CATEGORY_LIVING_ROOM = 'Category:living-room'
const TRACKING_HERO_SECTION = 'Hero'
const TRACKING_PRODUCT_CATEGORY_SECTION = 'ProductCategory'
const TRACKING_OTHER_ACTIONS_SECTION = 'OtherActions'
const TRACKING_CONTENT_LINKS_SECTION = 'ContentLinks'

const LivingRoomPage = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const heroRef = useRef<HTMLDivElement | null>(null)
    const productCategoryRef = useRef<HTMLDivElement | null>(null)
    const otherActionsRef = useRef<HTMLDivElement | null>(null)
    const contentLinksRef = useRef<HTMLDivElement | null>(null)
    useScrollTracking(
        heroRef,
        USER_SCROLLED_PAST_CATEGORY_LR_HERO,
        TRACKING_HERO_SECTION,
        TRACK_LOCATION_LIVING_ROOM_PAGE,
    )
    useScrollTracking(
        productCategoryRef,
        USER_SCROLLED_PAST_CATEGORY_LR_PRODUCT_CATEGORY,
        TRACKING_PRODUCT_CATEGORY_SECTION,
        TRACK_LOCATION_LIVING_ROOM_PAGE,
    )
    useScrollTracking(
        otherActionsRef,
        USER_SCROLLED_PAST_CATEGORY_LR_OTHER_ACTIONS,
        TRACKING_OTHER_ACTIONS_SECTION,
        TRACK_LOCATION_LIVING_ROOM_PAGE,
    )
    useScrollTracking(
        contentLinksRef,
        USER_SCROLLED_PAST_CATEGORY_LR_CONTENT_LINKS,
        TRACKING_CONTENT_LINKS_SECTION,
        TRACK_LOCATION_LIVING_ROOM_PAGE,
    )

    const imageUrl = (file: string) => withPrefix(`/images/graphics/living_room/${file}`)
    const { t } = useTranslation(['translation', 'dashboard'])

    const CATEGORY_CARDS = [
        {
            key: 'livingRoom.sofas',
            title: t('livingRoom.sofas'),
            image: 'sofas.jpg',
            productIds: {
                [LOCALE_AU_EN]: '29305699',
                [LOCALE_CA_EN]: '69305701',
                [LOCALE_GB_EN]: '10506235',
                [LOCALE_US_EN]: '59305706',
            },
        },
        {
            key: 'livingRoom.tables',
            title: t('livingRoom.tables'),
            image: 'tables.jpg',
            productIds: {
                [LOCALE_AU_EN]: '60215333',
                [LOCALE_CA_EN]: '80213309',
                [LOCALE_GB_EN]: '80213309',
                [LOCALE_US_EN]: '80213309',
            },
        },
        {
            key: 'livingRoom.chairs',
            title: t('livingRoom.chairs'),
            image: 'chairs.jpg',
            productIds: {
                [LOCALE_AU_EN]: '90423590',
                [LOCALE_CA_EN]: '50423592',
                [LOCALE_GB_EN]: '70423591',
                [LOCALE_US_EN]: '50423592',
            },
        },
        {
            key: 'livingRoom.rugs',
            title: t('livingRoom.rugs'),
            image: 'rugs.jpg',
            productIds: {
                [LOCALE_AU_EN]: '80229032',
                [LOCALE_CA_EN]: '60229033',
                [LOCALE_GB_EN]: '60229033',
                [LOCALE_US_EN]: '60229033',
            },
        },
        {
            key: 'livingRoom.storage',
            title: t('livingRoom.storage'),
            image: 'storage.jpg',
            productIds: {
                [LOCALE_AU_EN]: '59440455',
                [LOCALE_CA_EN]: '89419075',
                [LOCALE_GB_EN]: '89419075',
                [LOCALE_US_EN]: '89419075',
            },
        },
        {
            key: 'livingRoom.decor',
            title: t('livingRoom.decor'),
            image: 'decor.jpg',
            productIds: {
                [LOCALE_AU_EN]: '60331375',
                [LOCALE_CA_EN]: '40393618',
                [LOCALE_GB_EN]: '30231301',
                [LOCALE_US_EN]: '90231303',
            },
        },
    ]

    const ROOM_CARDS = [
        {
            key: 'livingRoom.bedroom',
            label: t('livingRoom.bedroom'),
            image: 'bedroom.jpg',
            query: undefined,
            roomType: BEDROOM,
        },
        {
            key: 'livingRoom.storage',
            label: t('livingRoom.storage'),
            image: 'storage-room.jpg',
            query: STORAGE_SHELVES,
            roomType: undefined,
        },
        {
            key: 'livingRoom.office',
            label: t('livingRoom.office'),
            image: 'office.jpg',
            query: undefined,
            roomType: OFFICE,
        },
        {
            key: 'livingRoom.dining',
            label: t('livingRoom.dining'),
            image: 'dining.jpg',
            query: undefined,
            roomType: DINING_ROOM,
        },
        { key: 'livingRoom.kids', label: t('livingRoom.kids'), image: 'kids.jpg', query: 'kids', roomType: undefined },
    ]

    const dispatch = useAppDispatch()
    const neutralShowroom = useAppSelector(getShowroomNeutralStandard)[0] ?? null

    const composition = neutralShowroom?.composition || ''
    const scene = neutralShowroom?.scene || ''
    const name = neutralShowroom?.name || ''

    useEffect(() => {
        dispatch(fetchShowrooms())
    }, [])

    useEffect(() => {
        if (composition) {
            dispatch(selectComposition(composition))
        }
    }, [composition])

    const trackPlayPause = () => {
        const playedVideoRef = videoRef?.current
        click('Category.HeroPlayPause', {
            isPlaying: !playedVideoRef?.paused,
            Category: CATEGORY_LIVING_ROOM_SLUG,
        })
    }

    const onRoomBuilderCardClick = () => {
        navigate('/#designnow')
        click('Category.GotoRoombuilder', { Category: CATEGORY_LIVING_ROOM_SLUG })
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_CATEGORY_GOTO_ROOMBUILDER,
            label: CATEGORY_LIVING_ROOM_SLUG,
        })
    }

    const onAppDownloadCardClick = () => {
        dispatch(showAppDownloadModal(true))
        click('Category.GetIkeaApp', { Category: CATEGORY_LIVING_ROOM_SLUG })
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_CATEGORY_GET_IKEA_APP,
            label: CATEGORY_LIVING_ROOM_SLUG,
        })
    }

    const onKreativCardClick = () => {
        navigate('/')
        click('Category.GotoDashboard', { Category: CATEGORY_LIVING_ROOM_SLUG })
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_CATEGORY_GOTO_DASHBOARD,
            label: CATEGORY_LIVING_ROOM_SLUG,
        })
    }

    const trackCardClick = async (
        cardKey: string,
        cardIndex: number,
        accessFrom: string,
        filterRoomType?: string,
        query?: string,
        productId?: string,
        categoryId?: string,
        subcategoryId?: string,
    ) => {
        const trackingInfo = {
            Category: CATEGORY_LIVING_ROOM_SLUG,
            CardKey: cardKey,
            CardIndex: cardIndex.toString(),
            AccessFrom: accessFrom,
            SwappablesFor: productId,
            FilterRoomType: filterRoomType,
            Query: query,
            CategoryId: categoryId,
            SubcategoryId: subcategoryId,

            // AccessFrom:  'ProductCategory' | 'ContentLinks'  //section on the page
        }

        click('Category.OpenRoom', trackingInfo)
        const gaMetaData = {
            context: TRACKING_CATEGORY_LIVING_ROOM,
            name,
            compostionId: composition,
            sceneId: scene,
            swappables_for: productId || '',
            filter_room_type: filterRoomType || '',
            query: query || '',
            categoryId: categoryId || '',
            subcategoryId: subcategoryId || '',
            access_from: accessFrom,
            card_key: cardKey,
            card_index: cardIndex.toString(),
        }
        // GA label for open room event: composition id:scene id
        // roomSource: ROOM_SOURCE_STOCK
        // roomViewType: MultiviewPano
        // furnishingType: UNFURNISHED
        const gaLabel = `${composition || null}:${scene}|${ROOM_SOURCE_STOCK}|${ROOM_VIEW_TYPE_MULTI}|${
            FILTER_TYPE_EMPTY || null
        }`
        trackGoogleAnalytics({
            category: GA_CATEGORY_DYH_SUGARCUBE,
            action: GA_ACTION_OPEN_ROOM,
            label: gaLabel,
            custom: gaMetaData,
        })
    }

    return (
        <div className={`LivingRoomPage ${Typography.TypographyRoot} ${Typography.Context.TypeScale.Auto}`}>
            <div className="headerContainer" ref={heroRef}>
                <Card
                    content={
                        <ContentCard
                            addOn={null}
                            contentVerticalAlign="top"
                            id="living-room-hero"
                            label="IKEA Kreativ"
                            theme="default"
                            title={t('livingRoom.visualize your perfect')}
                            titleHeadingTag="h1"
                            body={t('livingRoom.get started instantly')}
                            href="#category-lr-product-categories"
                            onClick={() => {
                                click('Category.GetStarted')
                            }}
                            buttonProps={{
                                ssrIcon: arrowDown,
                                text: t('common.get started'),
                            }}
                        />
                    }
                    media={
                        <AspectRatioBox ratio="16:9" onClick={trackPlayPause}>
                            <SimpleVideo
                                ref={videoRef}
                                descriptionId={t('livingRoom.visualize your perfect')}
                                src={videoUrl}
                                type="video/mp4"
                                playAriaLabel={t('dashboard:dashboard.play')}
                                pauseAriaLabel={t('dashboard:dashboard.pause')}
                                muted
                                autoPlay
                                loop
                                descriptionBody={t('livingRoom.visualize your perfect')}
                                poster={withPrefix(`/images/graphics/dashboard/living-room-poster.png`)}
                                emphasised={false}
                                additionalControls="bottomTrailing"
                            />
                        </AspectRatioBox>
                    }
                    mediaPosition="leading"
                    className="headerCard"
                />
            </div>

            <section id="category-lr-product-categories" ref={productCategoryRef}>
                <div className="heading">
                    <h2 className={Typography.Heading.L}>{t('livingRoom.select a category')}</h2>
                    <p className={Typography.Body.M}>{t('livingRoom.suggest related items')}</p>
                </div>

                <div className="categoryCards">
                    {CATEGORY_CARDS.map(({ key, title, image, productIds }, index) => {
                        const productId = productIds[SAFE_LOCALE]
                        return (
                            <CompactCard
                                className="CategoryCard"
                                size="medium"
                                media={<Image alt="" src={imageUrl(image)} />}
                                title={title}
                                href={generateRoomLink(
                                    buildRoomUrlWithParamsAndHash({
                                        compositionId: composition,
                                        sceneId: scene,
                                        productId,
                                        roomType: 'living_room',
                                    }),
                                )}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()

                                    withTimeout(
                                        trackCardClick(
                                            key,
                                            index,
                                            TRACKING_PRODUCT_CATEGORY_SECTION,
                                            CATEGORY_LIVING_ROOM_SLUG,
                                            undefined,
                                            productId,
                                        ),
                                        800,
                                    ).finally(() => {
                                        dispatch(
                                            openComposition(composition, undefined, {
                                                sceneId: scene,
                                                productId,
                                                roomType: `living_room`,
                                            }),
                                        )
                                    })
                                }}
                            />
                        )
                    })}
                </div>
            </section>

            <section id="category-lr-other-actions" ref={otherActionsRef}>
                <div className="heading">
                    <h2 className={Typography.Heading.L}>{t('livingRoom.other ways')}</h2>
                </div>
                <div className="waysContainer">
                    <Card
                        content={
                            <ContentCard
                                id="living-room-configure"
                                title={t('livingRoom.configure a room')}
                                body={t('livingRoom.set shape and size')}
                                titleHeadingTag="h3"
                                fixed
                                onClick={onRoomBuilderCardClick}
                            />
                        }
                        mediaPosition="leading"
                        media={<Image alt="" src={imageUrl('room-builder.jpg')} onClick={onRoomBuilderCardClick} />}
                    />
                    <Card
                        content={
                            <ContentCard
                                id="living-room-configure"
                                title={t('livingRoom.scan your room')}
                                body={t('livingRoom.see how products will look')}
                                titleHeadingTag="h3"
                                fixed
                                onClick={onAppDownloadCardClick}
                            />
                        }
                        mediaPosition="leading"
                        media={<Image alt="" src={imageUrl('scan-room.jpg')} onClick={onAppDownloadCardClick} />}
                    />
                    <Card
                        content={
                            <ContentCard
                                id="living-room-configure"
                                title={t('livingRoom.what is kreativ')}
                                body={t('livingRoom.learn more about kreativ')}
                                titleHeadingTag="h3"
                                theme="extendedPalette05"
                                fixed
                                onClick={onKreativCardClick}
                                className="learnMore"
                            />
                        }
                    />
                </div>
            </section>

            <section id="category-lr-content-links" ref={contentLinksRef}>
                <div className="heading">
                    <h2 className={Typography.Heading.L}>{t('livingRoom.explore furniture and decor')}</h2>
                </div>
                <Carousel id="living-room-explore-carousel">
                    {ROOM_CARDS?.map((room, index) => (
                        // Using <a> becuase using <Link> does not load the composition - still investigating the reason.
                        <a
                            href={generateRoomLink(
                                buildRoomUrlWithParamsAndHash({
                                    compositionId: composition,
                                    sceneId: scene,
                                    query: room.query,
                                    roomType: room.roomType,
                                }),
                            )}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()

                                withTimeout(
                                    trackCardClick(
                                        room.key,
                                        index,
                                        TRACKING_CONTENT_LINKS_SECTION,
                                        room.roomType,
                                        room.query,
                                    ),
                                    800,
                                ).finally(() => {
                                    dispatch(
                                        openComposition(composition, undefined, {
                                            sceneId: scene,
                                            query: room.query,
                                            roomType: room.roomType,
                                        }),
                                    )
                                })
                            }}
                        >
                            <div className="roomEntry">
                                <Image alt="" src={imageUrl(room.image)} className="image" />
                                <p className="title">{room.label}</p>
                            </div>
                        </a>
                    ))}
                </Carousel>
            </section>
            <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_LIVING_ROOM} />
        </div>
    )
}

export default LivingRoomPage
