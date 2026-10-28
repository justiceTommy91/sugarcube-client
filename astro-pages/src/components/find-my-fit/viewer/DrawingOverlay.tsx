import React, { useRef, useCallback, useEffect } from 'react'
import { IKEA_YELLOW_SOLID } from './constants'
import { convexHull } from './resizeMath'
import type {
    BoxCorners8, ConnectorLine, NormalizedPoint,
    Stroke, DimensionLabels,
} from './types'

type DrawingOverlayProps = {
    strokes: Stroke[]
    /** Required unless readOnly; readOnly overlays never fire this callback. */
    onStrokeAdded?: (stroke: Stroke) => void
    /** Fires on pointer-down at stroke start. Not called in readOnly mode. */
    onStrokeStart?: () => void
    polygon?: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint] | null
    extrusionPolygon?: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint] | null
    boxCorners?: BoxCorners8 | null
    /** Face corner indices to tint yellow during drag (e.g. [4,5,6,7] for front). */
    activeFaceIndices?: [number, number, number, number] | null
    dimensionLabels?: DimensionLabels | null
    onBboxPosition?: (pos: { topY: number; centerX: number } | null) => void
    readOnly?: boolean
    loading?: boolean
    /** When set, strokes render in readOnly mode and fade out over this duration (ms). */
    strokeFadeMs?: number
    brushColor?: string
    formatDimension?: (meters: number) => string
    /** When true, suppress canvas-drawn dimension labels (toolbar takes over). */
    hideDimensionLabels?: boolean
    /** Connector lines between handles / junction. */
    connectorLines?: ConnectorLine[]
    /** Highlight the box silhouette (e.g. during move drag). */
    highlightSilhouette?: boolean
}

const BRUSH_COLOR = `rgba(0, 188, 212, 0.8)`
export const BRUSH_WIDTH = 32
const SMOOTHING_FACTOR = 0.3

const BOX_FACE_FILL = `rgba(255, 255, 255, 0.12)`
const BOX_EDGE_COLOR = `rgba(255, 255, 255, 0.85)`
const BOX_EDGE_WIDTH = 1.5
const SILHOUETTE_COLOR = IKEA_YELLOW_SOLID
const SILHOUETTE_WIDTH = 2.5
const CONNECTOR_COLOR = IKEA_YELLOW_SOLID

function drawSmoothStroke(
    ctx: CanvasRenderingContext2D, stroke: Stroke,
    width: number, height: number, color: string = BRUSH_COLOR,
) {
    if (stroke.length < 2) return

    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = BRUSH_WIDTH
    ctx.lineCap = `round`
    ctx.lineJoin = `round`

    const px = (i: number) => stroke[i][0] * width
    const py = (i: number) => stroke[i][1] * height

    ctx.moveTo(px(0), py(0))

    for (let i = 1; i < stroke.length - 1; i += 1) {
        const midX = (px(i) + px(i + 1)) / 2
        const midY = (py(i) + py(i + 1)) / 2
        ctx.quadraticCurveTo(px(i), py(i), midX, midY)
    }
    ctx.lineTo(px(stroke.length - 1), py(stroke.length - 1))

    ctx.stroke()
}

type Pt = [number, number]

function toPixel(p: NormalizedPoint, w: number, h: number): Pt {
    return [p[0] * w, p[1] * h]
}

function fillQuad(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, c: Pt, d: Pt) {
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.lineTo(c[0], c[1])
    ctx.lineTo(d[0], d[1])
    ctx.closePath()
    ctx.fillStyle = BOX_FACE_FILL
    ctx.fill()
}

function strokeEdge(ctx: CanvasRenderingContext2D, a: Pt, b: Pt) {
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
}

