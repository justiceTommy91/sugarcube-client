/* eslint-disable jsx-a11y/media-has-caption */

import React, { useRef } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { navigate, withPrefix } from 'gatsby'

import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import mobileHandover from '@ingka/ssr-icon/paths/mobile-handover'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import AppDownloadQRModal from 'components/AppDownloadQRModal'
import { useAppDispatch, useAppSelector, useScrollTracking } from 'hooks'

import { getOrientation } from 'models/ui/selectors'
import { GATrackingInfoProps } from 'models/tracking'
import { ORIENTATION_LANDSCAPE } from 'models/ui/constants'
import { getSearch } from 'models/location/selectors'
import { trackGaEvent as trackGaEventAction } from 'models/tracking/actions'
import { showAppDownloadModal as showAppDownloadModalAction } from 'models/ui/actions'
import { getAppStoreUrl } from 'utils/buildUrls'
import {
    APP_STORE_SOURCE_MOBILE_LEARNMORE_V2,
    APP_STORE_SOURCE_WEB_LEARNMORE_V2,
    GA_ACTION_LEARN_MORE_GO_TO_FURNISHED_ROOMS_CLICK,
    GA_ACTION_LEARN_MORE_GO_TO_IKEA_APP_CLICK,
    GA_ACTION_LEARN_MORE_TRY_EMPTY_ROOMS_CLICK,
    GA_LEARN_MORE_BEDROOM_LABEL,
    GA_LEARN_MORE_MAIN_LABEL,
    TRACK_LOCATION_LEARNMORE,
} from 'models/tracking/constants'
import { BEDROOM, FULLY_FURNISHED } from 'models/scenes/constants'
import { Testimonials } from 'components/dashboard/testimonials'
import { track } from 'utils/tracker'
import {
    USER_SCROLLED_PAST_LEARNMORE_BEDROOM,
    USER_SCROLLED_PAST_LEARNMORE_MAKES_IT_EASY,
} from 'models/sessionStorage/constants'
import { LearnMoreMorpheusHero } from './LearnMoreMorpheusHero'
import './LearnMoreV2.scss'

const TRACKING_MAKES_IT_EASY_SECTION = 'MakesItEasy'
const TRACKING_BEDROOM_SECTION = 'Bedroom'

const imgSrc = (image: string) => withPrefix(`/images/graphics/learnmore/${image}`)
const VIDEO_URL = `${process.env.GATSBY_ASSET_BUCKET}/videos/personalize-your-space.mp4`
const TRY_SHOWROOMS_URL = `/#showrooms`
const TRY_FURNISHED_ROOMS_URL = `/?${getSearch()}#furnishedrooms`
const TRY_FURNISHED_AND_FILTERED_ROOMS_URL = `/?furnishingType=${FULLY_FURNISHED}&roomType=${BEDROOM.toLowerCase()}&${getSearch()}#furnishedrooms`

const GetIkeaAppButton = ({ trackGetIkeaAppClick }: { trackGetIkeaAppClick: () => void }) => {
    const { t } = useTranslation('learnmore')
    const appStoreLink = getAppStoreUrl({ source: APP_STORE_SOURCE_MOBILE_LEARNMORE_V2 })

    return (
        <Button
            className="getStartedButton"
            type="primary"
            href={appStoreLink}
            target="_blank"
            rel="noreferrer"
            onClick={trackGetIkeaAppClick}
        >
            <SSRIcon paths={mobileHandover} className="mobileHandoverIcon" />
            <p>{t('learnmore.go to ikea app')}</p>
        </Button>
    )
}

