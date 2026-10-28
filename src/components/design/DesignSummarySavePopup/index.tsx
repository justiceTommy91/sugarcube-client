import React from 'react'
import { useTranslation } from 'react-i18next'
import Modal, { Prompt, ModalFooter, ModalHeader } from '@ingka/modal'
import Button from '@ingka/button'
import { useAppSelector } from 'hooks'
import { getSelectedComposition } from 'models/compositions/selectors'
import { getDebugSettings } from 'models/admin/selectors'

require('./styles.scss')

export type SaveTrackingInfo = {
    SavedFrom: string
}
interface DesignSummarySavePopupProps {
    onClose: () => void
    onClickSave: () => void
    onClickGoBack: () => void
    isSaving: boolean
    hasSaveError: boolean
}

const DesignSummarySavePopup: React.FunctionComponent<DesignSummarySavePopupProps> = ({
    onClickSave,
    onClose,
    onClickGoBack,
    isSaving,
    hasSaveError,
}) => {
    const { t } = useTranslation()
    const { composition, debugSettings } = useAppSelector((appState) => ({
        composition: getSelectedComposition(appState),
        debugSettings: getDebugSettings(appState),
    }))

    const isReadOnly = composition?.isGLTF && debugSettings.disable3DCompositionSave
    const modalTitle = isReadOnly ? t('design.scene is read-only') : t('designSummaryExit.save design before you leave')
    const modalMessage = isReadOnly
        ? t('design.your composition is read-only')
        : t('designSummaryExit.saving allows you')
    const disableActions = isSaving && !hasSaveError

    return (
        <Modal
            className="DesignSummarySavePopup"
            visible
            escapable={false}
            handleCloseBtn={() => {
                if (!disableActions) {
                    onClose()
                }
            }}
        >
            <Prompt
                open
                title={modalTitle}
                header={<ModalHeader ariaCloseTxt={t('design.cancel')} />}
                titleId="DesignSummarySavePopup"
                footer={
                    <ModalFooter className="modalFooter">
                        <Button
                            data-autofocus
                            text={isReadOnly ? t('design.no') : t('designSummaryExit.save & exit')}
                            type="primary"
                            onClick={() => {
                                if (isReadOnly) {
                                    onClose()
                                } else {
                                    onClickSave()
                                }
                            }}
                            disabled={disableActions}
                        />
                        <Button
                            text={isReadOnly ? t('design.yes') : t('designSummaryExit.discard')}
                            type="secondary"
                            onClick={() => {
                                onClickGoBack()
                            }}
                            disabled={disableActions}
                        />
                    </ModalFooter>
                }
            >
                <div className="modalContent">
                    <p>{modalMessage}</p>
                </div>
            </Prompt>
        </Modal>
    )
}

export default DesignSummarySavePopup
