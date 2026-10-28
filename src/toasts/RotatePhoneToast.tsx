import React from 'react'
import { useTranslation } from 'react-i18next'
import ControlledToast from './ControlledToast'

export type RotatePhoneToastProps = {
    onDismiss: () => void
}

const RotatePhoneToast: React.FunctionComponent<RotatePhoneToastProps> = ({ onDismiss }) => {
    const { t } = useTranslation()
    const message = t('toasts.rotate phone')
    return <ControlledToast text={message} onDismiss={onDismiss} />
}

export default RotatePhoneToast
