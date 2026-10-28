import { useCallback, useRef, useState } from 'react'
import { GeomViewer } from '@gatsby/Renderer/geomviewer/geom_init'
import type { PlacementFromStrokesResult } from '@gatsby/Renderer/geomviewer/geom_types'
import type { BoxCorners8 } from '../types'
import { cornersAABB } from '../resizeMath'
import { useRafPointerDrag } from './useRafPointerDrag'

/** Screen-space pixel displacement per meter along a world axis. */
type AxisPxPerMeter = { x: number; y: number }

function axisPxPerMeter(
    from: readonly [number, number],
    to: readonly [number, number],
    ctnRect: DOMRect,
    meterSpan: number,
): AxisPxPerMeter {
    if (meterSpan <= 0) return { x: 0, y: 0 }
    return {
        x: (to[0] - from[0]) * ctnRect.width / meterSpan,
        y: (to[1] - from[1]) * ctnRect.height / meterSpan,
    }
}

export type BoxMoveState = {
    isMoving: boolean
    onMovePointerDown: (e: React.PointerEvent) => void
}

/** Hit-test margin (normalized) used when deciding whether a pointer is on the box. */
const BOX_HIT_MARGIN = 0.03
/** Min world-axis delta (m) below which a frame is ignored. */
const MIN_FRAME_DELTA_M = 0.0001
/** Singular-matrix guard for UV basis decomposition. */
const DET_EPSILON = 1e-9
/** Dimension-preservation tolerance (m) when accepting a shifted placement. */
const DIM_PRESERVE_EPSILON_M = 0.001

function isInsideBoxAABB(nx: number, ny: number, corners: BoxCorners8): boolean {
    const { minX, maxX, minY, maxY } = cornersAABB(corners)
    return nx >= minX - BOX_HIT_MARGIN && nx <= maxX + BOX_HIT_MARGIN
        && ny >= minY - BOX_HIT_MARGIN && ny <= maxY + BOX_HIT_MARGIN
}

