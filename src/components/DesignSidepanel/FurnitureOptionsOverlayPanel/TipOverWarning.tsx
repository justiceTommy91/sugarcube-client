import React from 'react'

import { useTranslation } from 'react-i18next'
import InlineMessage from '@ingka/inline-message'
import informationCircle from '@ingka/ssr-icon/paths/information-circle'
import warningTriangle from '@ingka/ssr-icon/paths/warning-triangle'
import { useAppSelector } from 'hooks'
import * as compositionSelectors from 'models/compositions/selectors'
import { RenderItemComplete } from 'models/compositions'

require('./TipOverWarning.scss')

export const TipOverWarning: React.FC = () => {
    const selectedRenderItem = useAppSelector(compositionSelectors.getSelectedRenderItem) as RenderItemComplete | null
    const { t } = useTranslation()

    if (!selectedRenderItem?.requiresWallContact) {
        return null
    }

    const isTouchingWall = selectedRenderItem.collisionState?.some((collision) => collision.includes('wall')) ?? false
    const variant = isTouchingWall ? `informative` : `cautionary`
    const ssrIcon = isTouchingWall ? informationCircle : warningTriangle

    return (
        <InlineMessage
            className="TipOverWarning"
            variant={variant}
            ssrIcon={ssrIcon}
            body={t('design.furniture must be secured to wall')}
            subtle
        />
    )
}
