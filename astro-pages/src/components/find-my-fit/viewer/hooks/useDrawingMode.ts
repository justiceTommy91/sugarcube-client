import { useCallback, useEffect, useRef, useState } from 'react'
import { GeomViewer } from '@gatsby/Renderer/geomviewer/geom_init'
import type { Point2D, Placement, PlacementFromStrokesResult } from '@gatsby/Renderer/geomviewer/geom_types'
import { BRUSH_WIDTH } from '../DrawingOverlay'
import { HANDLE_EDGE_MARGIN_PX } from '../constants'
import { anyCornerOutsideMargin, convexHull, cornersAABB } from '../resizeMath'
import type { Stroke, DimensionLabels, Quad, BoxCorners8 } from '../types'

/**
 * If the box extends beyond the handle-safe margin, scale all dimensions
 * down uniformly so every handle stays reachable. Returns the adjusted
 * result or the input unchanged if no scaling was needed.
 */
function clampResultToHandleMargin(
    rv: PlacementFromStrokesResult,
    container: HTMLElement,
    forceFloorPlacement: boolean,
): PlacementFromStrokesResult {
    if (!rv.boxCorners) return rv
    const ctnW = container.clientWidth || 1
    const ctnH = container.clientHeight || 1
    const mx = HANDLE_EDGE_MARGIN_PX / ctnW
    const my = HANDLE_EDGE_MARGIN_PX / ctnH
    if (!anyCornerOutsideMargin(rv.boxCorners, mx, my)) return rv

    const { minX, maxX, minY, maxY } = cornersAABB(rv.boxCorners)
    const scale = Math.min(
        (1 - 2 * mx) / (maxX - minX || 1),
        (1 - 2 * my) / (maxY - minY || 1),
        1,
    )
    if (scale >= 1) return rv

    const adj = GeomViewer.bindings?.queryAdjustedPlacement(
        rv,
        {
            width: rv.dimensions.width * scale,
            height: rv.dimensions.height * scale,
            depth: rv.dimensions.depth * scale,
        },
        { forceFloorPlacement },
    )
    return (adj?.ok && adj.retValues) ? adj.retValues : rv
}

export type DrawingModeState = {
    strokes: Stroke[]
    handleStrokeAdded: (stroke: Stroke) => void
    handleClear: () => void
    polygon: Quad | null
    extrusionPolygon: Quad | null
    boxCorners: BoxCorners8 | null
    dimensionLabels: DimensionLabels | null
    forceFloorPlacement: boolean
    setForceFloorPlacement: (v: boolean) => void
    bboxPos: { topY: number; centerX: number } | null
    setBboxPos: (pos: { topY: number; centerX: number } | null) => void
    placement: Placement | null
    originalResult: PlacementFromStrokesResult | null
    applyAdjustedResult: (result: PlacementFromStrokesResult | null) => void
    /** Erase magic-eraser segments under the current box. Call after a drag ends. */
    commitBoxErase: () => void
}

/** Generate sample points filling the convex hull of the given canvas-space corners. */
function boxCoverageStrokes(corners: Point2D[]): Point2D[][] {
    const hull = convexHull(corners)
    if (hull.length < 3) return []
    const { minY, maxY } = cornersAABB(hull)
    const STEP = 0.01
    const n = hull.length
    const strokes: Point2D[][] = []
    for (let y = minY; y <= maxY; y += STEP) {
        let xMin = Infinity
        let xMax = -Infinity
        for (let i = 0; i < n; i += 1) {
            const a = hull[i]
            const b = hull[(i + 1) % n]
            if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
                const x = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
                if (x < xMin) xMin = x
                if (x > xMax) xMax = x
            }
        }
        if (xMin <= xMax) {
            const row: Point2D[] = []
            for (let x = xMin; x <= xMax; x += STEP) {
                row.push([x, y])
            }
            if (row.length > 0) strokes.push(row)
        }
    }
    return strokes
}

export type ManualEraseOverrides = { forceErased: Set<number>; forceVisible: Set<number> }

function overridesPayload(
    ref?: React.RefObject<ManualEraseOverrides>,
): { forceErased?: number[]; forceVisible?: number[] } | undefined {
    const cur = ref?.current
    if (!cur || (cur.forceErased.size === 0 && cur.forceVisible.size === 0)) return undefined
    return {
        forceErased: Array.from(cur.forceErased),
        forceVisible: Array.from(cur.forceVisible),
    }
}

