import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch } from 'hooks'
import { upptackaActions } from 'models/upptacka/slice'
import Button from '@ingka/button'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import chevronRight from '@ingka/ssr-icon/paths/chevron-right'
import chevronLeft from '@ingka/ssr-icon/paths/chevron-left'
import { useTracker } from 'apps/TrackingBoundary'
import {
    GA_CATEGORY_DYH_SUGARCUBE,
    GA_ACTION_CLOSE_DESIGN_TIPS,
    ACTION_CLOSE_DESIGN_TIPS,
    ACTION_ADVANCE_DESIGN_TIPS,
    GA_ACTION_ADVANCE_DESIGN_TIPS,
} from 'models/tracking/constants'
import { trackGoogleAnalytics } from 'utils/tracker'

require('./UpptackaDesignTipsHeader.scss')

interface Props {
    activeSlide: number
    nextBtnDisabled: boolean
    prevBtnDisabled: boolean
    onPrevButtonClick: () => void
    onNextButtonClick: () => void
}

export const UpptackaDesignTipsHeader = ({
    activeSlide,
    nextBtnDisabled,
    prevBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick,
}: Props) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const track = useTracker()

    return (
        <div className="UpptackaDesignTipsHeader">
            <Button
                className="UpptackaDesignTipsHeader__button--exit"
                inverseTheme
                onClick={() => {
                    trackGoogleAnalytics({
                        action: GA_ACTION_CLOSE_DESIGN_TIPS,
                        category: GA_CATEGORY_DYH_SUGARCUBE,
                        label: '',
                    })
                    track.click({
                        target: 'upptacka.closeDesignTipsButton',
                        intendedAction: ACTION_CLOSE_DESIGN_TIPS,
                    })
                    dispatch(upptackaActions.setShowUpptackaDesignTips(false))
                }}
                ssrIcon={arrowLeft}
                text={t('upptacka.design tips.exit button')}
                type="primary"
            />
            <div className="UpptackaDesignTipsHeader__slide-buttons">
                <Button
                    className="UpptackaDesignTipsHeader__button--previous-slide"
                    disabled={prevBtnDisabled}
                    inverseTheme
                    ssrIcon={chevronLeft}
                    text={t('upptacka.design tips.previous tip')}
                    aria-label={t('upptacka.design tips.previous tip')}
                    type="primary"
                    onClick={() => {
                        trackGoogleAnalytics({
                            action: GA_ACTION_ADVANCE_DESIGN_TIPS,
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            label: (activeSlide - 1).toString(),
                        })
                        track.click({
                            target: 'upptacka.designTipsPreviousSlideButton',
                            intendedAction: ACTION_ADVANCE_DESIGN_TIPS,
                            attributes: {
                                targetIndex: (activeSlide - 1).toString(),
                            },
                        })
                        onPrevButtonClick()
                    }}
                />
                <Button
                    className="UpptackaDesignTipsHeader__button--next-slide"
                    disabled={nextBtnDisabled}
                    iconPosition="trailing"
                    ssrIcon={chevronRight}
                    text={t('upptacka.design tips.next tip')}
                    aria-label={t('upptacka.design tips.next tip')}
                    type="primary"
                    onClick={() => {
                        trackGoogleAnalytics({
                            action: GA_ACTION_ADVANCE_DESIGN_TIPS,
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            label: (activeSlide + 1).toString(),
                        })
                        track.click({
                            target: 'upptacka.designTipsNextSlideButton',
                            intendedAction: ACTION_ADVANCE_DESIGN_TIPS,
                            attributes: {
                                targetIndex: (activeSlide + 1).toString(),
                            },
                        })
                        onNextButtonClick()
                    }}
                />
            </div>
        </div>
    )
}
