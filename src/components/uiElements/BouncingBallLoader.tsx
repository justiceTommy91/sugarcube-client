import React from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import './BouncingBallLoader.scss'

interface BouncingBallLoaderProps {
    headerText?: string
    subheaderText?: string
    className?: string
}

const BouncingBallLoader = ({ headerText = '', subheaderText = '', className }: BouncingBallLoaderProps) => {
    const { t } = useTranslation()
    const hasText = headerText || subheaderText
    const ariaLabel = headerText || subheaderText || t('common.loading')

    return (
        <div 
            className={classNames('BouncingBallLoader', className)}
            data-testid="ball-loader"
            role="status"
            aria-label={ariaLabel}
            aria-busy="true"
        >
            {hasText && (
                <div className="text">
                    {headerText && <div className="headerText">{headerText}</div>}
                    {subheaderText && <div className="subheaderText">{subheaderText}</div>}
                </div>
            )}

            <div className="ball" aria-hidden="true" />
        </div>
    )
}

export default BouncingBallLoader
