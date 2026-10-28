import React from 'react'
import { withPrefix } from 'gatsby'
import Image from '@ingka/image'
import Button from '@ingka/button'
import cross from '@ingka/ssr-icon/paths/cross'
import Modal, { Theatre } from '@ingka/modal'
import { useTracker } from 'apps/TrackingBoundary'
import * as upptackaSelectors from 'models/upptacka/selectors'
import { upptackaActions } from 'models/upptacka/slice'
import { useTranslation } from 'react-i18next'

import { useAppDispatch, useAppSelector } from 'hooks'
import { trackGoogleAnalytics } from 'utils/tracker'
import {
    ACTION_UPPTACKA_CLOSE_PANEL,
    GA_ACTION_UPPTACKA_CLOSE_PANEL,
    GA_CATEGORY_DYH_SUGARCUBE,
    LABEL_UPPTACKA_CLOSE_SAVE_PANEL,
} from 'models/tracking/constants'
import { UpptackaQRSave } from './UpptackaQRSave'

require('./UpptackaSaveModal.scss')

export const UpptackaSaveModal = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const isVisible = useAppSelector((state) => upptackaSelectors.getShowUpptackaSaveModal(state))
    const track = useTracker()

    const onClose = () => {
        trackGoogleAnalytics({
            action: GA_ACTION_UPPTACKA_CLOSE_PANEL,
            category: GA_CATEGORY_DYH_SUGARCUBE,
            label: LABEL_UPPTACKA_CLOSE_SAVE_PANEL,
        })
        track.click({
            target: 'upptacka.closeSavePanelButton',
            intendedAction: ACTION_UPPTACKA_CLOSE_PANEL,
            attributes: {
                type: LABEL_UPPTACKA_CLOSE_SAVE_PANEL,
            },
        })
        dispatch(upptackaActions.setShowUpptackaSaveModal(false))
    }
    return (
        <Modal className="UpptackaSaveModal" handleCloseBtn={onClose} visible={isVisible}>
            <Theatre className="UpptackaSaveModal__theatre" header={null}>
                <Button
                    className="UpptackaSaveModal__close"
                    ssrIcon={cross}
                    iconOnly
                    onClick={onClose}
                    type="primary"
                    inverseTheme
                    text={t('aria.close')}
                />
                <div className="UpptackaSaveModal__content">
                    <Image src={withPrefix('/images/graphics/upptackaSave.jpg')} alt="" />
                    <div className="UpptackaSaveModal__save-wrapper">
                        <UpptackaQRSave />
                    </div>
                </div>
            </Theatre>
        </Modal>
    )
}
