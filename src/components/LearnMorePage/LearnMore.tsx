import React from 'react'
import classNames from 'classnames'
import { connect } from 'react-redux'
import SSRIcon from '@ingka/ssr-icon'
import Button from '@ingka/button'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import bed from '@ingka/ssr-icon/paths/bed'
import sofa from '@ingka/ssr-icon/paths/sofa'
import laptop from '@ingka/ssr-icon/paths/laptop'
import cutlery from '@ingka/ssr-icon/paths/cutlery'
import layoutAlternative from '@ingka/ssr-icon/paths/layout-alternative'
import mobileHandover from '@ingka/ssr-icon/paths/mobile-handover'
import mail from '@ingka/ssr-icon/paths/mail'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import Icon from 'components/uiElements/Icon'
import AppDownloadQRModal from 'components/AppDownloadQRModal'
import { ORIENTATION_LANDSCAPE } from 'models/ui/constants'
import { getDesignLabUrl, getRegion } from 'models/location/selectors'
import { getOrientation } from 'models/ui/selectors'
import { trackGaEvent as trackGaEventAction } from 'models/tracking/actions'
import { GATrackingInfoProps } from 'models/tracking'
import Carousel from '@ingka/carousel'
import { click } from 'utils/tracker'
import {
    ACCESS_FROM_INSPIRED_DESIGN,
    ACCESS_FROM_SAVE_TIME_1,
    ACCESS_FROM_SAVE_TIME_2,
    ACCESS_FROM_CREATE_CONFIDENCE,
    GA_LABEL_INSPIRED_DESIGN,
    GA_LABEL_SAVE_TIME_1,
    GA_LABEL_SAVE_TIME_2,
    GA_LABEL_CREATE_CONFIDENCE,
    GA_LABEL_INTUITIVE_DESIGN,
    ACCESS_FROM_INTUITIVE_DESIGN,
    APP_STORE_SOURCE_MOBILE_LEARNMORE_V1,
    APP_STORE_SOURCE_WEB_LEARNMORE_V1,
} from 'models/tracking/constants'
import { getAppStoreUrl } from 'utils/buildUrls'
import { showAppDownloadModal as showAppDownloadModalAction } from 'models/ui/actions'
import { withPrefix } from 'gatsby'

import { useTranslation } from 'react-i18next'

import playArea from '@ingka/ssr-icon/paths/play-area'
import clock from '@ingka/ssr-icon/paths/clock'
import lightbulbWithRays from '@ingka/ssr-icon/paths/lightbulb-with-rays'
import { convertDimensionsToCentimeterByLocale } from 'utils/convertDimensions'

import Hero from './Hero'
import KreativExamples from './KreativExamples'

import './styles.scss'

interface Props {
    orientation: string
    trackGaEvent: (trackingInfo: GATrackingInfoProps) => void
    setShowAppDownloadModal: (show: boolean) => void
}

const imgSrc = (image: string) => withPrefix(`/images/aboutPageAssets/${image}`)

