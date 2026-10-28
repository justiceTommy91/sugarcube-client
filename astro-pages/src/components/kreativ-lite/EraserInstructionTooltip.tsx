import React from 'react'
import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import handTouch from '@ingka/ssr-icon/paths/hand-touch'

interface EraserInstructionTooltipProps {
    visible: boolean
}

const EraserInstructionTooltip: React.FC<EraserInstructionTooltipProps> = ({ visible }) => {
    const { t } = useTranslation()
    if (!visible) return null

    return (
        <div className="EraserPanel__instructionTooltip">
            <SSRIcon paths={handTouch} className="EraserPanel__instructionTooltip__icon" />
            <span className="EraserPanel__instructionTooltip__content">
                {t('design.tap highlighted items to erase')}
            </span>
        </div>
    )
}

export default EraserInstructionTooltip