function drawBoundingBox(
    ctx: CanvasRenderingContext2D,
    box: BoxCorners8,
    w: number,
    h: number,
    activeFaceIndices?: [number, number, number, number] | null,
    highlightSilhouette?: boolean,
) {
    const pts: Pt[] = box.map((p) => toPixel(p, w, h))
    const [b0, b1, b2, b3, f0, f1, f2, f3] = pts

    // Face fills (glass-like, low opacity)
    fillQuad(ctx, b0, b1, b2, b3) // back
    fillQuad(ctx, f0, f1, f2, f3) // front
    fillQuad(ctx, b3, b2, f2, f3) // top
    fillQuad(ctx, b0, b1, f1, f0) // bottom
    fillQuad(ctx, b0, b3, f3, f0) // left
    fillQuad(ctx, b1, b2, f2, f1) // right

    // Active face tint
    if (activeFaceIndices) {
        const [a, b, c, d] = activeFaceIndices.map((i) => pts[i])
        ctx.fillStyle = `${IKEA_YELLOW_SOLID}30`
        ctx.beginPath()
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1])
        ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1])
        ctx.closePath()
        ctx.fill()
    }

    // Gold silhouette (convex hull outline)
    const hull = convexHull(pts)
    if (hull.length > 2) {
        ctx.strokeStyle = SILHOUETTE_COLOR
        ctx.lineWidth = highlightSilhouette ? SILHOUETTE_WIDTH * 1.5 : SILHOUETTE_WIDTH
        ctx.lineJoin = `round`
        ctx.lineCap = `round`
        ctx.globalAlpha = highlightSilhouette ? 1 : 0.35
        ctx.beginPath()
        ctx.moveTo(hull[0][0], hull[0][1])
        hull.forEach((p) => ctx.lineTo(p[0], p[1]))
        ctx.closePath()
        ctx.stroke()
        ctx.globalAlpha = 1
    }

    // All edges solid (matching reference)
    ctx.strokeStyle = BOX_EDGE_COLOR
    ctx.lineWidth = BOX_EDGE_WIDTH
    ctx.lineJoin = `round`
    ctx.lineCap = `round`
    ctx.setLineDash([])

    // Back face edges
    strokeEdge(ctx, b0, b1)
    strokeEdge(ctx, b1, b2)
    strokeEdge(ctx, b2, b3)
    strokeEdge(ctx, b3, b0)

    // Front face edges
    strokeEdge(ctx, f0, f1)
    strokeEdge(ctx, f1, f2)
    strokeEdge(ctx, f2, f3)
    strokeEdge(ctx, f3, f0)

    // Connecting edges
    strokeEdge(ctx, b0, f0)
    strokeEdge(ctx, b1, f1)
    strokeEdge(ctx, b2, f2)
    strokeEdge(ctx, b3, f3)
}

function drawConnectorLines(
    ctx: CanvasRenderingContext2D,
    lines: ConnectorLine[],
    w: number,
    h: number,
) {
    ctx.lineCap = `round`
    lines.forEach((line) => {
        const from = toPixel(line.from, w, h)
        const to = toPixel(line.to, w, h)
        ctx.strokeStyle = CONNECTOR_COLOR
        ctx.lineWidth = line.width
        ctx.globalAlpha = line.opacity
        ctx.beginPath()
        ctx.moveTo(from[0], from[1])
        ctx.lineTo(to[0], to[1])
        ctx.stroke()
    })
    ctx.globalAlpha = 1
}

const SHIMMER_CYCLE_MS = 1800
const SHIMMER_BAND = 0.3

function drawLoadingShimmer(ctx: CanvasRenderingContext2D, box: BoxCorners8, w: number, h: number) {
    const pts: Pt[] = box.map((p) => toPixel(p, w, h))
    const [b0, b1, b2, b3, f0, f1, f2, f3] = pts

    const allY = pts.map((p) => p[1])
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)
    const span = maxY - minY
    if (span < 1) return

    const bandH = span * SHIMMER_BAND
    const phase = (performance.now() % SHIMMER_CYCLE_MS) / SHIMMER_CYCLE_MS
    const bandY = maxY + bandH - phase * (span + bandH * 2)

    const grad = ctx.createLinearGradient(0, bandY - bandH, 0, bandY + bandH)
    grad.addColorStop(0, `rgba(255,255,255,0)`)
    grad.addColorStop(0.5, `rgba(255,255,255,0.45)`)
    grad.addColorStop(1, `rgba(255,255,255,0)`)

    ctx.fillStyle = grad
    const faces: Pt[][] = [
        [b0, b1, b2, b3], [f0, f1, f2, f3],
        [b3, b2, f2, f3], [b0, b1, f1, f0],
        [b0, b3, f3, f0], [b1, b2, f2, f1],
    ]
    faces.forEach(([a, b, c, d]) => {
        ctx.beginPath()
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1])
        ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1])
        ctx.closePath()
        ctx.fill()
    })
}

