import React, { useState, useRef, useEffect } from 'react'

import classNames from 'classnames'

import {
    VIEWER_INITIALIZED,
    OBJECT_TYPE_WALL_ELEMENT,
    WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED,
    WALL_ELEMENT_TYPE_DOOR,
    OBJECT_TYPE_WALL,
    VIEWER_UI_EVENT_DRAG_END,
    OBJECT_TYPE_COMPOSITION_ITEM,
    OBJECT_TYPE_WALL_VERTEX,
} from 'Planner/api_constants'
import type { InteractableItemType, ViewerUIEvent } from 'Planner/api_types'
import { deduplicateAndMergeLines } from 'Planner/planner_utils'

import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerViewer } from 'Planner/ui/hooks/usePlannerViewer'
import { useRoomWallsInfo } from 'Planner/ui/hooks/useRoomWallsInfo'
import { useRoomVerticesInfo } from 'Planner/ui/hooks/useRoomVerticesInfo'
import { useWallElementsInfo } from 'Planner/ui/hooks/useWallElementsInfo'
import { useComposition } from 'Planner/ui/hooks/useComposition'
import { usePlannerViewerUIState } from 'Planner/ui/hooks/usePlannerViewerUIState'
import { useVertexSnapping } from 'Planner/ui/hooks/useVertexSnapping'
import { useWallSnapping } from 'Planner/ui/hooks/useWallSnapping'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'

import { useFlags, useAppDispatch } from 'hooks'
import { drop } from 'utils/tracker'
import { type Step } from 'models/planner/index'
import { floatsClose } from 'utils/math'
import { wallEdited, compositionItemMoved, wallElementMoved, vertexMoved } from 'models/planner/slice'
import { WallElementOverlay } from './WallElementOverlay'
import { WallOverlay } from './WallOverlay'
import { CompositionItemOverlay } from './CompositionItemOverlay'
import { VertexOverlay } from './VertexOverlay'
import { SnapLine } from './SnapLine'
import { SnapAngle } from './SnapAngle'
import { SnapParallel } from './SnapParallel'

import './PlannerViewerOverlay.scss'

export type PlannerViewerOverlayProps = {
    viewerId: string
    onDragWallStart?: () => void
    showWallOverlays: boolean
    showWallElementOverlays: boolean
    step: Step
}

type WallElementSnapshot = {
    elementId: string
    x: number
    y: number
    z: number
}

type CompositionItemSnapshot = {
    itemId: string
    x: number
    y: number
    z: number
    heading: number
    headingI: number
    headingJ: number
    headingK: number
}

type WallSnapshot = {
    wallId: string
}

type VertexSnapshot = {
    vertexId: string
}

