import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import Tooltip from 'components/Tooltip'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import heart from '@ingka/ssr-icon/paths/heart'
import heartFilled from '@ingka/ssr-icon/paths/heart-filled'
import './FavoriteButton.scss'

type FavoriteButtonProps = {
    onClick: () => void
    selected: boolean
    productLabel?: string
}

const FavoriteButton = ({ onClick, selected, productLabel }: FavoriteButtonProps) => {
    const { t } = useTranslation()
    const { isMobile } = useSugarcubeContext()
    const tip = selected ? t('tooltip.remove favorite') : t('tooltip.add favorite')
    const tooltipId = React.useId()
    const ariaLabel = productLabel ? `${t('aria.favorite')} - ${productLabel}` : t('aria.favorite')
    return (
        <Tooltip
            place="leading"
            describedById={tooltipId}
            title={tip}
            boundaryContainerID="DesignSidepanelOverlayPanel"
            hide={isMobile}
        >
            <Button
                className="FavoriteButton"
                onClick={onClick}
                onMouseMove={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                aria-label={ariaLabel}
                // eslint-disable-next-line i18next/no-literal-string
                aria-pressed={selected ? 'true' : 'false'}
                ssrIcon={selected ? heartFilled : heart}
                type="tertiary"
                iconOnly
                size="small"
            />
        </Tooltip>
    )
}

export default FavoriteButton