const LABEL_FONT_SIZE = 13
const LABEL_FONT = `bold ${LABEL_FONT_SIZE}px monospace`
const LABEL_FONT_ACTIVE = `bold ${Math.round(LABEL_FONT_SIZE * 1.5)}px monospace`
const LABEL_PAD_X = 5
const LABEL_PAD_Y = 3
const LABEL_BG = `rgba(0, 0, 0, 0.7)`
const LABEL_COLOR = `#fff`

function midpoint(a: NormalizedPoint, b: NormalizedPoint, w: number, h: number): [number, number] {
    return [((a[0] + b[0]) / 2) * w, ((a[1] + b[1]) / 2) * h]
}

function lerp(a: NormalizedPoint, b: NormalizedPoint, t: number, w: number, h: number): [number, number] {
    return [(a[0] + (b[0] - a[0]) * t) * w, (a[1] + (b[1] - a[1]) * t) * h]
}

function drawEdgeLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    offset: [number, number] = [0, 0],
    active = false,
) {
    const font = active ? LABEL_FONT_ACTIVE : LABEL_FONT
    const fontSize = active ? Math.round(LABEL_FONT_SIZE * 1.5) : LABEL_FONT_SIZE
    ctx.font = font
    const metrics = ctx.measureText(text)
    const tw = metrics.width
    const th = fontSize
    const bx = x + offset[0] - tw / 2 - LABEL_PAD_X
    const by = y + offset[1] - th / 2 - LABEL_PAD_Y

    ctx.fillStyle = LABEL_BG
    ctx.beginPath()
    ctx.roundRect(bx, by, tw + LABEL_PAD_X * 2, th + LABEL_PAD_Y * 2, 4)
    ctx.fill()

    ctx.fillStyle = active ? IKEA_YELLOW_SOLID : LABEL_COLOR
    ctx.textAlign = `center`
    ctx.textBaseline = `middle`
    ctx.fillText(text, x + offset[0], y + offset[1])
}

const defaultFmtDimension = (v: number) => `${v.toFixed(2)}m`

const LABEL_OUTSIDE_PX = 16

function edgeOutwardOffset(
    p1: NormalizedPoint, p2: NormalizedPoint,
    centerPx: Pt, w: number, h: number, fallback: Pt,
): Pt {
    const edx = (p2[0] - p1[0]) * w
    const edy = (p2[1] - p1[1]) * h
    const ax = -edy
    const ay = edx
    const midPx: Pt = [((p1[0] + p2[0]) / 2) * w, ((p1[1] + p2[1]) / 2) * h]
    const toMidX = midPx[0] - centerPx[0]
    const toMidY = midPx[1] - centerPx[1]
    let px = (ax * toMidX + ay * toMidY) >= 0 ? ax : -ax
    let py = (ax * toMidX + ay * toMidY) >= 0 ? ay : -ay
    const len = Math.sqrt(px * px + py * py)
    if (len < 0.5) return fallback
    px /= len; py /= len
    return [px * LABEL_OUTSIDE_PX, py * LABEL_OUTSIDE_PX]
}

function drawDimensionLabels(
    ctx: CanvasRenderingContext2D,
    baseCorners: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint],
    extCorners: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint],
    labels: DimensionLabels,
    w: number,
    h: number,
    fmt: (meters: number) => string = defaultFmtDimension,
    activeDimension?: 'width' | 'height' | 'depth' | null,
    box?: BoxCorners8 | null,
) {
    const allPts = box ? Array.from(box) : [...baseCorners, ...extCorners]
    const cx = allPts.reduce((s, p) => s + p[0], 0) / allPts.length * w
    const cy = allPts.reduce((s, p) => s + p[1], 0) / allPts.length * h
    const center: Pt = [cx, cy]

    const widthPt = midpoint(baseCorners[0], baseCorners[1], w, h)
    const wOff = edgeOutwardOffset(baseCorners[0], baseCorners[1], center, w, h, [0, LABEL_OUTSIDE_PX])
    drawEdgeLabel(ctx, fmt(labels.width), widthPt[0], widthPt[1], wOff, activeDimension === 'width')

    const heightPt = lerp(baseCorners[0], baseCorners[3], 0.85, w, h)
    const hOff = edgeOutwardOffset(baseCorners[0], baseCorners[3], center, w, h, [-LABEL_OUTSIDE_PX, 0])
    drawEdgeLabel(ctx, fmt(labels.height), heightPt[0], heightPt[1], hOff, activeDimension === 'height')

    const depthPt = midpoint(extCorners[1], extCorners[2], w, h)
    const dOff = edgeOutwardOffset(extCorners[1], extCorners[2], center, w, h, [LABEL_OUTSIDE_PX, 0])
    drawEdgeLabel(ctx, fmt(labels.depth), depthPt[0], depthPt[1], dOff, activeDimension === 'depth')
}

