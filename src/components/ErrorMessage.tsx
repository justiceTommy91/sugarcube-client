import React from 'react'
import { useTranslation } from 'react-i18next'

import './ErrorMessage.scss'

interface Props {
    message?: string | null
}

const ErrorMessage = ({ message = null }: Props) => {
    const { t } = useTranslation('common')
    return (
        <div className="ErrorMessage">
            <div className="errorContainer">
                <div className="errorHeader" data-testid="error-header">
                    {t('generalError.header')}
                </div>
                <div className="errorSubheader">{message ?? t('generalError.subheader')}</div>
                <button
                    className="errorCta"
                    onClick={() => {
                        window.location.reload()
                    }}
                >
                    {t('generalError.cta')}
                </button>
            </div>
        </div>
    )
}

export default ErrorMessage
