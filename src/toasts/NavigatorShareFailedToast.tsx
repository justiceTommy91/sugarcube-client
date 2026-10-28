import React from 'react'
import { useTranslation } from 'react-i18next'
import ControlledToast from './ControlledToast'

export type NavigatorShareFailedToastProps = {
    onDismiss: () => void
}

const NavigatorShareFailedToast: React.FunctionComponent<NavigatorShareFailedToastProps> = ({ onDismiss }) => {
    const { t } = useTranslation()
    const message = t('toasts.navigator share failed')
    return <ControlledToast text={message} onDismiss={onDismiss} />
}

export default NavigatorShareFailedToast
