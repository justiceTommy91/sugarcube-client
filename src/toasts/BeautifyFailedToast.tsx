import React from 'react'
import { useTranslation } from 'react-i18next'
import ControlledToast from './ControlledToast'

require('./BeautifyFailedToast.scss')

type BeautifyFailedToastProps = {
    message: string
    onDismiss: () => void
}

const BeautifyFailedToast: React.FunctionComponent<BeautifyFailedToastProps> = ({ message, onDismiss }) => {
    const { t } = useTranslation()
    const text = t(message, { defaultValue: message })
    return <ControlledToast className="BeautifyFailedToast" text={text} onDismiss={onDismiss} />
}

export default BeautifyFailedToast
