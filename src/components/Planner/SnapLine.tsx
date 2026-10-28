import React from 'react'

import type { Line2 } from 'Planner/api_types'

import './SnapLine.scss'

export type SnapLineProps = {
    line: Line2
}

export const SnapLine = ({
    line,
}: SnapLineProps) => {
    const deltaX = line.p2.x - line.p1.x
    const deltaY = line.p2.y - line.p1.y
    const length = Math.sqrt(deltaX ** 2 + deltaY ** 2)
    const angleRads = Math.atan2(deltaY, deltaX)
    const angleDeg = angleRads * (180 / Math.PI)
    const middleX = line.p1.x + deltaX * 0.5
    const middleY = line.p1.y + deltaY * 0.5
    const lineStyle = {
      left: `${middleX}px`,
      top: `${middleY}px`,
      width: `${length}px`,
      transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
    }

    return (
        <div className="SnapLine" style={lineStyle} />
    )
}