import React from 'react'
import { useTranslation } from 'react-i18next'

import './ErrorMessage.scss'

interface ErrorMessageProps {
    message?: string | null
}

const ErrorMessage = ({ message = null }: ErrorMessageProps) => {
    const { t } = useTranslation('common')
    return (
        <div className="ErrorMessage">
            <div className="ErrorMessage__container">
                <div className="ErrorMessage__header" data-testid="error-header">
                    {t('generalError.header')}
                </div>
                <div className="ErrorMessage__subheader">{message ?? t('generalError.subheader')}</div>
                <button
                    className="ErrorMessage__cta"
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
