import React from 'react'
import SSRIcon from '@ingka/ssr-icon'
import handMove from '@ingka/ssr-icon/paths/hand-move'
import handTouch from '@ingka/ssr-icon/paths/hand-touch'
import Tooltip from 'components/Tooltip'
import { withPrefix } from 'gatsby'
import './styles.scss'

export type TooltipAnimation = 'swipe-horizontal' | 'tap' | 'draw'

const iconByAnimation = {
    'swipe-horizontal': handMove,
    tap: handTouch,
} as const

type ViewerTooltipProps = {
    visible: boolean
    text: string
    animation: TooltipAnimation
}

const ViewerTooltip = ({ visible, text, animation }: ViewerTooltipProps) => {
    if (!visible) return null

    return (
        <div className={`ViewerTooltip ViewerTooltip--${animation}`}>
            <Tooltip describedById={`viewer-tooltip-${animation}`} title={text} place="bottom">
                {animation === 'draw' ? (
                    <img className="ViewerTooltip__icon" src={withPrefix('/images/graphics/findMyFit/handMove.svg')} alt="" aria-hidden="true" />
                ) : (
                    <SSRIcon className="ViewerTooltip__icon" paths={iconByAnimation[animation]} />
                )}
            </Tooltip>
        </div>
    )
}

export default ViewerTooltip
