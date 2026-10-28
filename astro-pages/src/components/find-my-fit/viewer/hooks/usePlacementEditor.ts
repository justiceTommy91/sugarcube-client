/* eslint-disable i18next/no-literal-string */
import { useCallback, useMemo, useRef, useState } from 'react'
import type { PlacementFromStrokesResult, PointXYZ } from '@gatsby/Renderer/geomviewer/geom_types'
import { GeomViewer } from '@gatsby/Renderer/geomviewer/geom_init'
import type { Dimension, ConnectorLine, DimensionLabels } from '../types'
import type { DrawingModeState, ManualEraseOverrides } from './useDrawingMode'
import type { HandleConfig, ResizeHandlesState, DragEndInfo } from './useResizeHandles'
import type { BoxMoveState } from './useBoxMove'
import { useDrawingMode } from './useDrawingMode'
import { useResizeHandles } from './useResizeHandles'
import { useBoxMove } from './useBoxMove'
import { clamp } from '../carouselMath'
import { MIN_DIMENSION_M, MAX_DIMENSION_M, STEP_SIZE_M } from '../constants'
import { queryCenteredAdjustment } from '../resizeMath'

const PLACEMENT_EPS = 1e-5

function isSamePlacement(
    a: PlacementFromStrokesResult | null,
    b: PlacementFromStrokesResult,
): boolean {
    if (!a) return false
    if (a === b) return true
    const ad = a.dimensions; const bd = b.dimensions
    if (Math.abs(ad.width - bd.width) > PLACEMENT_EPS
        || Math.abs(ad.height - bd.height) > PLACEMENT_EPS
        || Math.abs(ad.depth - bd.depth) > PLACEMENT_EPS) return false
    const au = a.uvBounds; const bu = b.uvBounds
    if (au && bu) {
        if (Math.abs(au.uMin - bu.uMin) > PLACEMENT_EPS
            || Math.abs(au.uMax - bu.uMax) > PLACEMENT_EPS
            || Math.abs(au.vMin - bu.vMin) > PLACEMENT_EPS
            || Math.abs(au.vMax - bu.vMax) > PLACEMENT_EPS) return false
    }
    return true
}

// API to display remap for floors. The engine's 'height' axis is
// forward/back and 'depth' is the upward extrusion, but UI terms are the
// reverse. Walls match naturally and need no remap.
function remapFloorDim(dim: Dimension, isFloor: boolean): Dimension {
    if (!isFloor || dim === 'width') return dim
    return dim === 'height' ? 'depth' : 'height'
}

function toDisplayLabels(labels: DimensionLabels): DimensionLabels {
    if (labels.surfaceClass !== 'floor') return labels
    return { ...labels, height: labels.depth, depth: labels.height }
}

export type PlacementEditorState = Omit<DrawingModeState, 'applyAdjustedResult' | 'originalResult' | 'commitBoxErase' | 'dimensionLabels'> &
    Pick<ResizeHandlesState, 'activeHandle' | 'activeFaceIndices' | 'onPointerDown'> &
    Pick<BoxMoveState, 'isMoving' | 'onMovePointerDown'> & {
        originalResult: DrawingModeState['originalResult']
        /** API-keyed dimensions for search. */
        dimensionLabels: DimensionLabels | null
        /** Display-keyed (visual) dimensions for the toolbar. */
        displayDimensionLabels: DimensionLabels | null
        /** Dimension currently being dragged, in visual/display terms. */
        activeDimension: Dimension | null
        /** The handle configs to render (corners in default, faces in targeted). */
        handleConfigs: HandleConfig[]
        /** Dimension in targeted-edit mode, in visual/display terms. */
        targetedDimension: Dimension | null
        enterTargetedMode: (displayDim: Dimension) => void
        exitTargetedMode: () => void
        stepDimension: (direction: 1 | -1) => void
        /** Connector lines to draw on the canvas overlay. */
        connectorLines: ConnectorLine[]
        /** Clear resize state (for full reset). */
        clearAdjustment: () => void
        /** Shift the current box by a world-space delta, preserving dimensions. */
        shiftBy: (worldDelta: PointXYZ) => void
    }

// Connector-line style lookup, indexed by drag state relative to a handle.
const CONNECTOR_STYLE = {
    idle:   { opacity: 0.32, width: 1.7 },
    active: { opacity: 1.0,  width: 2.5 },
    dimmed: { opacity: 0.1,  width: 1.0 },
} as const

