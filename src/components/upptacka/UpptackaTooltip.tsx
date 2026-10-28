import React from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from 'hooks'
import * as rendererSelectors from 'models/renderer/selectors'
import * as upptackaSelectors from 'models/upptacka/selectors'

require('./UpptackaTooltip.scss')

export const UpptackaTooltip = () => {
    const { t } = useTranslation()
    const hasSceneBeenInteractedWith = useAppSelector(upptackaSelectors.getSceneHasBeenInteractedWith)
    const hasRendered = useAppSelector(rendererSelectors.getHasRendered)
    return (
        <div className={classNames('UpptackaTooltip', { hide: !hasRendered || hasSceneBeenInteractedWith })}>
            <span>{t('upptacka.tooltip')}</span>
            <div className="UpptackaTooltip__arrow-down" />
        </div>
    )
}
