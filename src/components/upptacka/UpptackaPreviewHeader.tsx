import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import informationCircle from '@ingka/ssr-icon/paths/information-circle'
import visibilityHide from '@ingka/ssr-icon/paths/visibility-hide'
import visibilityShow from '@ingka/ssr-icon/paths/visibility-show'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useTracker } from 'apps/TrackingBoundary'
import * as compositionActions from 'models/compositions/actions'
import * as uiActions from 'models/ui/actions'
import * as uiSelectors from 'models/ui/selectors'
import { upptackaActions } from 'models/upptacka/slice'
import { trackGoogleAnalytics } from 'utils/tracker'
import {
    ACTION_OPEN_DESIGN_TIPS,
    ACTION_UPPTACKA_OPEN_EXIT_PANEL,
    ACTION_UPPTACKA_OPEN_SAVE_PANEL,
    ACTION_UPPTACKA_TOGGLE_PIN_VISIBILITY,
    GA_ACTION_OPEN_DESIGN_TIPS,
    GA_ACTION_TOGGLE_PINS_VISIBILITY,
    GA_ACTION_UPPTACKA_OPEN_EXIT_PANEL,
    GA_ACTION_UPPTACKA_OPEN_SAVE_PANEL,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'
import { UpptackaTooltip } from './UpptackaTooltip'

require('./UpptackaPreviewHeader.scss')

export const UpptackaPreviewHeader = () => {
    const dispatch = useAppDispatch()
    const arePinsVisible = useAppSelector((state) => uiSelectors.getPinsVisibility(state))

    const { t } = useTranslation()
    const track = useTracker()

    return (
        <div className="UpptackaPreviewHeader">
            <UpptackaTooltip />
            <Button
                className="UpptackaPreviewHeader__back-button"
                iconOnly
                ssrIcon={arrowLeft}
                type="primary"
                inverseTheme
                onClick={() => {
                    trackGoogleAnalytics({
                        action: GA_ACTION_UPPTACKA_OPEN_EXIT_PANEL,
                        category: GA_CATEGORY_DYH_SUGARCUBE,
                        label: '',
                    })
                    track.click({
                        target: 'upptacka.openExitPanelButton',
                        intendedAction: ACTION_UPPTACKA_OPEN_EXIT_PANEL,
                    })
                    dispatch(compositionActions.saveUpptackaComposition())
                    dispatch(upptackaActions.setShowUpptackaExitModal(true))
                }}
                text={t('aria.exit')}
            />
            <div className="UpptackaPreviewHeader__right-buttons">
                <Button
                    className="UpptackaPreviewHeader__pins-button"
                    iconOnly
                    type="primary"
                    inverseTheme
                    ssrIcon={arePinsVisible ? visibilityHide : visibilityShow}
                    onClick={() => {
                        trackGoogleAnalytics({
                            action: GA_ACTION_TOGGLE_PINS_VISIBILITY,
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            label: `upptacka|${arePinsVisible ? 'hide' : 'show'}`,
                        })
                        track.click({
                            target: 'upptacka.togglePinsButton',
                            intendedAction: ACTION_UPPTACKA_TOGGLE_PIN_VISIBILITY,
                            attributes: {
                                type: arePinsVisible ? 'hide' : 'show',
                            },
                        })
                        dispatch(uiActions.togglePinsVisibility())
                    }}
                    aria-label={t('aria.toggle pins')}
                />
                <Button
                    className="UpptackaPreviewHeader__tips-button"
                    iconOnly
                    ssrIcon={informationCircle}
                    type="primary"
                    inverseTheme
                    onClick={() => {
                        trackGoogleAnalytics({
                            action: GA_ACTION_OPEN_DESIGN_TIPS,
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            label: '',
                        })
                        track.click({
                            target: 'upptacka.openDesignTipsButton',
                            intendedAction: ACTION_OPEN_DESIGN_TIPS,
                        })
                        dispatch(upptackaActions.setShowUpptackaDesignTips(true))
                    }}
                    text={t('upptacka.design tips.open button')}
                />
                <Button
                    className="UpptackaPreviewHeader__save-button"
                    text={t('upptacka.header save button')}
                    type="primary"
                    inverseTheme
                    onClick={() => {
                        trackGoogleAnalytics({
                            action: GA_ACTION_UPPTACKA_OPEN_SAVE_PANEL,
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            label: '',
                        })
                        track.click({
                            target: 'upptacka.openSavePanelButton',
                            intendedAction: ACTION_UPPTACKA_OPEN_SAVE_PANEL,
                        })
                        dispatch(compositionActions.saveUpptackaComposition())
                        dispatch(upptackaActions.setShowUpptackaSaveModal(true))
                    }}
                />
            </div>
        </div>
    )
}
