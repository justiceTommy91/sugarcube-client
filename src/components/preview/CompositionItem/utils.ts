import { getProductTrackingInfo } from 'models/tracking/utils'
import { TrackingInfo } from 'models/compositions/actions'
import type { ExtendedRenderItem } from './types'

export const CORNER_PAD = { top: 0.06, bottom: 0.05 }

export const padCornersBottom = (corners: number[][]) => [
    [corners[0][0], corners[0][1] - CORNER_PAD.top],
    [corners[1][0], corners[1][1] - CORNER_PAD.top],
    [corners[2][0], corners[2][1] + CORNER_PAD.bottom],
    [corners[3][0], corners[3][1] + CORNER_PAD.bottom],
]

// Helper to create tracking info with additional properties
export const createTrackingInfo = (renderItem: ExtendedRenderItem, extras: Record<string, unknown> = {}): TrackingInfo => ({
    ...getProductTrackingInfo(renderItem),
    ...extras,
})
