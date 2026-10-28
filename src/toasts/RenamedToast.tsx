import React from 'react'
import { useTranslation } from 'react-i18next'
import ControlledToast from './ControlledToast'

require('./RenamedToast.scss')

type RenamedToastProps = {
    onDismiss: () => void
    failed?: boolean
}

const RenamedToast: React.FunctionComponent<RenamedToastProps> = ({ onDismiss, failed = false }) => {
    const { t } = useTranslation()
    const message = failed
        ? t('dashboard.your design was not renamed', { ns: 'dashboard' })
        : t('dashboard.your design has been renamed', { ns: 'dashboard' })
    return <ControlledToast className="RenamedToast" text={message} onDismiss={onDismiss} />
}

export default RenamedToast