const LearnMorePagev2 = () => {
    const { isMobile } = useSugarcubeContext()
    const { t } = useTranslation('learnmore')
    const dispatch = useAppDispatch()

    const orientation = useAppSelector(getOrientation)
    const trackGaEvent = (trackingInfo: GATrackingInfoProps) => dispatch(trackGaEventAction(trackingInfo))
    const setShowAppDownloadModal = (show: boolean) => dispatch(showAppDownloadModalAction(show))

    const makesItEasySectionRef = useRef<HTMLDivElement | null>(null)
    const bedroomSectionRef = useRef<HTMLDivElement | null>(null)

    useScrollTracking(
        makesItEasySectionRef,
        USER_SCROLLED_PAST_LEARNMORE_MAKES_IT_EASY,
        TRACKING_MAKES_IT_EASY_SECTION,
        TRACK_LOCATION_LEARNMORE,
        0.3,
    )

    useScrollTracking(
        bedroomSectionRef,
        USER_SCROLLED_PAST_LEARNMORE_BEDROOM,
        TRACKING_BEDROOM_SECTION,
        TRACK_LOCATION_LEARNMORE,
        0.3,
    )

    const hasLandscapeOrientation = orientation === ORIENTATION_LANDSCAPE
    const videoRef = useRef<HTMLVideoElement>(null)

    const goToShowrooms = (accessFrom: string) => {
        const trackingInfo = {
            action: GA_ACTION_LEARN_MORE_TRY_EMPTY_ROOMS_CLICK,
            label: accessFrom,
        }
        trackGaEvent(trackingInfo)
        track('LearnMore.TryEmptyRoomsClick', { AccessFrom: accessFrom })
        navigate(TRY_SHOWROOMS_URL)
    }

    const goToFurnishedRooms = (accessFrom: string) => {
        const trackingInfo = {
            action: GA_ACTION_LEARN_MORE_GO_TO_FURNISHED_ROOMS_CLICK,
            label: accessFrom,
        }
        trackGaEvent(trackingInfo)
        track('LearnMore.GoToFurnishedRoomsClick', { AccessFrom: accessFrom })

        navigate(
            accessFrom === GA_LEARN_MORE_BEDROOM_LABEL ? TRY_FURNISHED_AND_FILTERED_ROOMS_URL : TRY_FURNISHED_ROOMS_URL,
        )
    }

    const trackGetIkeaAppClick = (gaClickFromLabel: string) => {
        const trackingInfo = {
            action: GA_ACTION_LEARN_MORE_GO_TO_IKEA_APP_CLICK,
            label: gaClickFromLabel,
        }
        trackGaEvent(trackingInfo)
        track('LearnMore.GoToIkeaAppClick', { AccessFrom: gaClickFromLabel })
    }

    const openAppDownloadModal = (accessFrom: string) => {
        setShowAppDownloadModal(true)
        trackGetIkeaAppClick(accessFrom)
    }

    return (
        <div className={classNames('LearnMorePagev2', { isMobile, landscape: hasLandscapeOrientation })}>
            <LearnMoreMorpheusHero isMobile={isMobile} />
            <div className="wrapper" ref={makesItEasySectionRef}>
                <div id="inspiredDesign" className="approachableContainer">
                    <div className="approachableQuoteContainer">
                        <div className="quoteText">
                            <p className="approachableTitle">{t('learnmore.ikea kreative makes it easy')}</p>
                        </div>
                    </div>

                    <section id="saveTimeAndEffort" data-testid="save-time-and-effort">
                        <div className="imageTextBanner yourOptions">
                            <div className="textContainer rightSpace">
                                <p className="title">{t('learnmore.visualize your options')}</p>
                                <p className="description">
                                    {t('learnmore.try ikea furniture and decor in lifelike spaces')}
                                </p>
                            </div>
                            <div className="imageContainer rightSpace">
                                <img
                                    src={imgSrc('visualize-your-options.png')}
                                    alt={t('learnmore.swap chairs image alt')}
                                />
                            </div>
                        </div>

                        <div className="imageTextBanner textRhs">
                            <div className="imageContainer leftSpace">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    loop
                                    className="video"
                                    poster={imgSrc('personalize-thumbnail.png')}
                                >
                                    <source src={VIDEO_URL} type="video/mp4" />
                                    <track />
                                </video>
                            </div>
                            <div className="textContainer rhs leftSpace">
                                <p className="title">{t('learnmore.personalize your space')}</p>
                                <p className="description">{t('learnmore.express your unique sense of style')}</p>
                            </div>
                        </div>

                        <div className="imageTextBanner chooseYourOptions">
                            <div className="textContainer rightSpace">
                                <p className="title">{t('learnmore.choose your products')}</p>
                                <p className="description">
                                    {t('learnmore.visually compare items to see what best suits')}
                                </p>
                            </div>
                            <div className="imageContainer rightSpace">
                                <img
                                    src={imgSrc('choose-your-products.png')}
                                    alt={t('learnmore.share your design ideas image alt')}
                                />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="cardsContainer">
                    <p className="header">{t('learnmore.try furniture and decor in a lifelik﻿e space')}</p>
                    <p className="subheader">{t('learnmore.create room design for your')}</p>

                    <div className="cards designStepsContainer">
                        <div className="imageTextCard">
                            <div className="imageContainer">
                                <img src={imgSrc('empty-2.png')} alt={t('learnmore.start with a blank slate')} />
                            </div>
                            <div className="textContainer">
                                <p className="title">{t('learnmore.empty')}</p>
                                <p className="description">{t('learnmore.start with a blank slate')}</p>
                            </div>
                            <div className="stepButton">
                                {isMobile ? (
                                    <GetIkeaAppButton
                                        trackGetIkeaAppClick={() => trackGetIkeaAppClick(GA_LEARN_MORE_MAIN_LABEL)}
                                    />
                                ) : (
                                    <Button
                                        text={t('learnmore.go to empty rooms')}
                                        ssrIcon={arrowRight}
                                        size="small"
                                        iconPosition="trailing"
                                        type="primary"
                                        onClick={() => goToShowrooms(GA_LEARN_MORE_MAIN_LABEL)}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="imageTextCard">
                            <div className="imageContainer relative">
                                <img
                                    src={imgSrc('furnished.png')}
                                    alt={t('learnmore.select a furnished virtual room')}
                                />
                            </div>
                            <div className="textContainer">
                                <p className="title">{t('learnmore.furnished')}</p>
                                <p className="description">{t('learnmore.select a furnished virtual room')}</p>
                            </div>
                            <div className="stepButton">
                                {isMobile ? (
                                    <GetIkeaAppButton
                                        trackGetIkeaAppClick={() => trackGetIkeaAppClick(GA_LEARN_MORE_MAIN_LABEL)}
                                    />
                                ) : (
                                    <Button
                                        text={t('learnmore.go to furnished rooms')}
                                        ssrIcon={arrowRight}
                                        size="small"
                                        iconPosition="trailing"
                                        type="primary"
                                        onClick={() => goToFurnishedRooms(GA_LEARN_MORE_MAIN_LABEL)}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="imageTextCard">
                            <div className="imageContainer">
                                <img src={imgSrc('your-own.png')} alt={t('learnmore.use the ikea app to capture')} />
                            </div>
                            <div className="textContainer">
                                <p className="title">{t('learnmore.your own')}</p>
                                <p className="description">{t('learnmore.use the ikea app to capture')}</p>
                            </div>
                            <div className="stepButton">
                                {isMobile ? (
                                    <GetIkeaAppButton
                                        trackGetIkeaAppClick={() => trackGetIkeaAppClick(GA_LEARN_MORE_MAIN_LABEL)}
                                    />
                                ) : (
                                    <Button
                                        text={t('learnmore.go to ikea app')}
                                        ssrIcon={arrowRight}
                                        size="small"
                                        iconPosition="trailing"
                                        type="primary"
                                        onClick={() => openAppDownloadModal(GA_LEARN_MORE_MAIN_LABEL)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="ikeaForBedroomContainer" id="bedroom">
                <div className="wrapper">
                    <p className="overlayText">{t('learnmore.ikea kreativ for bedroom')}</p>
                </div>
            </div>

            <div className="wrapper" ref={bedroomSectionRef}>
                {!isMobile && (
                    <div className="testimonialsContainer">
                        <p className="header">{t('learnmore.find your ideal ikea bedroom furniture')}</p>
                        <Testimonials customButtonText={t('learnmore.try it now')} />
                    </div>
                )}

                <div id="inspiredDesign" className="approachableContainer">
                    <div className="approachableQuoteContainer">
                        <div className="quoteText">
                            <p className="approachableTitle">
                                {t('learnmore.design stylish and comfortable sleep spaces')}
                            </p>
                        </div>
                    </div>

                    <section id="saveTimeAndEffort" data-testid="save-time-and-effort">
                        <div className="imageTextBanner yourOptions">
                            <div className="textContainer rightSpace">
                                <p className="title">{t('learnmore.dress the bed')}</p>
                                <p className="description">{t('learnmore.see how ikea dreamy linens can help you')}</p>
                            </div>
                            <div className="imageContainer rightSpace">
                                <img src={imgSrc('dress-the-bed-learn-more.png')} alt={t('learnmore.dress the bed')} />
                            </div>
                        </div>

                        <div className="imageTextBanner textRhs">
                            <div className="imageContainer leftSpace">
                                <img src={imgSrc('place-items-intelligently-learn-more.png')} alt="" />
                            </div>
                            <div className="textContainer rhs leftSpace">
                                <p className="title">{t('learnmore.place items intelligently')}</p>
                                <p className="description">{t('learnmore.use the built in design assistance')}</p>
                            </div>
                        </div>

                        <div className="imageTextBanner rightSpace chooseYourOptions">
                            <div className="textContainer rightSpace">
                                <p className="title">{t('learnmore.discover sleep products')}</p>
                                <p className="description">{t('learnmore.explore and more')}</p>
                            </div>
                            <div className="imageContainer">
                                <img
                                    src={imgSrc('discover-sleep-products.png')}
                                    alt={t('learnmore.share your design ideas image alt')}
                                />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="cardsContainer" id="tryBedroom">
                    <p className="header">{t('learnmore.try bedroom furniture and decor in a lifelike space')}</p>
                    <p className="subheader">{t('learnmore.create room designs that are perfect')}</p>

                    <div className="cards designStepsContainer">
                        <div className="imageTextCard">
                            <div className="imageContainer">
                                <img src={imgSrc('empty-2.png')} alt={t('learnmore.start with a blank slate')} />
                            </div>
                            <div className="textContainer">
                                <p className="title">{t('learnmore.empty')}</p>
                                <p className="description">{t('learnmore.start with a blank slate')}</p>
                            </div>
                            <div className="stepButton">
                                {isMobile ? (
                                    <GetIkeaAppButton
                                        trackGetIkeaAppClick={() => trackGetIkeaAppClick(GA_LEARN_MORE_BEDROOM_LABEL)}
                                    />
                                ) : (
                                    <Button
                                        text={t('learnmore.go to empty rooms')}
                                        ssrIcon={arrowRight}
                                        size="small"
                                        iconPosition="trailing"
                                        type="primary"
                                        onClick={() => goToShowrooms(GA_LEARN_MORE_BEDROOM_LABEL)}
                                        className="stepButton"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="imageTextCard">
                            <div className="imageContainer relative">
                                <img
                                    src={imgSrc('furnished-2.png')}
                                    alt={t('learnmore.select a furnished virtual bedroom')}
                                />
                            </div>
                            <div className="textContainer">
                                <p className="title">{t('learnmore.furnished')}</p>
                                <p className="description">{t('learnmore.select a furnished virtual bedroom')}</p>
                            </div>
                            <div className="stepButton">
                                {isMobile ? (
                                    <GetIkeaAppButton
                                        trackGetIkeaAppClick={() => trackGetIkeaAppClick(GA_LEARN_MORE_BEDROOM_LABEL)}
                                    />
                                ) : (
                                    <Button
                                        text={t('learnmore.go to furnished bedrooms')}
                                        ssrIcon={arrowRight}
                                        size="small"
                                        iconPosition="trailing"
                                        type="primary"
                                        onClick={() => goToFurnishedRooms(GA_LEARN_MORE_BEDROOM_LABEL)}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="imageTextCard">
                            <div className="imageContainer">
                                <img src={imgSrc('your-own-2.png')} alt={t('learnmore.use the ikea app to capture')} />
                            </div>
                            <div className="textContainer">
                                <p className="title">{t('learnmore.your own')}</p>
                                <p className="description">{t('learnmore.use the ikea app to capture')}</p>
                            </div>
                            <div className="stepButton">
                                {isMobile ? (
                                    <GetIkeaAppButton
                                        trackGetIkeaAppClick={() => trackGetIkeaAppClick(GA_LEARN_MORE_BEDROOM_LABEL)}
                                    />
                                ) : (
                                    <Button
                                        text={t('learnmore.go to ikea app')}
                                        ssrIcon={arrowRight}
                                        size="small"
                                        iconPosition="trailing"
                                        type="primary"
                                        onClick={() => {
                                            openAppDownloadModal(GA_LEARN_MORE_BEDROOM_LABEL)
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!isMobile && <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_LEARNMORE_V2} />}
        </div>
    )
}

export default LearnMorePagev2