function buildConnectorLines(
    targetedDimensionApi: Dimension | null,
    handleConfigs: HandleConfig[],
    cornerHandleConfigs: HandleConfig[],
    junctionPosition: import('../types').NormalizedPoint | null,
    activeHandle: ResizeHandlesState['activeHandle'],
): ConnectorLine[] {
    const dragging = !!activeHandle

    // Targeted mode: single line between the two face handles.
    if (targetedDimensionApi) {
        if (handleConfigs.length < 2) return []
        const style = dragging ? CONNECTOR_STYLE.active : CONNECTOR_STYLE.idle
        return [{
            from: [handleConfigs[0].x, handleConfigs[0].y],
            to:   [handleConfigs[1].x, handleConfigs[1].y],
            ...style,
        }]
    }

    // Default mode: junction → each corner handle.
    if (!junctionPosition || cornerHandleConfigs.length === 0) return []
    return cornerHandleConfigs.map((h) => {
        const style = !dragging
            ? CONNECTOR_STYLE.idle
            : activeHandle === h.id ? CONNECTOR_STYLE.active : CONNECTOR_STYLE.dimmed
        return { from: junctionPosition, to: [h.x, h.y], ...style }
    })
}

export function usePlacementEditor(
    containerRef: React.RefObject<HTMLDivElement | null>,
    canvasWidth: number,
    onBboxEdit?: (info: DragEndInfo, source: 'drag' | 'step') => void,
    manualOverridesRef?: React.RefObject<ManualEraseOverrides>,
): PlacementEditorState {
    const drawing = useDrawingMode(containerRef, canvasWidth, manualOverridesRef)

    // Adjusted result from resize/move/targeted/shift; null = show originalResult.
    const [adjustedResult, setAdjustedResult] = useState<PlacementFromStrokesResult | null>(null)
    // Reset adjustment when the underlying stroke-based result changes.
    const [originalSnapshot, setOriginalSnapshot] = useState<PlacementFromStrokesResult | null>(null)
    if (originalSnapshot !== drawing.originalResult) {
        setOriginalSnapshot(drawing.originalResult)
        setAdjustedResult(null)
    }

    const currentResult = adjustedResult ?? drawing.originalResult

    // Synchronous mirror so callbacks can read the freshest value without
    // waiting for React to re-render. Assigned during render (no effect)
    // so every fresh closure sees the latest value immediately.
    const currentResultRef = useRef(currentResult)
    currentResultRef.current = currentResult

    const handleAdjusted = useCallback((result: PlacementFromStrokesResult) => {
        if (isSamePlacement(currentResultRef.current, result)) return
        currentResultRef.current = result
        setAdjustedResult(result)
        drawing.applyAdjustedResult(result)
    }, [drawing.applyAdjustedResult])

    // Discrete updates (targeted stepper, item-drag sync) commit the erase
    // immediately. Pointer-drag updates defer to drag-end.
    const handleAdjustedAndErase = useCallback((result: PlacementFromStrokesResult) => {
        handleAdjusted(result)
        drawing.commitBoxErase()
    }, [handleAdjusted, drawing.commitBoxErase])

    const clearAdjustment = useCallback(() => {
        setAdjustedResult(null)
    }, [])

    const shiftBy = useCallback((worldDelta: PointXYZ) => {
        const cur = currentResultRef.current ?? drawing.originalResult
        if (!cur) return
        const r = GeomViewer.bindings?.queryMovedPlacement(
            cur, worldDelta,
            { forceFloorPlacement: drawing.forceFloorPlacement },
        )
        if (r?.ok && r.retValues) handleAdjustedAndErase(r.retValues)
    }, [drawing.originalResult, drawing.forceFloorPlacement, handleAdjustedAndErase])

    const onResizeDragEnd = useCallback(
        (info: DragEndInfo) => {
            drawing.commitBoxErase()
            onBboxEdit?.(info, 'drag')
        },
        [drawing.commitBoxErase, onBboxEdit],
    )

    const resize = useResizeHandles(
        containerRef,
        currentResult,
        drawing.forceFloorPlacement,
        drawing.boxCorners,
        handleAdjusted,
        onResizeDragEnd,
    )

    const [targetedDimensionApi, setTargetedDimensionApi] = useState<Dimension | null>(null)

    const exitTargetedMode = useCallback(() => setTargetedDimensionApi(null), [])

    const stepDimension = useCallback((direction: 1 | -1) => {
        if (!targetedDimensionApi || !currentResult || resize.activeHandle) return

        const newDims = { ...currentResult.dimensions }
        newDims[targetedDimensionApi] = clamp(
            newDims[targetedDimensionApi] + direction * STEP_SIZE_M,
            MIN_DIMENSION_M, MAX_DIMENSION_M,
        )

        // Width is always centered. For floor, API height (= visual depth)
        // is also centered.
        const isFloorSurface = currentResult.surfaceClass === 'floor'
        const shouldCenter = targetedDimensionApi === 'width'
            || (targetedDimensionApi === 'height' && isFloorSurface)

        let adjusted: PlacementFromStrokesResult | null = null
        if (shouldCenter && (targetedDimensionApi === 'width' || targetedDimensionApi === 'height')) {
            adjusted = queryCenteredAdjustment(
                currentResult, newDims, targetedDimensionApi, drawing.forceFloorPlacement,
            )
        } else {
            const heightAnchor = targetedDimensionApi === 'height' ? 'min' as const : undefined
            const result = GeomViewer.bindings?.queryAdjustedPlacement(
                currentResult, newDims,
                { forceFloorPlacement: drawing.forceFloorPlacement, heightAnchor },
            )
            if (result?.ok && result.retValues) adjusted = result.retValues
        }

        if (adjusted) {
            onBboxEdit?.(
                {
                    startDimensions: { ...currentResult.dimensions },
                    endDimensions: { ...adjusted.dimensions },
                    startPlacement: currentResult.placement,
                    endPlacement: adjusted.placement,
                },
                'step',
            )
            handleAdjustedAndErase(adjusted)
        }
    }, [
        targetedDimensionApi, currentResult, resize.activeHandle,
        drawing.forceFloorPlacement, handleAdjustedAndErase, onBboxEdit,
    ])

    const move = useBoxMove(
        containerRef,
        currentResult,
        drawing.forceFloorPlacement,
        drawing.boxCorners,
        handleAdjusted,
        drawing.commitBoxErase,
    )

    const handleConfigs = useMemo(() => {
        if (!targetedDimensionApi) return resize.cornerHandleConfigs
        return resize.faceHandleConfigs.filter((c) => c.dimension === targetedDimensionApi)
    }, [targetedDimensionApi, resize.cornerHandleConfigs, resize.faceHandleConfigs])

    const isFloor = drawing.dimensionLabels?.surfaceClass === 'floor'
    const displayDimensionLabels = useMemo(
        () => (drawing.dimensionLabels ? toDisplayLabels(drawing.dimensionLabels) : null),
        [drawing.dimensionLabels],
    )
    const displayActiveDimension = resize.activeDimension
        ? remapFloorDim(resize.activeDimension, isFloor) : null
    const displayTargetedDimension = targetedDimensionApi
        ? remapFloorDim(targetedDimensionApi, isFloor) : null
    const enterTargetedMode = useCallback(
        (displayDim: Dimension) => setTargetedDimensionApi(remapFloorDim(displayDim, isFloor)),
        [isFloor],
    )

    const connectorLines = useMemo<ConnectorLine[]>(
        () => buildConnectorLines(
            targetedDimensionApi, handleConfigs,
            resize.cornerHandleConfigs, resize.junctionPosition, resize.activeHandle,
        ),
        [
            targetedDimensionApi, handleConfigs,
            resize.cornerHandleConfigs, resize.junctionPosition,
            resize.activeHandle,
        ],
    )

    return {
        strokes: drawing.strokes,
        handleStrokeAdded: drawing.handleStrokeAdded,
        handleClear: drawing.handleClear,
        polygon: drawing.polygon,
        extrusionPolygon: drawing.extrusionPolygon,
        boxCorners: drawing.boxCorners,
        dimensionLabels: drawing.dimensionLabels,
        displayDimensionLabels,
        forceFloorPlacement: drawing.forceFloorPlacement,
        setForceFloorPlacement: drawing.setForceFloorPlacement,
        bboxPos: drawing.bboxPos,
        setBboxPos: drawing.setBboxPos,
        placement: drawing.placement,
        originalResult: drawing.originalResult,

        handleConfigs,
        activeHandle: resize.activeHandle,
        activeDimension: displayActiveDimension,
        activeFaceIndices: resize.activeFaceIndices,
        onPointerDown: resize.onPointerDown,

        connectorLines,
        clearAdjustment,
        shiftBy,

        isMoving: move.isMoving,
        onMovePointerDown: move.onMovePointerDown,

        targetedDimension: displayTargetedDimension,
        enterTargetedMode,
        exitTargetedMode,
        stepDimension,
    }
}
