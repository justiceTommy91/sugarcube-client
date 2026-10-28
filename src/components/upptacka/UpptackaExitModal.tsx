import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import Modal, { Theatre } from '@ingka/modal'
import cross from '@ingka/ssr-icon/paths/cross'
import * as upptackaSelectors from 'models/upptacka/selectors'
import { upptackaActions } from 'models/upptacka/slice'

import { useAppDispatch, useAppSelector } from 'hooks'
import { useTracker } from 'apps/TrackingBoundary'
import { trackGoogleAnalytics } from 'utils/tracker'
import {
    ACTION_UPPTACKA_CLOSE_PANEL,
    ACTION_UPPTACKA_EXIT,
    GA_ACTION_UPPTACKA_CLOSE_PANEL,
    GA_ACTION_UPPTACKA_EXIT,
    GA_CATEGORY_DYH_SUGARCUBE,
    LABEL_UPPTACKA_CLOSE_EXIT_PANEL,
} from 'models/tracking/constants'
import { UpptackaQRSave } from './UpptackaQRSave'

require('./UpptackaExitModal.scss')

export const UpptackaExitModal = () => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const isVisible = useAppSelector((state) => upptackaSelectors.getShowUpptackaExitModal(state))
    const track = useTracker()

    const onClose = () => {
        trackGoogleAnalytics({
            action: GA_ACTION_UPPTACKA_CLOSE_PANEL,
            category: GA_CATEGORY_DYH_SUGARCUBE,
            label: LABEL_UPPTACKA_CLOSE_EXIT_PANEL,
        })
        track.click({
            target: 'upptacka.closeExitPanelButton',
            intendedAction: ACTION_UPPTACKA_CLOSE_PANEL,
            attributes: {
                type: LABEL_UPPTACKA_CLOSE_EXIT_PANEL,
            },
        })
        dispatch(upptackaActions.setShowUpptackaExitModal(false))
    }
    return (
        <Modal className="UpptackaExitModal" handleCloseBtn={onClose} visible={isVisible}>
            <Theatre className="UpptackaExitModal__theatre" header={null}>
                <Button
                    className="UpptackaExitModal__close"
                    iconOnly
                    onClick={onClose}
                    ssrIcon={cross}
                    type="tertiary"
                    text={t('aria.close')}
                />
                <div className="UpptackaExitModal__content">
                    <div className="UpptackaExitModal__save-wrapper">
                        <UpptackaQRSave />
                    </div>
                    <div className="UpptackaExitModal__right-container">
                        <div className="UpptackaExitModal__text">
                            <h3 className="UpptackaExitModal__title">{t('upptacka.exit title')}</h3>
                            <span className="UpptackaExitModal__body">{t('upptacka.exit body')}</span>
                        </div>
                        <Button
                            className="UpptackaExitModal__exit-button"
                            fluid
                            onClick={() => {
                                trackGoogleAnalytics({
                                    action: GA_ACTION_UPPTACKA_EXIT,
                                    category: GA_CATEGORY_DYH_SUGARCUBE,
                                    label: '',
                                })
                                track.click({
                                    target: 'upptacka.confirmExitButton',
                                    intendedAction: ACTION_UPPTACKA_EXIT,
                                })
                                window.parent.postMessage(`upptacka_close_iframe`, '*')
                            }}
                            text={t('upptacka.exit cta')}
                            type="primary"
                        />
                    </div>
                </div>
            </Theatre>
        </Modal>
    )
}
