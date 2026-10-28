/* eslint-disable i18next/no-literal-string */
import { useCallback, useMemo, useRef, useState } from 'react'
import { GeomViewer } from '@gatsby/Renderer/geomviewer/geom_init'
import type { Placement, PlacementFromStrokesResult } from '@gatsby/Renderer/geomviewer/geom_types'
import type { NormalizedPoint, BoxCorners8, Dimension } from '../types'
import { clamp } from '../carouselMath'
import { MIN_DIMENSION_M, MAX_DIMENSION_M, HANDLE_EDGE_MARGIN_PX } from '../constants'
import { computeDragAxis, type DragAxis } from '../resizeMath'
import { useRafPointerDrag } from './useRafPointerDrag'

export type FaceKey = 'left' | 'right' | 'top' | 'bottom' | 'front' | 'back'
export type HandleId = 'corner-width' | 'corner-depth' | 'top' | `face-${FaceKey}`
type Anchor = 'min' | 'max'
type Edge = { from: NormalizedPoint; to: NormalizedPoint }
type DimAxis = { dimension: Dimension; anchor: Anchor; edge: Edge }

export type Dimensions = Record<Dimension, number>

export type DragEndInfo = {
    startDimensions: Dimensions
    endDimensions: Dimensions
    startPlacement: Placement | undefined
    endPlacement: Placement | undefined
}

export type HandleConfig = {
    id: HandleId
    type: 'top' | 'corner' | 'face'
    x: number
    y: number
    backfacing: boolean
    interactive: boolean
    dimension: Dimension
    anchor: Anchor
    edge: Edge
    /** For multi-axis corner handles: all dimensions this handle controls. */
    allDimensions?: DimAxis[]
}

const FACE_ID_PREFIX = 'face-'

function handleIdToFaceKey(id: HandleId): FaceKey | null {
    return id.startsWith(FACE_ID_PREFIX) ? (id.slice(FACE_ID_PREFIX.length) as FaceKey) : null
}

export type ResizeHandlesState = {
    /** Corner + top handles for default mode (3 handles around junction). */
    cornerHandleConfigs: HandleConfig[]
    /** Face handles for targeted mode. */
    faceHandleConfigs: HandleConfig[]
    /** Junction corner position (connector line convergence point). */
    junctionPosition: NormalizedPoint | null
    activeHandle: HandleId | null
    activeDimension: Dimension | null
    /** Which face quad indices to tint yellow during active drag. */
    activeFaceIndices: [number, number, number, number] | null
    onPointerDown: (config: HandleConfig, e: React.PointerEvent) => void
}

// Velocity-based axis switching for multi-axis corner handles.
const VEL_SMOOTH = 0.30       // EMA smoothing factor (lower = more responsive)
const LOCK_THRESHOLD_PX = 0.5 // min total velocity before committing an axis lock
const SWITCH_RATIO = 1.3      // new axis must be this many times larger to override

const FACE_INDICES: Record<FaceKey, [number, number, number, number]> = {
    left:   [0, 3, 7, 4],
    right:  [1, 2, 6, 5],
    top:    [3, 2, 6, 7],
    bottom: [0, 1, 5, 4],
    front:  [4, 5, 6, 7],
    back:   [0, 1, 2, 3],
}

// Face to tint when dragging a dimension with the given API anchor.
const TINT_FACE: Record<Dimension, Record<Anchor, FaceKey>> = {
    width:  { min: 'right', max: 'left' },
    height: { min: 'top',   max: 'bottom' },
    depth:  { min: 'front', max: 'back' },
}

// For each potential junction corner, its 3 adjacent corner indices and roles.
// boxCorners: back BL(0) BR(1) TR(2) TL(3) + front BL(4) BR(5) TR(6) TL(7)
// Wall bottom corners: 0,1,4,5.  Floor corners (back face on floor): 0,1,2,3.
const ADJACENCY: Record<number, { width: number; depth: number; top: number }> = {
    0: { width: 1, depth: 4, top: 3 },
    1: { width: 0, depth: 5, top: 2 },
    2: { width: 3, depth: 6, top: 1 },
    3: { width: 2, depth: 7, top: 0 },
    4: { width: 5, depth: 0, top: 7 },
    5: { width: 4, depth: 1, top: 6 },
}

