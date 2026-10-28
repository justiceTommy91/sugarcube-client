import React from 'react'
import { useTranslation } from 'react-i18next'
import ControlledToast from './ControlledToast'

export type HomeProjectLinkFailedToastProps = {
    onDismiss: () => void
}

const HomeProjectLinkFailedToast: React.FunctionComponent<HomeProjectLinkFailedToastProps> = ({ onDismiss }) => {
    const { t } = useTranslation()
    return <ControlledToast text={t('design.project link failed')} onDismiss={onDismiss} />
}

export default HomeProjectLinkFailedToast
