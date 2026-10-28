import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from 'hooks'
import Button from '@ingka/button'
import arrowCounterclockwise from '@ingka/ssr-icon/paths/arrow-counterclockwise'
import {
    requestSaveCompositionSharing,
    requestSaveExpertCheckConsent,
    saveCompositionBeforeSharing,
} from 'models/compositions/actions'
import { TRACK_LOCATION_EXPERT_CHECK } from 'models/tracking/constants'
import {
    getHasSaveError,
    getHasSavingExpertCheckConsentError,
    getHasSavingShareError,
    getSelectedCompositionData,
} from 'models/compositions/selectors'

export const ExpertCheckSidePanelErrorMessage = () => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()

    const selectedCompositionData = useAppSelector(getSelectedCompositionData)
    const hasSaveError = useAppSelector(getHasSaveError)
    const hasSavingShareError = useAppSelector(getHasSavingShareError)
    const hasSavingExpertCheckConsentError = useAppSelector(getHasSavingExpertCheckConsentError)

    const handleButtonOnClick = () => {
        if (hasSaveError) {
            dispatch(
                saveCompositionBeforeSharing({
                    SavedFrom: TRACK_LOCATION_EXPERT_CHECK,
                }),
            )
        }
        const { isShared, uuid, sendNotifications } = selectedCompositionData
        const compositionSharingData = {
            isShared,
            enableRemix: true,
            sendNotifications,
            compositionId: uuid,
        }
        if (hasSavingShareError) {
            dispatch(requestSaveCompositionSharing(compositionSharingData))
        }
        if (hasSavingExpertCheckConsentError) {
            dispatch(requestSaveExpertCheckConsent(compositionSharingData))
        }
    }

    return (
        <div>
            <h2 className="header">{t('shared.something went wrong')}</h2>
            <p className="text">{t('shared.errSavingMessage')}</p>
            <Button
                onClick={handleButtonOnClick}
                type="primary"
                ssrIcon={arrowCounterclockwise}
                text={t('shared.refresh')}
            />
        </div>
    )
}