// Whether a corner index is on the right side (uMax) of the box.
// Back: BL(0) BR(1) TR(2) TL(3), Front: BL(4) BR(5) TR(6) TL(7)
const IS_RIGHT_SIDE = new Set([1, 2, 5, 6])

// Whether a corner index is on the forward/top row (vMax) of its face.
const IS_VMAX_ROW = new Set([2, 3, 6, 7])

function faceCenter(
    a: NormalizedPoint, b: NormalizedPoint,
    c: NormalizedPoint, d: NormalizedPoint,
): { x: number; y: number } {
    return {
        x: (a[0] + b[0] + c[0] + d[0]) / 4,
        y: (a[1] + b[1] + c[1] + d[1]) / 4,
    }
}

type DimDragConfig = {
    dimension: Dimension
    apiAnchor: Anchor
    axis: DragAxis
}

export function useResizeHandles(
    containerRef: React.RefObject<HTMLDivElement | null>,
    currentResult: PlacementFromStrokesResult | null,
    forceFloorPlacement: boolean,
    boxCorners: BoxCorners8 | null,
    onAdjusted: (result: PlacementFromStrokesResult) => void,
    onDragEnd?: (info: DragEndInfo) => void,
): ResizeHandlesState {
    const [activeHandle, setActiveHandle] = useState<HandleId | null>(null)
    const [activeDimension, setActiveDimension] = useState<Dimension | null>(null)
    const [activeFaceIndices, setActiveFaceIndices] = useState<[number, number, number, number] | null>(null)

    const onDragEndRef = useRef(onDragEnd)
    onDragEndRef.current = onDragEnd

    // Snapshot of boxCorners captured when no drag is active. Keeping a
    // frozen snapshot means backfacing won't flicker as the box rotates mid-drag.
    const [frozenCorners, setFrozenCorners] = useState<BoxCorners8 | null>(null)
    if (!activeHandle && boxCorners && boxCorners !== frozenCorners) {
        setFrozenCorners(boxCorners)
    }

    const dragRef = useRef<{
        handleId: HandleId
        dims: DimDragConfig[]
        activeDimIdx: number   // -1 = unlocked (multi-axis), 0+ = locked dim index
        startX: number
        startY: number
        startValue: number
        lastNewValue: number
        baseResult: PlacementFromStrokesResult
        startDimensions: Dimensions
        lastDimensions: Dimensions
        startPlacement: Placement | undefined
        lastPlacement: Placement | undefined
        // Velocity tracking for multi-axis handles
        smoothedVel: number[]
        prevClientX: number
        prevClientY: number
    } | null>(null)

    // Tracks the last successfully adjusted result for re-anchoring on axis switch.
    const lastAcceptedRef = useRef<PlacementFromStrokesResult | null>(null)

    const onAdjustedRef = useRef(onAdjusted)
    onAdjustedRef.current = onAdjusted
    const currentResultRef = useRef(currentResult)
    currentResultRef.current = currentResult

    const wallBottomPinned = currentResult?.surfaceClass === 'wall' && forceFloorPlacement

    const restBackfacing = useMemo<Partial<Record<HandleId, boolean>>>(() => {
        const box = frozenCorners
        if (!box) return {}
        const cx = box.reduce((s, c) => s + c[0], 0) / 8
        const cy = box.reduce((s, c) => s + c[1], 0) / 8
        const dist = (f: { x: number; y: number }) => Math.hypot(f.x - cx, f.y - cy)

        const [b0, b1, b2, b3, f0, f1, f2, f3] = box

        const fc = {
            left:   faceCenter(b0, b3, f3, f0),
            right:  faceCenter(b1, b2, f2, f1),
            top:    faceCenter(b3, b2, f2, f3),
            bottom: faceCenter(b0, b1, f1, f0),
            front:  faceCenter(f0, f1, f2, f3),
        }

        const topBackfacing = dist(fc.top) < dist(fc.bottom)
        return {
            'face-left':   dist(fc.left) < dist(fc.right),
            'face-right':  dist(fc.right) < dist(fc.left),
            'face-top':    topBackfacing,
            'face-bottom': dist(fc.bottom) < dist(fc.top),
            'face-front':  dist(fc.front) < dist({ x: cx, y: cy }),
            'top':         topBackfacing,
        }
    }, [frozenCorners])

    // Junction: corner closest to the base-quad centroid is the most
    // occluded under perspective, so it reads as "farthest from camera".
    // Wall base quad = [0,1,4,5]; floor back face = [0,1,2,3].
    const isFloor = currentResult?.surfaceClass === 'floor'
    const junctionIdx = useMemo(() => {
        if (!boxCorners) return 0
        const box = boxCorners
        const candidates = isFloor ? [0, 1, 2, 3] : [0, 1, 4, 5]
        const cx = candidates.reduce((s, i) => s + box[i][0], 0) / 4
        const cy = candidates.reduce((s, i) => s + box[i][1], 0) / 4
        let minDist = Infinity
        let best = 0
        candidates.forEach((idx) => {
            const d = Math.hypot(box[idx][0] - cx, box[idx][1] - cy)
            if (d < minDist) { minDist = d; best = idx }
        })
        return best
    }, [boxCorners, isFloor])

    const junctionPosition: NormalizedPoint | null = boxCorners ? boxCorners[junctionIdx] : null

    // Three handles at junction-adjacent corners; each controls one dimension
    // via the edge it shares with the junction.
    const cornerHandleConfigs = useMemo<HandleConfig[]>(() => {
        if (!currentResult || !boxCorners) return []

        const box = boxCorners
        const adj = ADJACENCY[junctionIdx]
        if (!adj) return []

        const isWall = currentResult.surfaceClass === 'wall'

        // Width anchor per handle: pin the opposite side so width grows
        // from the face the handle belongs to.
        const widthAnchorFor = (cornerIdx: number): Anchor =>
            IS_RIGHT_SIDE.has(cornerIdx) ? 'min' : 'max'

        const depthAnchor: Anchor = 'min'

        // Edges from junction to each adjacent corner.
        const widthEdge = { from: box[junctionIdx], to: box[adj.width] }
        const depthEdge = { from: box[junctionIdx], to: box[adj.depth] }
        const heightEdge = { from: box[junctionIdx], to: box[adj.top] }

        const depthDim = { dimension: 'depth' as const, anchor: depthAnchor, edge: depthEdge }

        // Per-handle width: anchor + edge point toward the handle's U-side.
        const widthEdgeFor = (handleCorner: number) =>
            IS_RIGHT_SIDE.has(handleCorner) === IS_RIGHT_SIDE.has(adj.width)
                ? widthEdge
                : { from: box[adj.width], to: box[junctionIdx] }

        const dimW = 'width' as const
        const widthForWidthH = {
            dimension: dimW, anchor: widthAnchorFor(adj.width),
            edge: widthEdgeFor(adj.width),
        }
        const widthForDepthH = {
            dimension: dimW, anchor: widthAnchorFor(adj.depth),
            edge: widthEdgeFor(adj.depth),
        }
        const widthForTopH = {
            dimension: dimW, anchor: widthAnchorFor(adj.top),
            edge: widthEdgeFor(adj.top),
        }

        // Per-handle height mirrors per-handle width: pin the opposite V-row
        // so height grows from the face the handle belongs to.
        const heightAnchorFor = (cornerIdx: number): Anchor =>
            IS_VMAX_ROW.has(cornerIdx) ? 'min' : 'max'

        const heightEdgeFor = (handleCorner: number) =>
            IS_VMAX_ROW.has(handleCorner) === IS_VMAX_ROW.has(adj.top)
                ? heightEdge
                : { from: box[adj.top], to: box[junctionIdx] }

        const dimH = 'height' as const
        const heightForTopH = {
            dimension: dimH, anchor: heightAnchorFor(adj.top),
            edge: heightEdgeFor(adj.top),
        }
        const heightForWidthH = {
            dimension: dimH, anchor: heightAnchorFor(adj.width),
            edge: heightEdgeFor(adj.width),
        }

        // Wall:  back(adj.width)=W,  front(adj.depth)=W+D,  top(adj.top)=H+W
        // Floor: back(adj.width)=W+H, front(adj.depth → visual top)=D, top(adj.top → visual front)=W+H
        return [
            {
                id: 'corner-width',
                type: 'corner' as const,
                x: box[adj.width][0],
                y: box[adj.width][1],
                backfacing: false,
                interactive: true,
                dimension: 'width' as const,
                anchor: widthForWidthH.anchor,
                edge: widthEdge,
                allDimensions: isWall ? [widthForWidthH] : [widthForWidthH, heightForWidthH],
            },
            {
                id: 'corner-depth',
                type: 'corner' as const,
                x: box[adj.depth][0],
                y: box[adj.depth][1],
                backfacing: false,
                interactive: true,
                dimension: 'depth' as const,
                anchor: depthAnchor,
                edge: depthEdge,
                allDimensions: [widthForDepthH, depthDim],
            },
            {
                id: 'top',
                type: 'top' as const,
                x: box[adj.top][0],
                y: box[adj.top][1],
                backfacing: restBackfacing.top ?? false,
                interactive: true,
                dimension: 'height' as const,
                anchor: heightForTopH.anchor,
                edge: heightForTopH.edge,
                allDimensions: isWall ? [heightForTopH, widthForTopH] : [widthForTopH, heightForTopH],
            },
        ]
    }, [currentResult, boxCorners, junctionIdx, restBackfacing])

    const faceHandleConfigs = useMemo<HandleConfig[]>(() => {
        if (!currentResult || !boxCorners) return []

        const [b0, b1, b2, b3, f0, f1, f2, f3] = boxCorners
        const fc = {
            left:   faceCenter(b0, b3, f3, f0),
            right:  faceCenter(b1, b2, f2, f1),
            top:    faceCenter(b3, b2, f2, f3),
            bottom: faceCenter(b0, b1, f1, f0),
            front:  faceCenter(f0, f1, f2, f3),
            back:   faceCenter(b0, b1, b2, b3),
        }

        // width/height/depth edges shared by opposing face pairs.
        const widthEdge = { from: b0, to: b1 }
        const heightEdge = { from: b0, to: b3 }
        const depthEdge = { from: b1, to: f1 }

        const makeFace = (
            id: HandleId, key: FaceKey,
            dimension: Dimension, anchor: Anchor, edge: Edge,
            overrides?: Partial<Pick<HandleConfig, 'backfacing' | 'interactive'>>,
        ): HandleConfig => ({
            id,
            type: 'face',
            x: fc[key].x,
            y: fc[key].y,
            dimension,
            anchor,
            edge,
            backfacing: overrides?.backfacing ?? restBackfacing[id] ?? false,
            interactive: overrides?.interactive ?? true,
        })

        return [
            makeFace('face-left',   'left',   'width',  'max', widthEdge),
            makeFace('face-right',  'right',  'width',  'min', widthEdge),
            makeFace('face-top',    'top',    'height', 'min', heightEdge),
            makeFace('face-bottom', 'bottom', 'height', 'max', heightEdge, {
                backfacing: wallBottomPinned ? true : (restBackfacing['face-bottom'] ?? false),
                interactive: !wallBottomPinned,
            }),
            makeFace('face-front',  'front',  'depth',  'min', depthEdge),
            // face-back is always non-interactive. The back face sits
            // against the wall/origin and exists only as a dimmed reference.
            makeFace('face-back',   'back',   'depth',  'max', depthEdge, {
                backfacing: true, interactive: false,
            }),
        ]
    }, [currentResult, boxCorners, wallBottomPinned, restBackfacing])

    const onPointerDown = useCallback(
        (config: HandleConfig, e: React.PointerEvent) => {
            e.stopPropagation()
            e.preventDefault()
            if (!config.interactive) return

            const base = currentResultRef.current
            if (!base) return

            const container = containerRef.current
            if (!container) return
            const ctnRect = container.getBoundingClientRect()

            // Build dim configs from allDimensions or single dimension fallback.
            const allDims = config.allDimensions
                || [{ dimension: config.dimension, anchor: config.anchor, edge: config.edge }]

            const dims: DimDragConfig[] = allDims.map((d) => {
                // For corner/top handles, edges point toward the handle's side,
                // so 'min' (sign=+1) means dragging outward = increase.
                // For face handles, d.anchor controls the sign per face side.
                const dragAnchor: Anchor = config.type === 'face' ? d.anchor : 'min'
                return {
                    dimension: d.dimension,
                    apiAnchor: d.anchor,
                    axis: computeDragAxis(
                        d.edge.from, d.edge.to,
                        ctnRect, base.dimensions[d.dimension],
                        dragAnchor,
                    ),
                }
            })

            const isMultiAxis = dims.length > 1

            dragRef.current = {
                handleId: config.id,
                dims,
                activeDimIdx: isMultiAxis ? -1 : 0,
                startX: e.clientX,
                startY: e.clientY,
                startValue: isMultiAxis ? 0 : base.dimensions[dims[0].dimension],
                lastNewValue: Number.NaN,
                baseResult: base,
                startDimensions: { ...base.dimensions },
                lastDimensions: { ...base.dimensions },
                startPlacement: base.placement,
                lastPlacement: base.placement,
                smoothedVel: dims.map(() => 0),
                prevClientX: e.clientX,
                prevClientY: e.clientY,
            }

            lastAcceptedRef.current = base

            setActiveHandle(config.id)
            if (isMultiAxis) {
                setActiveDimension(null)
                setActiveFaceIndices(null)
            } else {
                setActiveDimension(dims[0].dimension)
                setActiveFaceIndices(FACE_INDICES[TINT_FACE[dims[0].dimension][dims[0].apiAnchor]])
            }
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        },
        [containerRef],
    )

    useRafPointerDrag(
        () => dragRef.current !== null,
        (ev) => {
            const d = dragRef.current
            if (!d) return

            if (d.dims.length > 1) {
                const frameDx = ev.clientX - d.prevClientX
                const frameDy = ev.clientY - d.prevClientY
                d.prevClientX = ev.clientX
                d.prevClientY = ev.clientY

                // Update EMA-smoothed per-axis velocity
                for (let i = 0; i < d.dims.length; i += 1) {
                    const proj = frameDx * d.dims[i].axis.dirX + frameDy * d.dims[i].axis.dirY
                    d.smoothedVel[i] = d.smoothedVel[i] * VEL_SMOOTH + proj * (1 - VEL_SMOOTH)
                }

                const abs = d.smoothedVel.map(Math.abs)
                const total = abs.reduce((s, v) => s + v, 0)

                if (total > LOCK_THRESHOLD_PX) {
                    const prevIdx = d.activeDimIdx

                    if (d.activeDimIdx === -1) {
                        // Initial lock: pick dominant axis
                        d.activeDimIdx = abs[0] >= abs[1] ? 0 : 1
                    } else {
                        // Check for axis switch
                        const otherIdx = 1 - d.activeDimIdx
                        if (abs[otherIdx] > abs[d.activeDimIdx] * SWITCH_RATIO) {
                            d.activeDimIdx = otherIdx
                        }
                    }

                    if (d.activeDimIdx !== prevIdx) {
                        // Re-anchor to prevent jumps on axis switch
                        const latest = lastAcceptedRef.current || d.baseResult
                        const newDim = d.dims[d.activeDimIdx]
                        d.baseResult = latest
                        d.startX = ev.clientX
                        d.startY = ev.clientY
                        d.startValue = latest.dimensions[newDim.dimension]
                        d.lastNewValue = Number.NaN
                        d.smoothedVel = d.dims.map(() => 0)
                        // Update toolbar highlight & face tint
                        setActiveDimension(newDim.dimension)
                        setActiveFaceIndices(FACE_INDICES[TINT_FACE[newDim.dimension][newDim.apiAnchor]])
                    }
                }

                if (d.activeDimIdx === -1) return // Not locked yet
            }

            const activeDim = d.dims[d.activeDimIdx]
            const dx = ev.clientX - d.startX
            const dy = ev.clientY - d.startY
            const projection = dx * activeDim.axis.dirX + dy * activeDim.axis.dirY
            const newValue = clamp(
                d.startValue + projection * activeDim.axis.metersPerPixel,
                MIN_DIMENSION_M, MAX_DIMENSION_M,
            )

            // Skip backend query and fanout when the target value hasn't changed.
            if (Math.abs(newValue - d.lastNewValue) < 1e-5) return
            d.lastNewValue = newValue

            const newDims = { ...d.baseResult.dimensions }
            newDims[activeDim.dimension] = newValue

            const widthAnchor = activeDim.dimension === 'width' ? activeDim.apiAnchor : undefined
            const heightAnchor = activeDim.dimension === 'height' ? activeDim.apiAnchor : undefined

            const result = GeomViewer.bindings?.queryAdjustedPlacement(
                d.baseResult, newDims,
                { forceFloorPlacement, widthAnchor, heightAnchor },
            )
            if (result?.ok && result.retValues) {
                const adjusted = result.retValues
                const corners = adjusted.boxCorners
                let accept = true

                if (corners) {
                    const ctn = containerRef.current
                    const ctnW = ctn?.clientWidth ?? 1
                    const ctnH = ctn?.clientHeight ?? 1
                    const mx = HANDLE_EDGE_MARGIN_PX / ctnW
                    const my = HANDLE_EDGE_MARGIN_PX / ctnH

                    let checkX: number
                    let checkY: number
                    const adj = ADJACENCY[junctionIdx]
                    if (d.handleId === 'corner-width' && adj) {
                        checkX = corners[adj.width][0]; checkY = corners[adj.width][1]
                    } else if (d.handleId === 'corner-depth' && adj) {
                        checkX = corners[adj.depth][0]; checkY = corners[adj.depth][1]
                    } else if (d.handleId === 'top' && adj) {
                        checkX = corners[adj.top][0]; checkY = corners[adj.top][1]
                    } else {
                        const faceKey = handleIdToFaceKey(d.handleId)
                        const fi = faceKey ? FACE_INDICES[faceKey] : null
                        if (fi) {
                            const fc = faceCenter(corners[fi[0]], corners[fi[1]], corners[fi[2]], corners[fi[3]])
                            checkX = fc.x; checkY = fc.y
                        } else {
                            checkX = 0.5; checkY = 0.5
                        }
                    }
                    accept = checkX >= mx && checkX <= 1 - mx && checkY >= my && checkY <= 1 - my
                }

                if (accept) {
                    lastAcceptedRef.current = adjusted
                    d.lastDimensions = { ...adjusted.dimensions }
                    d.lastPlacement = adjusted.placement ?? d.lastPlacement
                    onAdjustedRef.current(adjusted)
                }
            }
        },
        () => {
            const drag = dragRef.current
            const info: DragEndInfo | null = drag
                ? {
                    startDimensions: { ...drag.startDimensions },
                    endDimensions: { ...drag.lastDimensions },
                    startPlacement: drag.startPlacement,
                    endPlacement: drag.lastPlacement,
                }
                : null
            dragRef.current = null
            lastAcceptedRef.current = null
            setActiveHandle(null)
            setActiveDimension(null)
            setActiveFaceIndices(null)
            if (info) onDragEndRef.current?.(info)
        },
    )

    return {
        cornerHandleConfigs,
        faceHandleConfigs,
        junctionPosition,
        activeHandle,
        activeDimension,
        activeFaceIndices,
        onPointerDown,
    }
}
