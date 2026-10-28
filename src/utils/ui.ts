import { clamp01 } from 'utils/math'
import { Corners } from 'models/compositions'

type BoxStyle = {
    left: string // 42%
    bottom: string
    top: string
    right: string
}

type PointXY = {
    x: number
    y: number
}

// Result is percentage strings that can be used directly for react style props
export const cornersToBoxStyle = (corners: Corners): BoxStyle => ({
    left: `${clamp01(corners[0][0]) * 100}%`,
    right: `${(1 - clamp01(corners[1][0])) * 100}%`,
    top: `${clamp01(corners[0][1]) * 100}%`,
    bottom: `${(1 - clamp01(corners[2][1])) * 100}%`,
})

// Result is percentages from 0-100
export const cornersToCenterPointXY = (corners: Corners): PointXY => ({
    x: (corners[0][0] + (corners[1][0] - corners[0][0]) / 2) * 100,
    y: (corners[0][1] + (corners[3][1] - corners[0][1]) / 2) * 100,
})
