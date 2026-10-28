import React from 'react'
import { useTranslation } from 'react-i18next'
import Modal, { ModalBody, ModalHeader, Sheets } from '@ingka/modal'
import { useAppDispatch, useAppSelector } from 'hooks'
import { toggleExpertCheckPanelOpen } from 'models/ui/actions'
import { getExpertCheckPanelOpen } from 'models/ui/selectors'
import {
    getHasSaveError,
    getHasSavingExpertCheckConsentError,
    getHasSavingShareError,
    getIsSaving,
    getIsSavingExpertCheckConsent,
    getIsSavingSharing,
} from 'models/compositions/selectors'
import {
    ACTION_CLOSE_EXPERT_CHECK_PANEL,
    GA_ACTION_CLOSE_EXPERT_CHECK_PANEL,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'
import { useTracker } from 'apps/TrackingBoundary'
import { trackGoogleAnalytics } from 'utils/tracker'
import { ExpertCheckSidePanelErrorMessage } from './ExpertCheckSidePanelErrorMessage'
import { ExpertCheckModalBody } from './ExpertCheckModalBody'

require('./styles.scss')

const ExpertCheckSidePanel: React.FC = () => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const track = useTracker()
    const isExpertCheckPanelOpen = useAppSelector(getExpertCheckPanelOpen)

    // saving composition
    const isSaving = useAppSelector(getIsSaving)
    const hasSaveError = useAppSelector(getHasSaveError)

    // saving a composition's share permissions
    const isSavingSharing = useAppSelector(getIsSavingSharing)
    const hasSavingShareError = useAppSelector(getHasSavingShareError)

    // saving a composition's expert check consent
    const isSavingExpertCheckConsent = useAppSelector(getIsSavingExpertCheckConsent)
    const hasSavingExpertCheckConsentError = useAppSelector(getHasSavingExpertCheckConsentError)

    const showError =
        (!isSaving && hasSaveError) ||
        (!isSavingSharing && hasSavingShareError) ||
        (!isSavingExpertCheckConsent && hasSavingExpertCheckConsentError)

    return (
        <Modal
            className="ExpertCheckSidePanel"
            handleCloseBtn={() => {
                trackGoogleAnalytics({
                    category: GA_CATEGORY_DYH_SUGARCUBE,
                    action: GA_ACTION_CLOSE_EXPERT_CHECK_PANEL,
                    label: '',
                })
                track.click({
                    target: 'expertCheck.close panel',
                    intendedAction: ACTION_CLOSE_EXPERT_CHECK_PANEL,
                })
                dispatch(toggleExpertCheckPanelOpen())
            }}
            visible={isExpertCheckPanelOpen}
        >
            <Sheets
                alignment="right"
                header={<ModalHeader ariaCloseTxt={t('login.close')} className="modalHeader" />}
                footer={<div />}
            >
                <ModalBody>{showError ? <ExpertCheckSidePanelErrorMessage /> : <ExpertCheckModalBody />}</ModalBody>
            </Sheets>
        </Modal>
    )
}

export default ExpertCheckSidePanel
