import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { getctxWasLost } from 'models/renderer/selectors'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'

require('./PreviewLoading.scss')

export const PreviewLoading: React.FC = () => {
    const { t } = useTranslation('translation')
    const ctxWasLost = useSelector(getctxWasLost)

    return (
        <div className="PreviewLoading">
            <div className="loadingContentContainer">
                {ctxWasLost && <h4>{t('design.refreshing your room')}</h4>}
                {ctxWasLost ? <p>{t('design.hang tight')}</p> : <p>{t('design.preparing your room')}</p>}
                <div className="ballContainer">
                    <BouncingBallLoader />
                </div>
            </div>
        </div>
    )
}
