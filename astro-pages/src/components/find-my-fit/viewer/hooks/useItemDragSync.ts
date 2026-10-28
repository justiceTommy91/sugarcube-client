import { useEffect, useRef } from 'react'
import {
    NOTIFY_SCENE_ITEM_UPDATE,
} from '@gatsby/Renderer/geomviewer'
import type {
    SceneItemUpdateNotification,
    NotificationObserver,
} from '@gatsby/Renderer/geomviewer'
import type { Placement, PointXYZ } from '@gatsby/Renderer/geomviewer/geom_types'
import { getGrandCentral } from '@gatsby/Renderer/GrandCentral'
import { gvCurrentScene } from '@gatsby/Renderer/foundation/geom_app'
import { isFurnitureItem3D } from '@gatsby/Renderer/rendering/scene_utils'
import { allCornersOutsideUnitRect } from '../resizeMath'

const DRAG_ECHO_EPSILON_M = 1e-5

/**
 * When a selected item's placement changes in viewing mode:
 *  - If the item's screen-space AABB lies fully outside the viewport, reset
 *    it to the placement it had when first selected.
 *  - Otherwise, call shiftBy with the item's world-space delta so the editor
 *    can move the bounding box to follow.
 */
export function useItemDragSync(
    selectedItemId: string | null,
    isViewing: boolean,
    shiftBy: (worldDelta: PointXYZ) => void,
): void {
    const savedPlacementRef = useRef<Placement | null>(null)
    const shiftByRef = useRef(shiftBy)
    shiftByRef.current = shiftBy

    // Capture the item's placement when it first becomes selected.
    useEffect(() => {
        if (!selectedItemId || !isViewing) {
            savedPlacementRef.current = null
            return
        }
        const scene = gvCurrentScene()
        const renderItem = scene?.getRenderItem(selectedItemId)
        if (renderItem && isFurnitureItem3D(renderItem)) {
            savedPlacementRef.current = renderItem.getPlacement()
        }
    }, [selectedItemId, isViewing])

    // Subscribe to ItemPlacement notifications for the selected item. These
    // fire at the end of a drag (and on other placement changes), not every
    // frame during a drag.
    useEffect(() => {
        if (!selectedItemId || !isViewing) return undefined

        const gc = getGrandCentral()

        const observer = (notification: SceneItemUpdateNotification) => {
            if (notification.payload.stateInfo !== 'ItemPlacement') return
            if (notification.payload.itemId !== selectedItemId) return

            const saved = savedPlacementRef.current
            if (!saved) return

            const scene = gvCurrentScene()
            const renderItem = scene?.getRenderItem(selectedItemId)
            if (!renderItem || !isFurnitureItem3D(renderItem)) return

            // Out-of-bounds? Reset the item to its original placement.
            const corners = renderItem.getCorners()
            if (corners.length > 0 && allCornersOutsideUnitRect(corners)) {
                renderItem.setPlacement(saved)
                scene?.setIsDirty(true)
                return
            }

            // Sync the bbox to the item's new position.
            const savedPos = saved.location3.localPos
            const newPos = renderItem.getPlacement().location3.localPos
            const worldDelta: PointXYZ = {
                x: newPos.x - savedPos.x,
                y: newPos.y - savedPos.y,
                z: newPos.z - savedPos.z,
            }
            // Skip echoes from setPlacement and floating-point noise.
            if (Math.abs(worldDelta.x) < DRAG_ECHO_EPSILON_M
                && Math.abs(worldDelta.y) < DRAG_ECHO_EPSILON_M
                && Math.abs(worldDelta.z) < DRAG_ECHO_EPSILON_M) {
                return
            }
            shiftByRef.current(worldDelta)
            // Advance the baseline so subsequent drags deliver incremental deltas.
            savedPlacementRef.current = renderItem.getPlacement()
        }

        gc.addObserver(NOTIFY_SCENE_ITEM_UPDATE, observer as NotificationObserver)
        return () => gc.removeObserver(observer as NotificationObserver)
    }, [selectedItemId, isViewing])
}
