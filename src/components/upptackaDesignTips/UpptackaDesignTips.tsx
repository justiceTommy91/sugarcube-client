import React, { useCallback, useEffect, useState } from 'react'
import type { EmblaCarouselType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import { withPrefix } from 'gatsby'
import Modal, { Theatre } from '@ingka/modal'
import { useAppDispatch, useAppSelector } from 'hooks'
import * as compositionSelectors from 'models/compositions/selectors'
import { getLocale } from 'models/location/selectors'
import * as upptackaSelectors from 'models/upptacka/selectors'
import { upptackaActions } from 'models/upptacka/slice'
import type { AllowedUpptackaLocales } from 'models/upptacka/types'
import { UpptackaDesignTipsDescription } from './UpptackaDesignTipsDescription'
import { UpptackaDesignTipsHeader } from './UpptackaDesignTipsHeader'
import { UpptackaDesignTipsTutorial } from './UpptackaDesignTipsTutorial'
import { getUpptackaDesignTipsData } from './utils'

require('./UpptackaDesignTips.scss')

export const UpptackaDesignTips = () => {
    const [activeSlide, setActiveSlide] = useState(0)
    // Upptacka's session storage doesn't seem to clear itself when a 'session expires'
    // instead of tying the state to sessions, we will instead just show the tutorial every time they enter the scene and open design tips
    const [hasSeenTutorial, setHasSeenTutorial] = useState(false)
    const dispatch = useAppDispatch()
    const locale = getLocale() as AllowedUpptackaLocales
    const showUpptackaDesignTips = useAppSelector(upptackaSelectors.getShowUpptackaDesignTips)
    const compositionId = useAppSelector(compositionSelectors.getSelectedCompositionId)
    const designTipsData = getUpptackaDesignTipsData(compositionId)
    const handleTutorialClose = () => setHasSeenTutorial(true)
    const [emblaRef, emblaApi] = useEmblaCarousel({})
    const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
    const [nextBtnDisabled, setNextBtnDisabled] = useState(true)

    const onPrevButtonClick = useCallback(() => {
        emblaApi?.goToPrev()
    }, [emblaApi])

    const onNextButtonClick = useCallback(() => {
        emblaApi?.goToNext()
    }, [emblaApi])

    const onSelect = useCallback((embla: EmblaCarouselType) => {
        setPrevBtnDisabled(!embla.canGoToPrev())
        setNextBtnDisabled(!embla.canGoToNext())
        setActiveSlide(embla.selectedSnap())
    }, [])

    useEffect(() => {
        if (!emblaApi) return
        onSelect(emblaApi)
        emblaApi.on('reinit', onSelect).on(`select`, onSelect)
    }, [emblaApi, onSelect])

    return (
        <Modal
            className="UpptackaDesignTips"
            visible={showUpptackaDesignTips}
            handleCloseBtn={() => dispatch(upptackaActions.setShowUpptackaDesignTips(false))}
        >
            <Theatre
                header={
                    <UpptackaDesignTipsHeader
                        activeSlide={activeSlide}
                        onNextButtonClick={onNextButtonClick}
                        onPrevButtonClick={onPrevButtonClick}
                        prevBtnDisabled={prevBtnDisabled}
                        nextBtnDisabled={nextBtnDisabled}
                    />
                }
            >
                <section className="UpptackaDesignTipsSlider embla">
                    <div className="embla__viewport" ref={emblaRef}>
                        <div className="embla__container">
                            {designTipsData.map((tip) => (
                                <div className="embla__slide" key={tip.mainImage}>
                                    <img
                                        className="UpptackaDesignTips__slide-image"
                                        src={withPrefix(tip.mainImage)}
                                        alt={tip.title[locale]}
                                        data-testid="design-tips-slide-image"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                <UpptackaDesignTipsDescription activeSlide={activeSlide} />
                <UpptackaDesignTipsTutorial
                    hasSeenTutorial={hasSeenTutorial}
                    handleTutorialClose={handleTutorialClose}
                />
            </Theatre>
        </Modal>
    )
}
