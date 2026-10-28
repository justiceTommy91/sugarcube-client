import React from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'react-qr-code'
import arrowCounterclockwise from '@ingka/ssr-icon/paths/arrow-counterclockwise'
import Button from '@ingka/button'
import { useAppDispatch, useAppSelector } from 'hooks'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import * as compositionActions from 'models/compositions/actions'
import * as compositionSelectors from 'models/compositions/selectors'
import * as upptackaSelectors from 'models/upptacka/selectors'
import { getUpptackaQRCodeUrl } from 'models/upptacka/helpers'

require('./UpptackaQRSave.scss')

export const UpptackaQRSave = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const isSaving = useAppSelector(compositionSelectors.getIsSaving)
    const hasSaveError = useAppSelector(compositionSelectors.getHasSaveError)
    const showError = !isSaving && hasSaveError
    const lastSavedUpptackaComposition = useAppSelector(upptackaSelectors.getLastSavedUpptackaComposition)
    const selectedCompositionId = useAppSelector(compositionSelectors.getSelectedCompositionId)

    const qrContent = isSaving ? (
        <BouncingBallLoader subheaderText={`${t('shared.saving your design')}...`} />
    ) : (
        <div className="UpptackaQRSave__qr-code">
            <QRCode size={220} value={getUpptackaQRCodeUrl(lastSavedUpptackaComposition || selectedCompositionId)} />
        </div>
    )

    if (showError) {
        return (
            <div className="UpptackaQRSave">
                <div className="UpptackaQRSave__error-container">
                    <h2>{t('shared.something went wrong')}</h2>
                    <p>{t('shared.errSavingMessage')}</p>
                    <Button
                        onClick={() => dispatch(compositionActions.saveUpptackaComposition())}
                        type="primary"
                        ssrIcon={arrowCounterclockwise}
                        text={t('shared.refresh')}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="UpptackaQRSave">
            <div className="UpptackaQRSave__qr-container">{qrContent}</div>
            <div className="UpptackaQRSave__text-container">
                <h4 className="UpptackaQRSave__title">{t('upptacka.save title')}</h4>
                <ol>
                    <li>
                        <p className="UpptackaQRSave__body">{t('upptacka.save body 1')}</p>
                    </li>
                    <li>
                        <p className="UpptackaQRSave__body">{t('upptacka.save body 2')}</p>
                    </li>
                    <li>
                        <p className="UpptackaQRSave__body">{t('upptacka.save body 3')}</p>
                    </li>
                </ol>
                <span className="UpptackaQRSave__app-version-disclaimer">{t('upptacka.app version text')}</span>
            </div>
        </div>
    )
}
