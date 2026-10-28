import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { getIkeaHomeUrl } from 'models/location/selectors'
import { clearHomeProjectId } from 'models/homeProjects/slice'
import { HOME_PROJECT_ID_STORAGE_KEY } from 'models/sessionStorage/constants'
import ControlledToast from './ControlledToast'

require('./SaveCompositionToast.scss')

export type SaveCompositionProps = {
    onDismiss: () => void
    isCopy: boolean
    failed: boolean
    homeProjectId?: string
}

const SaveCompositionToast: React.FunctionComponent<SaveCompositionProps> = ({
    onDismiss,
    isCopy,
    failed,
    homeProjectId,
}) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()

    const message = failed
        ? t('design.your design could not be saved')
        : t(isCopy ? 'design.a copy of your design has been created' : 'design.your design has been saved')

    const canGoToProject = Boolean(homeProjectId) && !failed
    const projectUrl = homeProjectId ? `${getIkeaHomeUrl()}home-projects/${homeProjectId}` : ''

    const onGoToProject = () => {
        if (!homeProjectId) return
        try {
            window.sessionStorage?.removeItem(HOME_PROJECT_ID_STORAGE_KEY)
        } catch {
            // ignore
        }
        dispatch(clearHomeProjectId())
        window.open(projectUrl, '_blank', 'noopener,noreferrer')
    }

    return (
        <ControlledToast
            className="SaveCompositionToast"
            text={message}
            onDismiss={onDismiss}
            actionButtonText={canGoToProject ? t('design.go to project') : undefined}
            ariaLabel={canGoToProject ? t('design.go to project') : undefined}
            actionClick={canGoToProject ? onGoToProject : undefined}
        />
    )
}

export default SaveCompositionToast
