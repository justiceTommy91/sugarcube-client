import React from 'react'
import { useTranslation } from 'react-i18next'
import ControlledToast from './ControlledToast'

type PAXImportFailedToastProps = {
    onDismiss: () => void
}

const PAXImportFailedToast: React.FunctionComponent<PAXImportFailedToastProps> = ({ onDismiss }) => {
    const { t } = useTranslation()
    return <ControlledToast text={t('toasts.pax import failed')} onDismiss={onDismiss} />
}

export default PAXImportFailedToast
