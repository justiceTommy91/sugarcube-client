import React from 'react'
import SkapaTooltip from '@ingka/tooltip'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

import './Tooltip.scss'

type Position = 'top' | 'trailing' | 'bottom' | 'leading'

type TooltipProps = {
    place?: Position
    describedById: string
    title?: string
    hide?: boolean
    boundaryContainerID?: string
    children: Exclude<React.ReactNode, undefined>
}

const Tooltip = ({ place = 'bottom', describedById, title, hide, boundaryContainerID, children }: TooltipProps): React.ReactElement => {
    const { isKiosk } = useSugarcubeContext()

    if (isKiosk || hide) {
        return React.Children.count(children) === 1 ? (children as React.ReactElement) : <span>{children}</span>
    }
    return (
        <SkapaTooltip
            className="Tooltip"
            position={place}
            describedById={describedById}
            tooltipText={title || ''}
            boundaryContainerID={boundaryContainerID}
            interactiveCustomTrigger
        >
            {children}
        </SkapaTooltip>
    )
}
export default Tooltip
