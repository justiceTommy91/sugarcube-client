import React from 'react'
import { useTranslation } from 'react-i18next'
import { DeletedType, SceneTypeLabel } from 'services/toasts'
import ControlledToast from './ControlledToast'

export type DeletedToastProps = {
    onDismiss: () => void
    deletedType: DeletedType
    sceneTypeLabel?: SceneTypeLabel
}

const DeletedToast: React.FunctionComponent<DeletedToastProps> = ({ onDismiss, deletedType, sceneTypeLabel }) => {
    const { t } = useTranslation()

    let message = ''

    switch (deletedType) {
        case DeletedType.SINGLE_COMPOSITION:
            message = t('dashboard.your design was successfully deleted', { ns: 'dashboard' })
            break
        case DeletedType.MULTIPLE_COMPOSITIONS:
            message = t('dashboard.your designs were successfully deleted', { ns: 'dashboard' })
            break
        case DeletedType.SCENE_WITH_NO_COMPOSITIONS:
            if (sceneTypeLabel === SceneTypeLabel.SCAN) {
                message = t('dashboard.your scan was successfully deleted', { ns: 'dashboard' })
            } else if (sceneTypeLabel === SceneTypeLabel.IMAGE) {
                message = t('dashboard.your image was successfully deleted', { ns: 'dashboard' })
            } else {
                message = t('dashboard.your room was successfully deleted', { ns: 'dashboard' })
            }
            break
        case DeletedType.SCENE_WITH_SINGLE_COMPOSITION:
            if (sceneTypeLabel === SceneTypeLabel.SCAN) {
                message = t('dashboard.your scan and its design were successfully deleted', { ns: 'dashboard' })
            } else if (sceneTypeLabel === SceneTypeLabel.IMAGE) {
                message = t('dashboard.your image and its design were successfully deleted', { ns: 'dashboard' })
            } else {
                message = t('dashboard.your room and its design were successfully deleted', { ns: 'dashboard' })
            }
            break
        case DeletedType.SCENE_WITH_COMPOSITIONS:
            if (sceneTypeLabel === SceneTypeLabel.SCAN) {
                message = t('dashboard.your scan and all its designs were successfully deleted', {
                    ns: 'dashboard',
                }) as string
            } else if (sceneTypeLabel === SceneTypeLabel.IMAGE) {
                message = t('dashboard.your image and all its designs were successfully deleted', {
                    ns: 'dashboard',
                }) as string
            } else {
                message = t('dashboard.your room and all its designs were successfully deleted', {
                    ns: 'dashboard',
                }) as string
            }
            break
        default:
            message = t('dashboard.your design was successfully deleted', { ns: 'dashboard' })
            break
    }

    return <ControlledToast text={message} onDismiss={onDismiss} />
}

export default DeletedToast
