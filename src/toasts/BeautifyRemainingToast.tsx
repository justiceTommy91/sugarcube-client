import React from 'react'
import { useTranslation } from 'react-i18next'
import ControlledToast from './ControlledToast'

require('./BeautifyRemainingToast.scss')

type BeautifyRemainingToastProps = {
    count: number
    onDismiss: () => void
}

const BeautifyRemainingToast: React.FunctionComponent<BeautifyRemainingToastProps> = ({ count, onDismiss }) => {
    const { t } = useTranslation()
    const message = t('toasts.beautify remaining today', { count })

    return <ControlledToast className="BeautifyRemainingToast" text={message} onDismiss={onDismiss} />
}

export default BeautifyRemainingToast