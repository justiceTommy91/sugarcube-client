/* eslint-disable i18next/no-literal-string */
import { GeomViewer } from '@gatsby/Renderer/geomviewer/geom_init'
import type { PlacementFromStrokesResult } from '@gatsby/Renderer/geomviewer/geom_types'

export type DragAxis = {
    dirX: number
    dirY: number
    metersPerPixel: number
}

/**
 * Screen-space direction + meters/pixel for a UV edge. Default `anchor='min'`
 * keeps the raw edge direction; `'max'` flips it so dragging "outward" from
 * the anchor reads as a positive value.
 */
export function computeDragAxis(
    from: readonly [number, number],
    to: readonly [number, number],
    ctnRect: DOMRect,
    meterSpan: number,
    anchor: 'min' | 'max' = 'min',
): DragAxis {
    const rawX = (to[0] - from[0]) * ctnRect.width
    const rawY = (to[1] - from[1]) * ctnRect.height
    const pixDist = Math.sqrt(rawX * rawX + rawY * rawY)
    const metersPerPixel = pixDist > 0 ? meterSpan / pixDist : 0.001
    const sign = anchor === 'max' ? -1 : 1
    let dirX = sign * rawX
    let dirY = sign * rawY
    const len = Math.sqrt(dirX * dirX + dirY * dirY)
    if (len > 0) { dirX /= len; dirY /= len }
    return { dirX, dirY, metersPerPixel }
}

/** Axis-aligned bounding box over a list of 2D points. */
export function cornersAABB(
    corners: readonly (readonly [number, number])[],
): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity; let maxX = -Infinity
    let minY = Infinity; let maxY = -Infinity
    corners.forEach((c) => {
        if (c[0] < minX) minX = c[0]
        if (c[0] > maxX) maxX = c[0]
        if (c[1] < minY) minY = c[1]
        if (c[1] > maxY) maxY = c[1]
    })
    return { minX, minY, maxX, maxY }
}

/** True when every corner is strictly outside the unit rect [0,1] x [0,1]. */
export function allCornersOutsideUnitRect(
    corners: readonly (readonly [number, number])[],
): boolean {
    return corners.every(c => c[0] < 0 || c[0] > 1 || c[1] < 0 || c[1] > 1)
}

/** True when any corner is outside the unit rect by more than the given margins. */
export function anyCornerOutsideMargin(
    corners: readonly (readonly [number, number])[],
    mx: number, my: number,
): boolean {
    return corners.some(c => c[0] < mx || c[0] > 1 - mx || c[1] < my || c[1] > 1 - my)
}

/** Convex hull via Andrew's monotone chain (returns CCW polygon). */
export function convexHull<P extends readonly [number, number]>(points: readonly P[]): P[] {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    if (sorted.length <= 2) return sorted
    const cross = (o: P, a: P, b: P) =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    const lower: P[] = []
    sorted.forEach((p) => {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop()
        }
        lower.push(p)
    })
    const upper: P[] = []
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
        const p = sorted[i]
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop()
        }
        upper.push(p)
    }
    lower.pop()
    upper.pop()
    return [...lower, ...upper]
}

/**
 * Call queryAdjustedPlacement with symmetric (centered) expansion for one
 * dimension. Shifts the prior's UV anchor to the center so both sides grow
 * equally, then redistributes surplus to the unclamped side when one side
 * hits a boundary.
 */
export function queryCenteredAdjustment(
    prior: PlacementFromStrokesResult,
    newDims: { width: number; height: number; depth: number },
    centeredDim: 'width' | 'height',
    forceFloorPlacement: boolean,
): PlacementFromStrokesResult | null {
    const uv = prior.uvBounds
    if (!uv) return null

    const isW = centeredDim === 'width'
    const minK = isW ? 'uMin' as const : 'vMin' as const
    const maxK = isW ? 'uMax' as const : 'vMax' as const
    const center = (uv[minK] + uv[maxK]) / 2
    const halfNew = newDims[centeredDim] / 2

    // Shift the anchor so that 'min' (default) produces centered bounds.
    const shiftedPrior = { ...prior, uvBounds: { ...uv, [minK]: center - halfNew } }
    const r1 = GeomViewer.bindings?.queryAdjustedPlacement(shiftedPrior, newDims, { forceFloorPlacement })
    if (!r1?.ok || !r1.retValues) return null

    const adj = r1.retValues
    if (adj.dimensions[centeredDim] >= newDims[centeredDim] - 0.001 || !adj.uvBounds) return adj

    // One side was clamped. Redistribute surplus to the other side.
    const expectedMin = center - halfNew
    const actualMin = adj.uvBounds[minK]
    const minClamped = actualMin > expectedMin + 0.001
    const anchorOpt = isW ? 'widthAnchor' : 'heightAnchor'

    const r2 = GeomViewer.bindings?.queryAdjustedPlacement(
        adj, newDims,
        { forceFloorPlacement, [anchorOpt]: minClamped ? 'min' : 'max' },
    )
    return (r2?.ok && r2.retValues) ? r2.retValues : adj
}
