import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppSelector } from 'hooks'
import { getPAXImportLoading } from 'models/paxDesigns/selectors'
import { PAX_IMPORT_SLOW_THRESHOLD_MS } from 'models/paxDesigns/sagas'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'

import './PAXImportLoadingOverlay.scss'

export const PAXImportLoadingOverlay = () => {
    const { t } = useTranslation()
    const isLoading = useAppSelector(getPAXImportLoading)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (!isLoading) {
            setIsVisible(false)
            return undefined
        }
        const timer = setTimeout(() => setIsVisible(true), PAX_IMPORT_SLOW_THRESHOLD_MS)
        return () => clearTimeout(timer)
    }, [isLoading])

    if (!isVisible) return null

    return (
        <div className="PAXImportLoadingOverlay" aria-live="polite">
            <div className="PAXImportLoadingOverlay__card">
                <BouncingBallLoader />
                <p className="PAXImportLoadingOverlay__title">
                    {t('configurableProducts.pax.importLoading.title')}
                </p>
                <p className="PAXImportLoadingOverlay__subtitle">
                    {t('configurableProducts.pax.importLoading.slow')}
                </p>
            </div>
        </div>
    )
}