const LearnMore = ({ orientation, trackGaEvent, setShowAppDownloadModal }: Props) => {
    const { isMobile } = useSugarcubeContext()
    const { t } = useTranslation('learnmore')
    const locale = getRegion()

    const hasLandscapeOrientation = orientation === ORIENTATION_LANDSCAPE

    const appStoreLink = getAppStoreUrl({ source: APP_STORE_SOURCE_MOBILE_LEARNMORE_V1 })

    // dl-room-selection-heading is the id of the heading element Explore virtual showrooms on /home-design
    // TODO (Anu): change this to the new dashboard when it is live
    const tryShowroomsUrl = `${getDesignLabUrl()}#showrooms`

    const trackGetStatedClick = (gaClickFromLabel: string, accessFrom: string) => {
        const trackingInfo = {
            action: 'learnmore_get_started_click',
            label: gaClickFromLabel,
        }
        trackGaEvent(trackingInfo)
        click('LearnMore.GetStartedClick', { AccessFrom: accessFrom })
    }

    const trackGetIkeaAppClick = (gaClickFromLabel: string, accessFrom: string) => {
        const trackingInfo = {
            action: 'learnmore_get_ikea_app_click',
            label: gaClickFromLabel,
        }
        trackGaEvent(trackingInfo)
        click('LearnMore.GetIkeaAppClick', { AccessFrom: accessFrom })
    }

    return (
        <div className={classNames('LearnMorePage', { isMobile, landscape: hasLandscapeOrientation })}>
            <Hero isMobile={isMobile} imgSrc={imgSrc} trackGaEvent={trackGaEvent} />
            <div className="learnMoreGoals container">
                <p>{t('learnmore.visualize your dream')}</p>
                <p className="goalsDescription">{t('learnmore.explore ikea furniture')}</p>
            </div>
            <div className="keyValuesContainer">
                <div className="keyValuesCard">
                    <SSRIcon paths={playArea} className="keyValuesIcon" />
                    <p className="cardTitle">{t('learnmore.inspired design')}</p>
                    <p className="cardDescription">{t('learnmore.get inspired')}</p>
                    {/* <a href="#inspiredDesign">
                        <p>{t("learn more")}</p>
                    </a> */}
                </div>
                <div className="keyValuesCard middleCard">
                    <SSRIcon paths={clock} className="keyValuesIcon" />
                    <p className="cardTitle">{t('learnmore.save time')}</p>
                    <p className="cardDescription">{t('learnmore.streamline trial')}</p>
                </div>
                <div className="keyValuesCard lastCard">
                    <SSRIcon paths={lightbulbWithRays} className="keyValuesIcon" />
                    <p className="cardTitle">{t('learnmore.create with confidence')}</p>
                    <p className="cardDescription">{t('learnmore.explore ideas')}</p>
                </div>
            </div>
            <KreativExamples isMobile={isMobile} trackGaEvent={trackGaEvent} />
            <div id="inspiredDesign" className="approachableContainer">
                <div className="approachableQuoteContainer">
                    <div className="quoteText">
                        <p className="approachableTitle">{t('learnmore.inspired design')}</p>
                        <div className="approachableQuote">
                            <p>{t('learnmore.i was really thrilled')}</p>
                            <p className="customerName">{t('learnmore.mandy')}</p>
                        </div>
                    </div>
                    <img
                        src={imgSrc('tablesSlider.jpg')}
                        alt={t('learnmore.tables and slider alt')}
                        className="approachableImage"
                    />
                </div>

                <div className="approachableShowrooms">
                    <div className="showroomsText">
                        <p className="showroomsTitle">{t('learnmore.get inspired and start')}</p>
                        <p className="showroomsDescription">{t('learnmore.discover your style')}</p>
                        <div className="listOfSpaces">
                            <div className="availableSpace">
                                <SSRIcon paths={bed} />
                                <p className="spaceText">{t('learnmore.bedroom')}</p>
                            </div>
                            <div className="availableSpace">
                                <SSRIcon paths={sofa} />
                                <p className="spaceText">{t('learnmore.living room')}</p>
                            </div>
                            <div className="availableSpace">
                                <SSRIcon paths={laptop} />
                                <p className="spaceText">{t('learnmore.home office')}</p>
                            </div>
                            <div className="availableSpace">
                                <SSRIcon paths={cutlery} />
                                <p className="spaceText">{t('learnmore.dining room')}</p>
                            </div>
                            <div className="availableSpace">
                                <SSRIcon paths={layoutAlternative} />
                                <p className="spaceText">{t('learnmore.empty spaces')}</p>
                            </div>
                        </div>
                        {isMobile ? (
                            <Button
                                className="getStartedButton"
                                type="primary"
                                href={appStoreLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => {
                                    trackGetIkeaAppClick(GA_LABEL_INSPIRED_DESIGN, ACCESS_FROM_INSPIRED_DESIGN)
                                }}
                                newWindow
                            >
                                <SSRIcon paths={mobileHandover} className="mobileHandoverIcon" />
                                <p>{t('learnmore.get ikea app')}</p>
                            </Button>
                        ) : (
                            <Button
                                className="button"
                                type="primary"
                                href={tryShowroomsUrl}
                                target="_top"
                                onClick={() => {
                                    const trackingInfo = {
                                        action: 'learnmore_try_showrooms_click',
                                        label: 'inspired_design_section',
                                    }
                                    trackGaEvent(trackingInfo)
                                    click('LearnMore.TryShowroomsClick', { AccessFrom: ACCESS_FROM_INSPIRED_DESIGN })
                                }}
                            >
                                <p>{t('learnmore.try showrooms')}</p>
                                <SSRIcon className="arrowRightIcon" paths={arrowRight} />
                            </Button>
                        )}

                        {/* 
                        hide until we get links
                        {isMobile && (
                            <Button className="button" type="secondary">
                                <SSRIcon className="playIcon" paths={play} />
                                <p>{t("learnmore.see how it works")}</p>
                            </Button>
                        )} */}
                    </div>

                    {isMobile ? (
                        <Carousel
                            id="learn-more-showrooms-carousel"
                            className="showroomsCards"
                            controlBtnType="primary"
                            isSlideShow
                        >
                            <div className="cardColumn">
                                <div className="showroomCard">
                                    <img
                                        src={imgSrc('bedroom_card_small.jpg')}
                                        alt={t('learnmore.bedroom showroom alt')}
                                    />
                                    <p>{t('learnmore.bedroom')}</p>
                                </div>
                                <div className="showroomCard">
                                    <img
                                        src={imgSrc('living_room_card_small.jpg')}
                                        alt={t('learnmore.living room showroom alt')}
                                    />
                                    <p>{t('learnmore.living room')}</p>
                                </div>
                            </div>
                            <div className="cardColumn">
                                <div className="showroomCard">
                                    <img
                                        src={imgSrc('home_office_card_small.jpg')}
                                        alt={t('learnmore.home office showroom alt')}
                                    />
                                    <p>{t('learnmore.home office')}</p>
                                </div>
                                <div className="showroomCard">
                                    <img
                                        src={imgSrc('dining_room_card_small.jpg')}
                                        alt={t('learnmore.dining room showroom alt')}
                                    />
                                    <p>{t('learnmore.dining room')}</p>
                                </div>
                            </div>
                        </Carousel>
                    ) : (
                        <a href={tryShowroomsUrl} target="_top">
                            <div className="showroomsCards">
                                <div className="showroomCard">
                                    <img
                                        src={imgSrc('bedroom_card_small.jpg')}
                                        alt={t('learnmore.bedroom showroom alt')}
                                    />
                                    <p>{t('learnmore.bedroom')}</p>
                                </div>
                                <div className="showroomCard">
                                    <img
                                        src={imgSrc('living_room_card_small.jpg')}
                                        alt={t('learnmore.living room showroom alt')}
                                    />
                                    <p>{t('learnmore.living room')}</p>
                                </div>

                                <div className="showroomCard">
                                    <img
                                        src={imgSrc('home_office_card_small.jpg')}
                                        alt={t('learnmore.home office showroom alt')}
                                    />
                                    <p>{t('learnmore.home office')}</p>
                                </div>
                                <div className="showroomCard">
                                    <img
                                        src={imgSrc('dining_room_card_small.jpg')}
                                        alt={t('learnmore.dining room showroom alt')}
                                    />
                                    <p>{t('learnmore.dining room')}</p>
                                </div>
                            </div>
                        </a>
                    )}
                </div>

                <div className="designYourSpace">
                    <div className="imageTextBanner">
                        <div className="textContainer noImage">
                            <p className="title">{t('learnmore.intuitively design')}</p>
                            <p className="description">{t('learnmore.scan your room')}</p>
                            {isMobile ? (
                                <Button
                                    className="getStartedButton"
                                    type="primary"
                                    href={appStoreLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => {
                                        trackGetIkeaAppClick(GA_LABEL_INTUITIVE_DESIGN, ACCESS_FROM_INTUITIVE_DESIGN)
                                    }}
                                >
                                    <SSRIcon paths={mobileHandover} className="mobileHandoverIcon" />
                                    <p>{t('learnmore.get ikea app')}</p>
                                </Button>
                            ) : (
                                <Button
                                    className="getStartedButton"
                                    type="primary"
                                    onClick={() => {
                                        setShowAppDownloadModal(true)
                                        trackGetIkeaAppClick(GA_LABEL_INTUITIVE_DESIGN, ACCESS_FROM_INTUITIVE_DESIGN)
                                    }}
                                >
                                    <SSRIcon paths={mobileHandover} className="mobileHandoverIcon" />
                                    <p>{t('learnmore.get ikea app')}</p>
                                </Button>
                            )}
                            {/* 
                            hide until we get links

                            {isMobile && (
                                <Button className="button" type="secondary">
                                    <SSRIcon className="playIcon" paths={play} />
                                    <p>{t("learnmore.see how it works")}</p>
                                </Button>
                            )}  */}
                        </div>
                    </div>

                    <div className="cards designStepsContainer">
                        <div className="imageTextCard">
                            <div className="imageContainer">
                                <img src={imgSrc('scan-card-no-text.jpg')} alt={t('learnmore.scan your room alt')} />
                            </div>
                            <div className="textContainer">
                                <p className="title">{t('learnmore.scan')}</p>
                                <p className="description">{t('learnmore.use the ikea app')}</p>
                            </div>
                        </div>
                        <div className="imageTextCard">
                            <div className="imageContainer relative">
                                <img src={imgSrc('eraseCard.jpg')} alt={t('learnmore.erase your furniture alt')} />
                            </div>
                            <div className="textContainer">
                                <p className="title">{t('learnmore.erase')}</p>
                                <p className="description">{t('learnmore.virtually remove unwanted')}</p>
                            </div>
                        </div>
                        <div className="imageTextCard">
                            <div className="imageContainer">
                                <img src={imgSrc('designCard.jpg')} alt={t('learnmore.design your room alt')} />
                            </div>
                            <div className="textContainer">
                                <p className="title">{t('learnmore.design')}</p>
                                <p className="description">{t('learnmore.create your ideal')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!isMobile && <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_LEARNMORE_V1} />}

            <section id="saveTimeAndEffort" data-testid="save-time-and-effort">
                <div className="quoteBlock">
                    <div className="overlayText">
                        <div className="textContainer">
                            <p className="title">{t('learnmore.save time and effort')}</p>
                            <div className="quoteContainer">
                                <p>{t('learnmore.second quote')}</p>
                                <p className="quoteBy">{t('learnmore.quote name1')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="imageTextBanner">
                    <div className="textContainer">
                        <p className="title">{t('learnmore.unlimited options')}</p>
                        <p className="description">{t('learnmore.search items')}</p>
                        {isMobile ? (
                            <Button
                                className="getStartedButton"
                                type="primary"
                                href={appStoreLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => {
                                    trackGetIkeaAppClick(GA_LABEL_SAVE_TIME_1, ACCESS_FROM_SAVE_TIME_1)
                                }}
                            >
                                <SSRIcon paths={mobileHandover} className="mobileHandoverIcon" />
                                <p>{t('learnmore.get ikea app')}</p>
                            </Button>
                        ) : (
                            <Button
                                type="primary"
                                iconPosition="trailing"
                                ssrIcon={arrowRight}
                                text={<p>{t('learnmore.get started')}</p>}
                                href={tryShowroomsUrl}
                                className="getStartedButton"
                                target="_top"
                                onClick={() => {
                                    trackGetStatedClick(GA_LABEL_SAVE_TIME_1, ACCESS_FROM_SAVE_TIME_1)
                                }}
                            />
                        )}
                    </div>
                    <div className="imageContainer">
                        <img src={imgSrc('sofaSwaps_610w.jpg')} alt={t('learnmore.swap chairs image alt')} />
                    </div>
                </div>

                <div className="imageTextBanner textRhs">
                    <div className="imageContainer">
                        <img src={imgSrc('purchaseMobile_610w.jpg')} alt="" />
                    </div>
                    <div className="textContainer rhs">
                        <p className="title">{t('learnmore.purchase your designs')}</p>
                        <p className="description">{t("learnmore.it's easy to add items")}</p>
                    </div>
                </div>

                <div className="imageTextBanner">
                    <div className="textContainer">
                        <p className="title">{t('learnmore.save and share your ideas')}</p>
                        <p className="description">{t('learnmore.increase your confidence')}</p>
                    </div>
                    <div className="shareContainer">
                        <div className="imageContainer">
                            <img
                                src={imgSrc('roomCards_610w.jpg')}
                                alt={t('learnmore.share your design ideas image alt')}
                            />
                        </div>
                        <div className="socialShareIcons">
                            {['link', 'twitter', 'facebook', 'pinterest'].map((iconCode: string) => (
                                <div className="iconContainer" key={iconCode}>
                                    <Icon code={iconCode} svg={iconCode !== 'link'} />
                                </div>
                            ))}
                            <div className="iconContainer">
                                <SSRIcon paths={mail} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="imageTextBanner">
                    <div className="textContainer noImage">
                        <p className="title">{t('learnmore.add details to make your space')}</p>
                        <p className="description">{t('learnmore.easily place and arrange')}</p>
                        {isMobile ? (
                            <Button
                                className="getStartedButton"
                                type="primary"
                                href={appStoreLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => {
                                    trackGetIkeaAppClick(GA_LABEL_SAVE_TIME_2, ACCESS_FROM_SAVE_TIME_2)
                                }}
                            >
                                <SSRIcon paths={mobileHandover} className="mobileHandoverIcon" />
                                <p>{t('learnmore.get ikea app')}</p>
                            </Button>
                        ) : (
                            <Button
                                type="primary"
                                iconPosition="trailing"
                                ssrIcon={arrowRight}
                                text={<p>{t('learnmore.get started')}</p>}
                                href={tryShowroomsUrl}
                                className="getStartedButton"
                                target="_top"
                                onClick={() => {
                                    trackGetStatedClick(GA_LABEL_SAVE_TIME_2, ACCESS_FROM_SAVE_TIME_2)
                                }}
                            />
                        )}
                    </div>
                </div>
                <div className="cards">
                    <div className="imageTextCard">
                        <div className="imageContainer">
                            <img src={imgSrc('accessories.jpg')} alt={t('learnmore.accessories image alt')} />
                        </div>
                        <div className="textContainer">
                            <p className="title smallTitle">{t('learnmore.decorative accessories')}</p>
                            <p className="description">{t('learnmore.cozy candles')}</p>
                        </div>
                    </div>
                    <div className="imageTextCard">
                        <div className="imageContainer">
                            <img src={imgSrc('wallDecor.jpg')} alt={t('learnmore.wall decor image alt')} />
                        </div>
                        <div className="textContainer">
                            <p className="title smallTitle">{t('learnmore.wall décor')}</p>
                            <p className="description">{t('learnmore.make an artful display')}</p>
                        </div>
                    </div>
                    <div className="imageTextCard">
                        <div className="imageContainer">
                            <img src={imgSrc('wallColor_360w.jpg')} alt={t('learnmore.wall color image alt')} />
                        </div>
                        <div className="textContainer">
                            <p className="title smallTitle">{t('learnmore.wall color')}</p>
                            <p className="description">{t('learnmore.change wall color')}</p>
                        </div>
                    </div>
                </div>
            </section>
            <section id="createWithConfidence" data-testid="create-with-confidence">
                <div className="quoteBlock">
                    <div className="overlayText create">
                        <div className="textContainer">
                            <p className="title">{t('learnmore.create with confidence')}</p>
                            <div className="quoteContainer">
                                <p>{t('learnmore.third quote')}</p>
                                <p className="quoteBy">{t('learnmore.quote name2')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="imageTextBanner yourDesign">
                    <div className="textContainer">
                        <p className="title">{t('learnmore.your design made real')}</p>
                        <p className="description">{t('learnmore.design in a photorealistic')}</p>
                    </div>
                    <div className="imageContainer cabinet">
                        <p className="dimensions">
                            {`${convertDimensionsToCentimeterByLocale(40.125, locale)} x
                                ${convertDimensionsToCentimeterByLocale(20, locale)} x
                                ${convertDimensionsToCentimeterByLocale(30.875, locale)}`}
                        </p>
                        <img src={imgSrc('cabinet_916w.png')} alt={t('learnmore.cabinet image alt')} />
                    </div>
                </div>

                <div className="imageTextBanner textRhs">
                    <div className="imageContainer">
                        <img src={imgSrc('productsTogether_610w.jpg')} alt="" />
                    </div>
                    <div className="textContainer rhs">
                        <p className="title">{t('learnmore.see how pieces work together')}</p>
                        <p className="description">{t('learnmore.mix and match products')}</p>
                    </div>
                </div>
                <div className="imageTextBanner">
                    <div className="textContainer">
                        <p className="title">{t('learnmore.any place can be your canvas')}</p>
                        <p className="description">{t('learnmore.access on any device')}</p>
                        {isMobile ? (
                            <Button
                                className="getStartedButton"
                                type="primary"
                                href={appStoreLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => {
                                    trackGetIkeaAppClick(GA_LABEL_CREATE_CONFIDENCE, ACCESS_FROM_CREATE_CONFIDENCE)
                                }}
                            >
                                <SSRIcon paths={mobileHandover} className="mobileHandoverIcon" />
                                <p>{t('learnmore.get ikea app')}</p>
                            </Button>
                        ) : (
                            <Button
                                type="primary"
                                iconPosition="trailing"
                                ssrIcon={arrowRight}
                                text={<p>{t('learnmore.get started')}</p>}
                                href={tryShowroomsUrl}
                                className="getStartedButton"
                                target="_top"
                                onClick={() => {
                                    trackGetStatedClick(GA_LABEL_CREATE_CONFIDENCE, ACCESS_FROM_CREATE_CONFIDENCE)
                                }}
                            />
                        )}
                    </div>
                    <div className="imageContainer">
                        <img src={imgSrc('anyDevice.png')} alt={t('learnmore.mobile and desktop image alt')} />
                    </div>
                </div>
            </section>
            {/* <div className="showroomsContainer">
                <div className="imageContainer">
                    <img src={imgSrc('showrooms.jpg')} alt={t('learnmore.showrooms image alt')} />
                </div>
                <div className="roomTagsContainer">
                    <div className="roomTag sapGreen">
                        <Icon code="sofa" />
                        <p>{t('learnmore.living room')}</p>
                    </div>
                    <div className="roomTag maroon">
                        <Icon code="laptop" />
                        <p>{t('learnmore.home office')}</p>
                    </div>
                    <div className="roomTag blueGreen">
                        <Icon code="cutlery" />
                        <p>{t('learnmore.dining room')}</p>
                    </div>
                    <div className="roomTag oliveGreen">
                        <Icon code="bed" svg />
                        <p>{t('learnmore.bedroom')}</p>
                    </div>
                    <div className="roomTag blueGray">
                        <Icon code="sofa" />
                        <p>{t('learnmore.living room')}</p>
                    </div>
                    <div className="roomTag magenta">
                        <Icon code="bed" svg />
                        <p>{t('learnmore.bedroom')}</p>
                    </div>
                    <div className="roomTag darkBrown">
                        <Icon code="cutlery" />
                        <p>{t('learnmore.dining room')}</p>
                    </div>
                    <div className="roomTag purple">
                        <Icon code="bed" svg />
                        <p>{t('learnmore.bedroom')}</p>
                    </div>
                    <div className="roomTag lightBrown">
                        <Icon code="sofa" />
                        <p>{t('learnmore.living room')}</p>
                    </div>
                </div>
            </div> */}
        </div>
    )
}

const mapStateToProps = (state: string) => ({
    orientation: getOrientation(state),
})
const mapDispatchToProps = {
    trackGaEvent: trackGaEventAction,
    setShowAppDownloadModal: showAppDownloadModalAction,
}

export default connect(mapStateToProps, mapDispatchToProps)(LearnMore)
