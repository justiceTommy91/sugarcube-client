import { useCallback } from 'react'
import { GeomViewer } from 'Renderer/geomviewer'
import { useAppDispatch } from 'hooks'
import {
    deleteCompositionRenderItem,
    updateCompositionRenderItem,
    selectCompositionRenderItem,
    startDragRenderItem,
    stopDragRenderItem,
    duplicateRenderItem as duplicateRenderItemAction,
    enableMirrorOption,
} from 'models/compositions/actions'
import { openDesignSidepanel, showMissingWallsModal as showMissingWallsModalAction } from 'models/ui/actions'
import { selectFurniture } from 'models/furniture/actions'
import { trackSnapRotateClick as trackSnapRotateClickAction } from 'models/tracking/actions'
import { debugConsoleLog as debugConsoleLogAction } from 'models/admin/actions'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'
import type { RenderItemComplete } from 'models/compositions'
import type { ExtendedRenderItem, ExtendedFurnitureItem } from './types'
import { createTrackingInfo } from './utils'

export function useRenderItemActions(renderItem: ExtendedRenderItem, compositionId: string) {
    const dispatch = useAppDispatch()

    const selectRenderItem = useCallback(
        (e?: React.MouseEvent | null, idParams?: { uniqueId: number; id: number } | null) => {
            e?.stopPropagation()
            const uniqueId = idParams?.uniqueId ?? renderItem.uniqueId
            const id = idParams?.id ?? renderItem.id
            GeomViewer.bindings?.selectSceneItem(String(uniqueId))
            dispatch(selectCompositionRenderItem(uniqueId))
            dispatch(selectFurniture(id))
        },
        [dispatch, renderItem.uniqueId, renderItem.id],
    )

    const removeRenderItem = useCallback(
        (removedFrom: string) => {
            const trackingInfo = createTrackingInfo(renderItem, { RemovedFrom: removedFrom })
            dispatch(deleteCompositionRenderItem(compositionId, renderItem.uniqueId, trackingInfo))
        },
        [dispatch, compositionId, renderItem],
    )

    const updateRenderItem = useCallback(
        (item: Partial<RenderItemComplete>) => {
            const extras: Record<string, unknown> = { hidden: renderItem.hidden }
            if ('x' in item || 'y' in item) {
                extras.OriginalPosition = { x: renderItem.x, y: renderItem.y }
                extras.FinalPosition = { x: item.x, y: item.y }
            }
            if ('heading' in item) {
                extras.OriginalOrientation = renderItem.heading
                extras.FinalOrientation = item.heading
            }
            const trackingInfo = createTrackingInfo(renderItem, extras)
            dispatch(updateCompositionRenderItem(compositionId, renderItem.uniqueId, item, trackingInfo))
        },
        [dispatch, compositionId, renderItem],
    )

    const openSettings = useCallback(
        (accessFrom: string) => {
            const { id, uniqueId } = renderItem
            dispatch(selectCompositionRenderItem(uniqueId))
            dispatch(selectFurniture(id))
            dispatch(openDesignSidepanel(uniqueId, createTrackingInfo(renderItem, { AccessFrom: accessFrom })))
        },
        [dispatch, renderItem],
    )

    const duplicateRenderItem = useCallback(() => {
        const { uniqueId, renderType } = renderItem
        const trackingInfo = createTrackingInfo(renderItem, { AddedFrom: TRACKING_ADDED_FROM.DUPLICATE })
        dispatch(duplicateRenderItemAction(uniqueId, renderType, trackingInfo))
    }, [dispatch, renderItem])

    const mirrorRenderItem = useCallback(() => {
        const mirrorEnabled = (renderItem as ExtendedFurnitureItem).mirrorOptionEnabled
        dispatch(enableMirrorOption(compositionId, renderItem.uniqueId, !mirrorEnabled))
    }, [dispatch, compositionId, renderItem])

    const trackSnapRotateClick = useCallback(() => {
        const trackingInfo = createTrackingInfo(renderItem, { AddedFrom: TRACKING_ADDED_FROM.SNAP_ROTATE })
        dispatch(trackSnapRotateClickAction(trackingInfo))
    }, [dispatch, renderItem])

    const showMissingWallsModal = useCallback(() => dispatch(showMissingWallsModalAction()), [dispatch])
    const debugConsoleLog = useCallback((cat: string, msg: string) => dispatch(debugConsoleLogAction(cat, msg)), [dispatch])
    const onDragStart = useCallback(() => dispatch(startDragRenderItem(renderItem.uniqueId)), [dispatch, renderItem.uniqueId])
    const onDragFinish = useCallback(() => dispatch(stopDragRenderItem()), [dispatch])

    return {
        selectRenderItem,
        removeRenderItem,
        updateRenderItem,
        openSettings,
        duplicateRenderItem,
        mirrorRenderItem,
        trackSnapRotateClick,
        showMissingWallsModal,
        debugConsoleLog,
        onDragStart,
        onDragFinish,
    }
}
