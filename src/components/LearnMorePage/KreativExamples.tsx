import React, { useState } from 'react'
import Carousel from '@ingka/carousel'
// import Toggle from '@ingka/toggle'
import classNames from 'classnames'
import { ImgComparisonSlider } from '@img-comparison-slider/react'
import { GATrackingInfoProps } from 'models/tracking'
import SSRIcon from '@ingka/ssr-icon'
import arrowLeftRight from '@ingka/ssr-icon/paths/arrow-left-right'
import { click } from 'utils/tracker'
import './KreativExamples.scss'
import { useTranslation } from 'react-i18next'

import { withPrefix } from 'gatsby'

interface KreativExamplesProps {
    isMobile: boolean
    trackGaEvent: (trackingInfo: GATrackingInfoProps) => void
}

const NUM_SLIDES = 3

const KreativExamples = ({ isMobile, trackGaEvent }: KreativExamplesProps) => {
    const [slideIndex, setSlideIndex] = useState(0)
    const { t } = useTranslation('learnmore')

    const imgSrc = (image: string) => withPrefix(`/images/aboutPageAssets/${image}`)
    const firstSlide = slideIndex === 0
    const lastSlide = slideIndex === NUM_SLIDES - 1

    const prevButtonClick = () => {
        if (slideIndex !== 0) {
            const nextSlideIndex = slideIndex - 1
            setSlideIndex(nextSlideIndex)
            const trackingInfo = { action: 'learnmore_testimonial_click', label: `${nextSlideIndex}` }
            trackGaEvent(trackingInfo)
            click('LearnMore.TestimonialClick', { SlideIndex: nextSlideIndex })
        }
    }

    const nextButtonClick = () => {
        if (slideIndex !== NUM_SLIDES - 1) {
            const nextSlideIndex = slideIndex + 1
            setSlideIndex(nextSlideIndex)
            const trackingInfo = { action: 'learnmore_testimonial_click', label: `${nextSlideIndex}` }
            trackGaEvent(trackingInfo)
            click('LearnMore.TestimonialClick', { SlideIndex: nextSlideIndex })
        }
    }

    return (
        <div className={classNames('KreativExamples container', { isMobile, firstSlide, lastSlide })}>
            <p className="examplesTitle">{t('learnmore.create a better everyday')}</p>
            <p className="examplesDescription">{t('learnmore.see how others')}</p>
            <Carousel
                id="kreativ-examples-carousel"
                slideIndex={slideIndex}
                controlBtnType="tertiary"
                isSlideShow
                onBtnLeftClick={prevButtonClick}
                onBtnRightClick={nextButtonClick}
            >
                <ImgComparisonSlider keyboard="enabled" hover>
                    <div slot="first" className="imageContainer">
                        <img alt={t('learnmore.kreativ bedroom example alt')} src={imgSrc('after-1.jpg')} />
                        <p className="after">{t('learnmore.after')}</p>
                    </div>
                    <div slot="second" className="imageContainer">
                        <img alt={t('learnmore.kreativ bedroom example alt')} src={imgSrc('before-1.jpg')} />
                        <p className="before">{t('learnmore.before')}</p>
                    </div>
                    <div slot="handle" className="handleContainer">
                        <SSRIcon paths={arrowLeftRight} />
                    </div>
                </ImgComparisonSlider>
                <ImgComparisonSlider hover>
                    <div slot="first" className="imageContainer">
                        <img alt={t('learnmore.kreativ family room example alt')} src={imgSrc('after-2.jpg')} />
                        <p className="after">{t('learnmore.after')}</p>
                    </div>
                    <div slot="second" className="imageContainer">
                        <img alt={t('learnmore.kreativ bedroom example alt')} src={imgSrc('before-2.jpg')} />
                        <p className="before">{t('learnmore.before')}</p>
                    </div>
                    <div slot="handle" className="handleContainer">
                        <SSRIcon paths={arrowLeftRight} />
                    </div>
                </ImgComparisonSlider>
                <ImgComparisonSlider hover>
                    <div slot="first" className="imageContainer">
                        <img slot="first" alt={t('learnmore.kreativ office example alt')} src={imgSrc('after-3.jpg')} />
                        <p className="after">{t('learnmore.after')}</p>
                    </div>
                    <div slot="second" className="imageContainer">
                        <img
                            slot="second"
                            alt={t('learnmore.kreativ bedroom example alt')}
                            src={imgSrc('before-3.jpg')}
                        />
                        <p className="before">{t('learnmore.before')}</p>
                    </div>
                    <div slot="handle" className="handleContainer">
                        <SSRIcon paths={arrowLeftRight} />
                    </div>
                </ImgComparisonSlider>
            </Carousel>
        </div>
    )
}

export default KreativExamples