export const PlannerViewerOverlay = ({
    viewerId,
    onDragWallStart,
    showWallOverlays,
    showWallElementOverlays,
    step,
}: PlannerViewerOverlayProps) => {
    const parentRef = useRef<HTMLDivElement>(null)
    const { flags } = useFlags()
    const dispatch = useAppDispatch()
    const { plannerApi } = usePlannerApi()
    const plannerTrackingInfo = usePlannerTrackingInfo()

    const [draggingWallId, setDraggingWallId] = useState<string | null>(null)
    const [draggingVertexId, setDraggingVertexId] = useState<string | null>(null)
    const [draggingElementId, setDraggingElementId] = useState<string | null>(null)
    const [itemsSnapshot, setItemsSnapshot] = useState<Map<string, CompositionItemSnapshot>>(new Map())
    const [wallElementsSnapshot, setWallElementsSnapshot] = useState<Map<string, WallElementSnapshot>>(new Map())
    const [wallsSnapshot, setWallsSnapshot] = useState<Map<string, WallSnapshot>>(new Map())
    const [vertexSnapshot, setVertexSnapshot] = useState<Map<string, VertexSnapshot>>(new Map())

    const [vertexDragInProgress, setVertexDragInProgress] = useState(false)
    const [dragAffectedWalls, setDragAffectedWalls] = useState<string[]>([])

    const wallsInfo = useRoomWallsInfo()
    const verticesInfo = useRoomVerticesInfo()
    const elementsInfo = useWallElementsInfo()
    const compositionItemsInfo = useComposition()
    const {
        draggingObjectId,
        draggingObjectType,
        verticalDraggingState,
        horizontalDraggingState,
        selectedObjectId,
        selectedObjectType,
    } =
        usePlannerViewerUIState(viewerId)
    const draggingVertexSnapInfo = useVertexSnapping(draggingVertexId, viewerId)
    const draggingWallSnapInfo = useWallSnapping(draggingWallId, viewerId)

    const {
        viewerState,
        moveWallInScreenSpace,
        startMoveWallScreenSpace,
        stopMoveWallScreenSpace,
        moveVertexInScreenSpace,
        moveWallElementInScreenSpace,
        refreshCameraView,
        forceHoverWallElement,
        forceDraggedWallElement,
    } = usePlannerViewer(viewerId)
    const isBeingDragged = !!draggingWallId

    const toRelXY = (clientX: number, clientY: number) => {
        if (parentRef?.current) {
            const parentRect = parentRef?.current?.getBoundingClientRect()
            const relX = (clientX - parentRect.left) / parentRect.width
            const relY = (clientY - parentRect.top) / parentRect.height
            return { x: relX, y: relY }
        }
        return null
    }

    const trackWallDragStart = () => {
        const currentFurnitureData = plannerApi.getFurnitureState()
        const newItemsSnapshot = new Map<string, CompositionItemSnapshot>()
        currentFurnitureData.forEach(info => newItemsSnapshot.set(info.uniqueId, {
            itemId: info.uniqueId,
            x: info.x,
            y: info.y,
            z: info.z,
            heading: info.heading,
            headingI: info.headingI,
            headingJ: info.headingJ,
            headingK: info.headingK,
        }))
        setItemsSnapshot(newItemsSnapshot)

        const wallElements = plannerApi.getAllWallElementsInfo()
        if (wallElements) {
            const newWallElementsSnapshot = new Map<string, WallElementSnapshot>()
            wallElements.forEach((info) => {
                newWallElementsSnapshot.set(info.elementId, {
                    elementId: info.elementId,
                    x: info.centerWorldPos.x,
                    y: info.centerWorldPos.y,
                    z: info.centerWorldPos.z,
                })
            })
            setWallElementsSnapshot(newWallElementsSnapshot)
        }

        const newWallsSnapshot = new Map<string, WallSnapshot>()
        wallsInfo.forEach((wall) => {
            newWallsSnapshot.set(wall.id, { wallId: wall.id })
        })
        setWallsSnapshot(newWallsSnapshot)

        const newVertexSnapshot = new Map<string, VertexSnapshot>()
        verticesInfo.forEach(vertex => {
            newVertexSnapshot.set(vertex.id, { vertexId: vertex.id })
        })
        setVertexSnapshot(newVertexSnapshot)
    }

    const trackIndirectlyMovedItems = () => {
        const result: string[] = []
        const currentFurnitureData = plannerApi.getFurnitureState()
        currentFurnitureData.forEach((info) => {
            const itemSnapshot = itemsSnapshot.get(info.uniqueId)
            if (itemSnapshot && (!floatsClose(itemSnapshot.x, info.x) ||
                !floatsClose(itemSnapshot.y, info.y) ||
                !floatsClose(itemSnapshot.z, info.z) ||
                !floatsClose(itemSnapshot.heading, info.heading) ||
                !floatsClose(itemSnapshot.headingI, info.headingI) ||
                !floatsClose(itemSnapshot.headingJ, info.headingJ) ||
                !floatsClose(itemSnapshot.headingK, info.headingK)
            )) {
                result.push(info.uniqueId)
                 drop(`RoomBuilder.MoveProduct`, {
                ...plannerTrackingInfo,
                    MoveProductContext: `WallMove`,
                    itemId: info.uniqueId,
                    editType: `mouseDrag`,
                })
            }
        })
        return result
    }

    const trackIndirectlyMovedElements = () => {
        const result: string[] = []
        const wallElements = plannerApi.getAllWallElementsInfo()
        if (!wallElements) {
            return result
        }
        wallElements.forEach((info) => {
            const snapshot = wallElementsSnapshot.get(info.elementId)
            if (snapshot && (
                !floatsClose(snapshot.x, info.centerWorldPos.x) ||
                !floatsClose(snapshot.y, info.centerWorldPos.y) ||
                !floatsClose(snapshot.z, info.centerWorldPos.z)
            )) {
                result.push(info.elementId)
            }
        })
        return result
    }

    const trackWallExtrusion = (draggedWall: string) => {
        const currentWalls = plannerApi.getAllWallsInfo()
        const currentVertices = plannerApi.getAllVerticesInfo()
        if (!currentWalls || !currentVertices) {
            return
        }
        const newWalls = currentWalls
            .filter(wallInfo => !wallsSnapshot.has(wallInfo.id))
            .map(wallInfo => wallInfo.id)
        const newVertices = currentVertices
            .filter(vertexInfo => !vertexSnapshot.has(vertexInfo.id))
            .map(vertexInfo => vertexInfo.id)

        if (newWalls.length > 0) {
            drop(`RoomBuilder.WallExtrusion`, {
                itemId: draggedWall,
                wallCreatedIds: newWalls,
                verticesCreatedIds: newVertices,
            })
        }
    }

    const trackDragEnd = (itemId: string, type: InteractableItemType) => {
        let eventName = ''
        let additionalTracking = {}
        switch (type) {
            case OBJECT_TYPE_WALL: {
                eventName = `RoomBuilder.WallEdit`
                const movedItems = trackIndirectlyMovedItems()
                const movedElements = trackIndirectlyMovedElements()
                trackWallExtrusion(itemId)
                setItemsSnapshot(new Map())
                setWallElementsSnapshot(new Map())
                setWallsSnapshot(new Map())
                setVertexSnapshot(new Map())
                additionalTracking = { TotalItemsChanged: movedItems.length }
                dispatch(wallEdited({ itemsMoved: movedItems, wallElementsMoved: movedElements }))
            }
            break
            case OBJECT_TYPE_WALL_ELEMENT: {
                eventName = `RoomBuilder.WallElementMove`
                const info = plannerApi.getWallElementInfo(itemId)
                if (info) {
                    const semanticType = info.class === WALL_ELEMENT_TYPE_DOOR ? 'DOOR' : 'WINDOW'
                    additionalTracking = { SemanticClass: semanticType }
                    dispatch(wallElementMoved({ elementId: itemId, semanticType }))
                }
            }
            break
            case OBJECT_TYPE_COMPOSITION_ITEM:
                eventName = `RoomBuilder.MoveProduct`
                additionalTracking = { MoveProductContext: `ManualMove` }
                dispatch(compositionItemMoved({ itemId }))
                break
            case OBJECT_TYPE_WALL_VERTEX: {
                eventName = `RoomBuilder.NodeEdit`
                const vertexInfo = plannerApi.getVertexInfo(itemId)
                if (vertexInfo) {
                    additionalTracking = { changedWallIds : vertexInfo.wallIds }
                    dispatch(vertexMoved({ vertexId: itemId }))
                }
            }
            break
            default:
                break
        }
        drop(eventName, {
            ...plannerTrackingInfo,
            ...additionalTracking,
            itemId,
            editType: `mouseDrag`,
        })
    }

    const onWallPointerDown = (wallId: string, event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!parentRef.current) {
            return
        }
        const point = toRelXY(event.clientX, event.clientY)
        if (point) {
            startMoveWallScreenSpace(wallId, point)
        }
        setDraggingWallId(wallId)
        trackWallDragStart()
        const wallInfo = plannerApi.getWallInfo(wallId)
        if (wallInfo) {
            setDragAffectedWalls(wallInfo.neighborWallIds)
        }
    }

    const onWallPointerUp = (wallId: string, event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (draggingWallId && flags.RoomBuilderNodeEditing) {
            plannerApi.forceSelectedWall(viewerId, wallId)
        }
    }

    const onWallElementPointerOver = (elementId: string, event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!parentRef.current || draggingElementId) {
            return
        }
        forceHoverWallElement(elementId)
    }

    const onWallElementPointerLeave = (elementId: string, event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!parentRef.current || draggingElementId) {
            return
        }
        forceHoverWallElement(null)
    }

    const onWallElementPointerDown = (elementId: string, event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!parentRef.current) {
            return
        }
        setDraggingElementId(elementId)
        forceDraggedWallElement(elementId)
    }

    const onVertexPointerDown = (vertexId: string, event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!parentRef.current) {
            return
        }
        setDraggingVertexId(vertexId)
        const vertexInfo = plannerApi.getVertexInfo(vertexId)
        if (vertexInfo) {
            setDragAffectedWalls(vertexInfo.wallIds)
        }
    }

    const onVertexPointerUp = (vertexId: string, event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (draggingVertexId) {
            plannerApi.forceSelectedVertex(viewerId, vertexId)
        }
    }

    useEffect(() => {
        const draggingAnotherWall = draggingWallId &&
            (draggingWallId !== selectedObjectId || selectedObjectType !== OBJECT_TYPE_WALL)
        const draggingAnotherVertex = draggingVertexId &&
            (draggingVertexId !== selectedObjectId || selectedObjectType !== OBJECT_TYPE_WALL_VERTEX)
        if (draggingAnotherWall || draggingAnotherVertex) {
            plannerApi.clearCurrentSelection(viewerId)
        }
        if (!draggingWallId && !draggingVertexId) {
            setDragAffectedWalls([])
        }
    }, [draggingWallId, draggingVertexId])

    // Track viewer internal drag events:
    useEffect(() => {
        const observer = (uiEvent: ViewerUIEvent) => {
            if (uiEvent.type === VIEWER_UI_EVENT_DRAG_END &&
                uiEvent.isInternal &&
                uiEvent.objectId &&
                uiEvent.objectType) {
                trackDragEnd(uiEvent.objectId, uiEvent.objectType)
            }
        }
        plannerApi.addViewerUIObserver(viewerId, observer)
        return () => plannerApi.removeViewerUIObserver(viewerId, observer)
    }, [plannerApi])

    useEffect(() => {
        const handlePointerUp = () => {
            if (draggingWallId) {
                trackDragEnd(draggingWallId, OBJECT_TYPE_WALL)
            } else if (draggingElementId) {
                trackDragEnd(draggingElementId, OBJECT_TYPE_WALL_ELEMENT)
            } else if (draggingVertexId) {
                trackDragEnd(draggingVertexId, OBJECT_TYPE_WALL_VERTEX)
            }

            if (draggingWallId) {
                stopMoveWallScreenSpace()
                setDraggingWallId(null)
            }
            if (draggingElementId) {
                setDraggingElementId(null)
                forceDraggedWallElement(null)
                forceHoverWallElement(null)
            }
            if (draggingVertexId) {
                setDraggingVertexId(null)
                setVertexDragInProgress(false)
            }
            refreshCameraView()
        }

        const handlePointerMove = (event: PointerEvent) => {
            if (!parentRef.current) {
                return
            }

            if (draggingWallId || draggingElementId || draggingVertexId) {
                const cameraUpdateArea = 0.05
                const dragTo = toRelXY(event.clientX, event.clientY)
                if (dragTo) {
                    if (draggingWallId) {
                        moveWallInScreenSpace(draggingWallId, dragTo)
                    }
                    if (draggingElementId) {
                        moveWallElementInScreenSpace(draggingElementId, dragTo)
                    }
                    if (draggingVertexId) {
                        moveVertexInScreenSpace(draggingVertexId, dragTo)
                        if (!vertexDragInProgress) {
                            setVertexDragInProgress(true)
                        }
                    }
                    if (
                        dragTo.x <= cameraUpdateArea ||
                        dragTo.x >= 1.0 - cameraUpdateArea ||
                        dragTo.y <= cameraUpdateArea ||
                        dragTo.y >= 1.0 - cameraUpdateArea
                    ) {
                        refreshCameraView()
                    }
                }
            }
        }

        if (draggingWallId) {
            onDragWallStart?.()
        }
        if (draggingWallId || draggingElementId || draggingVertexId) {
            document.addEventListener('pointermove', handlePointerMove)
            document.addEventListener('pointerup', handlePointerUp)
        } else {
            document.removeEventListener('pointermove', handlePointerMove)
            document.removeEventListener('pointerup', handlePointerUp)
        }

        return () => {
            document.removeEventListener('pointermove', handlePointerMove)
            document.removeEventListener('pointerup', handlePointerUp)
        }
    }, [draggingWallId, draggingElementId, draggingVertexId])

    useEffect(() => {
        const isDragging = draggingObjectType === OBJECT_TYPE_WALL_ELEMENT && !!(draggingObjectId || draggingElementId)
        const verticalAxisVisibility = isDragging ? verticalDraggingState : WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED
        const horizontalAxisVisibility = isDragging
            ? horizontalDraggingState
            : WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED
        plannerApi.showWallElementMeasurements(
            draggingObjectId || draggingElementId,
            verticalAxisVisibility ?? WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED,
            horizontalAxisVisibility ?? WALL_ELEMENT_DRAGGING_AXIS_STATE_DISABLED,
        )
    }, [draggingObjectId, draggingElementId, draggingObjectType, verticalDraggingState, horizontalDraggingState])

    const isLoading = viewerState !== VIEWER_INITIALIZED
    const areWallsMutated = !!draggingVertexId || !!draggingWallId
    const wallOverlays = wallsInfo.map((wallInfo) => (
        <WallOverlay
            key={wallInfo.id}
            wallId={wallInfo.id}
            viewerId={viewerId}
            onPointerDown={onWallPointerDown}
            onPointerUp={onWallPointerUp}
            isBeingDragged={draggingWallId === wallInfo.id}
            isInteractive={!draggingObjectId && !draggingVertexId}
            nodeEditingEnabled={flags.RoomBuilderNodeEditing}
            showDimensions={!areWallsMutated || dragAffectedWalls.includes(wallInfo.id)}
            forceShowTooltip={dragAffectedWalls.includes(wallInfo.id)}
        />
    ))

    const vertexOverlays = verticesInfo.map((vertexInfo) => 
        <VertexOverlay
            key={vertexInfo.id}
            vertexId={vertexInfo.id}
            viewerId={viewerId}
            interactive={flags.RoomBuilderNodeEditing}
            isDragging={vertexDragInProgress}
            onPointerDown={onVertexPointerDown}
            onPointerUp={onVertexPointerUp}
        />)

    const elementOverlays = elementsInfo.map((elementInfo) => (
        <WallElementOverlay
            key={elementInfo.elementId}
            elementId={elementInfo.elementId}
            viewerId={viewerId}
            onPointerDown={onWallElementPointerDown}
            onPointerOver={onWallElementPointerOver}
            onPointerLeave={onWallElementPointerLeave}
            step={step}
        />
    ))

    const itemsOverlays = compositionItemsInfo.map((itemInfo) =>
        <CompositionItemOverlay
            key={itemInfo.itemId}
            itemId={itemInfo.itemId}
            viewerId={viewerId}
        />
    )

    const angleLines = draggingVertexSnapInfo.angleSnapsPixels.flatMap(pair => [pair.line1, pair.line2])
    const parallelLines = draggingVertexSnapInfo.parallelSnapsPixels.flatMap(pair => [pair.line1, pair.line2])
    const mergedSnapState = deduplicateAndMergeLines([
        ...draggingVertexSnapInfo.snapLinesPixels,
        ...draggingWallSnapInfo.snapLinesPixels,
        ...angleLines,
        ...parallelLines,
    ])
    const snapLines = mergedSnapState
        .map(line => <SnapLine key={`${line.p1.x}-${line.p1.y}-${line.p2.x}-${line.p2.y}`} line={line} />)
    const angleDivs = draggingVertexSnapInfo.angleSnapsPixels
        .filter(snap => !snap.isOnVertex)
        .map((snap) =>
            <SnapAngle
                key={`a-${snap.line1.p1.x}-${snap.line1.p1.y}-${snap.line1.p2.x}-${snap.line1.p2.y}`}
                line1={snap.line1}
                line2={snap.line2}
            />)
    const parallelDivs = draggingVertexSnapInfo.parallelSnapsPixels.map((snap) =>
        <SnapParallel
            key={`p-${snap.line1.p1.x}-${snap.line1.p1.y}-${snap.line1.p2.x}-${snap.line1.p2.y}`}
            line1={snap.line1}
            line2={snap.line2}
        />)

    return (
        <div
            className={classNames('PlannerViewerOverlay', { isBeingDragged })}
            ref={parentRef}
        >
            {!isLoading && showWallElementOverlays && elementOverlays}
            {!isLoading && showWallOverlays && wallOverlays}
            {!isLoading && showWallOverlays && vertexOverlays}
            {!isLoading && itemsOverlays}
            {!isLoading && snapLines}
            {!isLoading && angleDivs}
            {!isLoading && parallelDivs}
        </div>
    )
}