export function useDrawingMode(
    containerRef: React.RefObject<HTMLDivElement | null>,
    canvasWidth: number,
    manualOverridesRef?: React.RefObject<ManualEraseOverrides>,
): DrawingModeState {
    const [strokes, setStrokes] = useState<Stroke[]>([])
    const [polygon, setPolygon] = useState<Quad | null>(null)
    const [extrusionPolygon, setExtrusionPolygon] = useState<Quad | null>(null)
    const [forceFloorPlacement, setForceFloorPlacement] = useState(true)
    const [dimensionLabels, setDimensionLabels] = useState<DimensionLabels | null>(null)
    const [bboxPos, setBboxPos] = useState<{ topY: number; centerX: number } | null>(null)
    const [placement, setPlacement] = useState<Placement | null>(null)
    const [originalResult, setOriginalResult] = useState<PlacementFromStrokesResult | null>(null)
    const [boxCorners, setBoxCorners] = useState<BoxCorners8 | null>(null)

    const handleStrokeAdded = useCallback((stroke: Stroke) => {
        setStrokes((prev) => [...prev, stroke])
    }, [])

    const handleClear = useCallback(() => {
        setStrokes([])
        setPolygon(null)
        setExtrusionPolygon(null)
        setBoxCorners(null)
        setDimensionLabels(null)
        setPlacement(null)
        setOriginalResult(null)
        // Reset magic eraser to show all when drawing is cleared, but keep
        // user's manual toggles via overrides.
        GeomViewer.bindings?.eraseSegmentsFromStrokes([], {
            overrides: overridesPayload(manualOverridesRef),
        })
    }, [manualOverridesRef])

    // Tracks the last canvas-space result (from strokes or resize) so commit
    // actions (e.g. box erase) can use the current corners.
    const activeResultRef = useRef<PlacementFromStrokesResult | null>(null)

    const applyAdjustedResult = useCallback(
        (result: PlacementFromStrokesResult | null) => {
            if (!result) return
            activeResultRef.current = result
            setPolygon(result.corners as Quad)
            setExtrusionPolygon(result.extrusionCorners as Quad)
            if (result.boxCorners) setBoxCorners(result.boxCorners as BoxCorners8)
            setDimensionLabels({ surfaceClass: result.surfaceClass, ...result.dimensions })
            if (result.placement) setPlacement(result.placement)
        },
        [],
    )

    // Erase segments under the box's current position. Deferred out of
    // applyAdjustedResult so per-frame drag updates don't run this path
    // every tick. Callers invoke it once at drag-end (pointer up).
    const commitBoxErase = useCallback(() => {
        const result = activeResultRef.current
        if (!result) return
        const allCorners = result.boxCorners ?? [...result.corners, ...result.extrusionCorners]
        GeomViewer.bindings?.eraseSegmentsFromStrokes(boxCoverageStrokes(allCorners), {
            overrides: overridesPayload(manualOverridesRef),
        })
    }, [manualOverridesRef])

    // Only recompute placement from strokes when the strokes themselves change
    // (or forceFloorPlacement toggles).
    const prevStrokesRef = useRef(strokes)
    const prevForceFloorRef = useRef(forceFloorPlacement)
    useEffect(() => {
        if (strokes.length === 0) return
        if (strokes === prevStrokesRef.current && forceFloorPlacement === prevForceFloorRef.current) return
        prevStrokesRef.current = strokes
        prevForceFloorRef.current = forceFloorPlacement

        const container = containerRef.current
        const canvas = container?.querySelector<HTMLCanvasElement>('#ViewportCanvas')
        if (!container || !canvas) return

        const cvRect = canvas.getBoundingClientRect()
        if (cvRect.width === 0) return

        const canvasStrokes: Point2D[][] = strokes.map((stroke) =>
            stroke.map(([x, y]): [number, number] => [x, y]),
        )

        const brushWidth = BRUSH_WIDTH / cvRect.width
        GeomViewer.bindings?.eraseSegmentsFromStrokes(canvasStrokes, {
            brushWidth,
            overrides: overridesPayload(manualOverridesRef),
        })
        const result = GeomViewer.bindings?.queryPlacementFromStrokes(canvasStrokes, {
            forceFloorPlacement,
            brushWidth,
        })

        if (result?.ok && result.retValues) {
            const rv = clampResultToHandleMargin(result.retValues, container, forceFloorPlacement)

            activeResultRef.current = rv
            setPolygon(rv.corners as Quad)
            setExtrusionPolygon(rv.extrusionCorners as Quad)
            if (rv.boxCorners) setBoxCorners(rv.boxCorners as BoxCorners8)
            setDimensionLabels({ surfaceClass: rv.surfaceClass, ...rv.dimensions })
            if (rv.placement) setPlacement(rv.placement)
            setOriginalResult(rv)
        } else {
            setPolygon(null)
            setExtrusionPolygon(null)
            setBoxCorners(null)
            setDimensionLabels(null)
            setPlacement(null)
            setOriginalResult(null)
        }
    }, [strokes, forceFloorPlacement, canvasWidth, containerRef]) // eslint-disable-line react-hooks/exhaustive-deps

    return {
        strokes,
        handleStrokeAdded,
        handleClear,
        polygon,
        extrusionPolygon,
        boxCorners,
        dimensionLabels,
        forceFloorPlacement,
        setForceFloorPlacement,
        bboxPos,
        setBboxPos,
        placement,
        originalResult,
        applyAdjustedResult,
        commitBoxErase,
    }
}