export function useBoxMove(
    containerRef: React.RefObject<HTMLDivElement | null>,
    currentResult: PlacementFromStrokesResult | null,
    forceFloorPlacement: boolean,
    boxCorners: BoxCorners8 | null,
    onAdjusted: (result: PlacementFromStrokesResult) => void,
    onDragEnd?: () => void,
): BoxMoveState {
    const [isMoving, setIsMoving] = useState(false)

    const onAdjustedRef = useRef(onAdjusted)
    onAdjustedRef.current = onAdjusted
    const onDragEndRef = useRef(onDragEnd)
    onDragEndRef.current = onDragEnd
    const currentResultRef = useRef(currentResult)
    currentResultRef.current = currentResult

    // Last accepted result during drag. Incremental deltas build on this.
    const lastAcceptedRef = useRef<PlacementFromStrokesResult | null>(null)

    const dragRef = useRef<{
        uAxis: AxisPxPerMeter
        vAxis: AxisPxPerMeter
        allowV: boolean
        prevClientX: number
        prevClientY: number
        /** Snapshot of the box at drag start, restored on drop if off-screen. */
        startResult: PlacementFromStrokesResult
    } | null>(null)

    const onMovePointerDown = useCallback(
        (e: React.PointerEvent) => {
            // Skip interactive children. Handles and toolbar opt out via
            // data-fmf-blocks-move. Standard buttons are excluded by tag.
            const target = e.target as HTMLElement
            if (target.closest('[data-fmf-blocks-move]') || target.closest('button')) return

            const base = currentResultRef.current
            if (!base?.uvBounds || !boxCorners) return

            const container = containerRef.current
            if (!container) return
            const rect = container.getBoundingClientRect()

            // Hit-test: is pointer inside the box?
            const nx = (e.clientX - rect.left) / rect.width
            const ny = (e.clientY - rect.top) / rect.height
            if (!isInsideBoxAABB(nx, ny, boxCorners)) return

            e.stopPropagation()
            e.preventDefault()

            const box = boxCorners
            const isWall = base.surfaceClass === 'wall'

            // U axis: average of back & front bottom edges.
            const uFrom: [number, number] = [(box[0][0] + box[4][0]) / 2, (box[0][1] + box[4][1]) / 2]
            const uTo: [number, number] = [(box[1][0] + box[5][0]) / 2, (box[1][1] + box[5][1]) / 2]
            const uAxis = axisPxPerMeter(uFrom, uTo, rect, base.dimensions.width)

            // V axis: average of back & front left edges.
            const vFrom: [number, number] = [(box[0][0] + box[1][0]) / 2, (box[0][1] + box[1][1]) / 2]
            const vTo: [number, number] = [(box[3][0] + box[2][0]) / 2, (box[3][1] + box[2][1]) / 2]
            const vAxis = axisPxPerMeter(vFrom, vTo, rect, base.dimensions.height)

            lastAcceptedRef.current = base
            dragRef.current = {
                uAxis,
                vAxis,
                allowV: !isWall,
                prevClientX: e.clientX,
                prevClientY: e.clientY,
                startResult: base,
            }

            setIsMoving(true)
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        },
        [containerRef, boxCorners],
    )

    useRafPointerDrag(
        () => dragRef.current !== null,
        (ev) => {
            const d = dragRef.current
            if (!d) return

            const base = lastAcceptedRef.current
            if (!base?.uvBounds) return

            // Per-frame delta (small, can't jump past a wall).
            const frameDx = ev.clientX - d.prevClientX
            const frameDy = ev.clientY - d.prevClientY
            d.prevClientX = ev.clientX
            d.prevClientY = ev.clientY

            // Decompose the screen-space mouse delta into the (U, V) world
            // basis. Under perspective, U and V aren't orthogonal in screen
            // space, so we must solve the 2x2 system a·U + b·V = (dx, dy)
            // rather than project independently onto each axis.
            let uDeltaM = 0
            let vDeltaM = 0
            if (d.allowV) {
                const { x: ux, y: uy } = d.uAxis
                const { x: vx, y: vy } = d.vAxis
                const det = ux * vy - uy * vx
                if (Math.abs(det) < DET_EPSILON) return
                uDeltaM = (vy * frameDx - vx * frameDy) / det
                vDeltaM = (-uy * frameDx + ux * frameDy) / det
            } else {
                // Wall: V is pinned, so project the mouse onto the U axis only.
                const { x: ux, y: uy } = d.uAxis
                const lenSq = ux * ux + uy * uy
                if (lenSq < DET_EPSILON) return
                uDeltaM = (frameDx * ux + frameDy * uy) / lenSq
            }

            if (Math.abs(uDeltaM) < MIN_FRAME_DELTA_M && Math.abs(vDeltaM) < MIN_FRAME_DELTA_M) return

            const uv = base.uvBounds
            const dims = base.dimensions

            // Try a UV shift; accept only if dimensions are fully preserved.
            const tryShift = (du: number, dv: number): PlacementFromStrokesResult | null => {
                const shifted = {
                    uMin: uv.uMin + du, uMax: uv.uMax + du,
                    vMin: uv.vMin + dv, vMax: uv.vMax + dv,
                }
                const r = GeomViewer.bindings?.queryAdjustedPlacement(
                    { ...base, uvBounds: shifted }, dims, { forceFloorPlacement },
                )
                if (!r?.ok || !r.retValues) return null
                const a = r.retValues
                const ok = Math.abs(a.dimensions.width - dims.width) < DIM_PRESERVE_EPSILON_M
                    && Math.abs(a.dimensions.height - dims.height) < DIM_PRESERVE_EPSILON_M
                return ok ? a : null
            }

            // Try full move. If blocked, try each axis for wall-sliding.
            let result = tryShift(uDeltaM, vDeltaM)
            if (!result && d.allowV) {
                result = tryShift(uDeltaM, 0) || tryShift(0, vDeltaM)
            }

            if (result) {
                lastAcceptedRef.current = result
                onAdjustedRef.current(result)
            }
        },
        () => {
            const drag = dragRef.current
            if (!drag) return

            // If the box was dragged completely outside the viewport (entire
            // AABB clears at least one edge), snap back to where the drag
            // began.
            const dropped = lastAcceptedRef.current
            if (dropped?.boxCorners) {
                const { minX, maxX, minY, maxY } = cornersAABB(dropped.boxCorners)
                if (maxX < 0 || minX > 1 || maxY < 0 || minY > 1) {
                    onAdjustedRef.current(drag.startResult)
                }
            }

            dragRef.current = null
            lastAcceptedRef.current = null
            setIsMoving(false)
            onDragEndRef.current?.()
        },
    )

    return { isMoving, onMovePointerDown }
}
