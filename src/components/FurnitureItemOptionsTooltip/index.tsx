import React, { useEffect } from 'react'

import { useTranslation } from 'react-i18next'
import { useAppDispatch } from 'hooks'
import { getTooltipHoverCount } from 'models/sessionStorage/selectors'
import { incrementTooltipHoverCount } from 'models/sessionStorage/actions'

const MAX_TOOLTIP_HOVERS = 3

export const FurnitureItemOptionsTooltip = () => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const hoverCount = getTooltipHoverCount()

    useEffect(() => {
        if (hoverCount < MAX_TOOLTIP_HOVERS) {
            dispatch(incrementTooltipHoverCount())
        }
    }, [])

    if (hoverCount >= MAX_TOOLTIP_HOVERS) {
        return null
    }

    return <div className="tooltip">{t('tooltip.click to access more options')}</div>
}