const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
    strokes,
    onStrokeAdded,
    onStrokeStart,
    polygon,
    extrusionPolygon,
    boxCorners,
    activeFaceIndices,
    dimensionLabels,
    onBboxPosition,
    readOnly = false,
    loading = false,
    strokeFadeMs,
    brushColor,
    formatDimension,
    hideDimensionLabels,
    connectorLines,
    highlightSilhouette,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const currentStrokeRef = useRef<NormalizedPoint[]>([])
    const lastSmoothedRef = useRef<NormalizedPoint | null>(null)
    const activePointerRef = useRef<number | null>(null)
    const rafRef = useRef<number>(0)
    const loadingRef = useRef(loading)
    loadingRef.current = loading
    const fadeStartRef = useRef(performance.now())
    const strokeFadeMsRef = useRef(strokeFadeMs)
    strokeFadeMsRef.current = strokeFadeMs

    useEffect(() => {
        const noop = () => {}
        document.addEventListener(`touchstart`, noop, { capture: true })
        return () => document.removeEventListener(`touchstart`, noop, { capture: true })
    }, [])

    const syncCanvasSize = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        const w = Math.round(rect.width * dpr)
        const h = Math.round(rect.height * dpr)
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
        }
    }, [])

    const redraw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const w = canvas.width / dpr
        const h = canvas.height / dpr
        if (w === 0 || h === 0) return

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)

        if (!readOnly) {
            strokes.forEach((stroke) => {
                drawSmoothStroke(ctx, stroke, w, h, brushColor)
            })
            if (currentStrokeRef.current.length >= 2) {
                drawSmoothStroke(ctx, currentStrokeRef.current, w, h, brushColor)
            }
        } else if (strokeFadeMsRef.current && strokeFadeMsRef.current > 0) {
            const elapsed = performance.now() - fadeStartRef.current
            const opacity = Math.max(0, 1 - elapsed / strokeFadeMsRef.current)
            if (opacity > 0) {
                ctx.globalAlpha = opacity
                strokes.forEach((stroke) => {
                    drawSmoothStroke(ctx, stroke, w, h, brushColor)
                })
                ctx.globalAlpha = 1
            }
        }

        if (boxCorners) {
            drawBoundingBox(ctx, boxCorners, w, h, activeFaceIndices, highlightSilhouette)
            if (connectorLines && connectorLines.length > 0) {
                drawConnectorLines(ctx, connectorLines, w, h)
            }
            if (loadingRef.current) drawLoadingShimmer(ctx, boxCorners, w, h)
        }
        if (polygon && extrusionPolygon && dimensionLabels && !hideDimensionLabels) {
            drawDimensionLabels(
                ctx, polygon, extrusionPolygon, dimensionLabels,
                w, h, formatDimension, undefined, boxCorners,
            )
        }
    }, [
        strokes, polygon, extrusionPolygon, boxCorners,
        activeFaceIndices, dimensionLabels, readOnly, brushColor,
        formatDimension, hideDimensionLabels, connectorLines,
        highlightSilhouette,
    ])

    const scheduleRedraw = useCallback(() => {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(redraw)
    }, [redraw])

    const redrawRef = useRef(redraw)
    redrawRef.current = redraw

    useEffect(() => {
        syncCanvasSize()
        redraw()
    }, [syncCanvasSize, redraw])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return undefined
        // Redraw synchronously after syncCanvasSize: setting canvas.width
        // clears the bitmap, and deferring the redraw to the next animation
        // frame lets the browser paint a blank canvas in between.
        const ro = new ResizeObserver(() => {
            syncCanvasSize()
            redrawRef.current()
        })
        ro.observe(canvas)
        return () => ro.disconnect()
    }, [syncCanvasSize])

    useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

    useEffect(() => {
        if (!loading) {
            redrawRef.current()
            return undefined
        }
        let id: number
        const tick = () => { redrawRef.current(); id = requestAnimationFrame(tick) }
        id = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(id)
    }, [loading])

    useEffect(() => {
        if (!strokeFadeMs || strokeFadeMs <= 0) return undefined
        fadeStartRef.current = performance.now()
        let id: number
        const tick = () => {
            const elapsed = performance.now() - fadeStartRef.current
            if (elapsed < strokeFadeMs) {
                redrawRef.current()
                id = requestAnimationFrame(tick)
            } else {
                redrawRef.current()
            }
        }
        id = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(id)
    }, [strokeFadeMs])

    useEffect(() => {
        if (!onBboxPosition) return

        const boundsOf = (points: NormalizedPoint[]) => ({
            topY: Math.min(...points.map((p) => p[1])),
            centerX: (Math.min(...points.map((p) => p[0])) + Math.max(...points.map((p) => p[0]))) / 2,
        })

        const allCorners = [...(polygon || []), ...(extrusionPolygon || [])]
        if (allCorners.length > 0) {
            onBboxPosition(boundsOf(allCorners))
        } else if (strokes.length > 0) {
            onBboxPosition(boundsOf(strokes.flat()))
        } else {
            onBboxPosition(null)
        }
    }, [polygon, extrusionPolygon, strokes, onBboxPosition])

    const getNormalizedPoint = useCallback((e: React.PointerEvent): NormalizedPoint => {
        const canvas = canvasRef.current
        if (!canvas) return [0, 0]
        const rect = canvas.getBoundingClientRect()
        return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]
    }, [])

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (activePointerRef.current !== null) return
            activePointerRef.current = e.pointerId
            const pt = getNormalizedPoint(e)
            lastSmoothedRef.current = pt
            currentStrokeRef.current = [pt]
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            onStrokeStart?.()
        },
        [getNormalizedPoint, onStrokeStart],
    )

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (activePointerRef.current !== e.pointerId) return
            const raw = getNormalizedPoint(e)
            const prev = lastSmoothedRef.current
            const a = SMOOTHING_FACTOR
            const smoothed: NormalizedPoint = prev
                ? [prev[0] + a * (raw[0] - prev[0]), prev[1] + a * (raw[1] - prev[1])]
                : raw
            lastSmoothedRef.current = smoothed
            currentStrokeRef.current.push(smoothed)
            scheduleRedraw()
        },
        [getNormalizedPoint, scheduleRedraw],
    )

    const handlePointerUp = useCallback(
        (e: React.PointerEvent) => {
            if (activePointerRef.current !== e.pointerId) return
            activePointerRef.current = null
            lastSmoothedRef.current = null
            if (currentStrokeRef.current.length >= 2 && onStrokeAdded) {
                onStrokeAdded(currentStrokeRef.current)
            }
            currentStrokeRef.current = []
            // Prevent a pending pointermove rAF from firing after strokes prop
            // updates and overwriting the canvas with a stale closure that
            // excludes the just-added stroke.
            cancelAnimationFrame(rafRef.current)
        },
        [onStrokeAdded],
    )

    return (
        <canvas
            ref={canvasRef}
            className={activeFaceIndices ? 'FmfViewer__drawing-canvas--handle-active' : undefined}
            style={{
                width: `100%`,
                height: `100%`,
                position: `absolute`,
                top: 0,
                left: 0,
                pointerEvents: readOnly ? `none` : `auto`,
                touchAction: `none`,
                cursor: readOnly ? `default` : `crosshair`,
            }}
            onPointerDown={readOnly ? undefined : handlePointerDown}
            onPointerMove={readOnly ? undefined : handlePointerMove}
            onPointerUp={readOnly ? undefined : handlePointerUp}
            onPointerCancel={readOnly ? undefined : handlePointerUp}
        />
    )
}

export default DrawingOverlay
