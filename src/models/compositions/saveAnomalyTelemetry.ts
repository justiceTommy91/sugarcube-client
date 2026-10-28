import * as Sentry from '@sentry/react'

import * as tracker from 'utils/tracker'
import type { CompositionDataItem, CompositionSaveType, RenderItem } from 'models/compositions'
import { getCompositionItemMismatchPayload, getRenderedItemCountForSave } from 'models/compositions/helpers'

const SENTRY_CATEGORY = 'composition.placement-loss'
const TRACKING_PREFIX = 'Decorate.Composition.PlacementDebug'
const SAVE_ABORTED_EVENT = 'Decorate.Composition.SaveAborted.EmptyPlacement'

type RenderItemMap = Record<number, RenderItem | undefined>

export type PlacementClobberSource =
    | 'resetCompositionToLatestSavedState'
    | 'loadCompositionFromLocalStorage'
    | 'receiveSaveComposition.isNewScene'

const countItemsWithPlacement = (renderItems: RenderItemMap | undefined): number => {
    if (!renderItems) return 0
    return Object.values(renderItems).reduce((count, item) => count + (item?.placement ? 1 : 0), 0)
}

const firstNIds = (renderItems: RenderItemMap | undefined, n = 10): string[] => {
    if (!renderItems) return []
    return Object.keys(renderItems).slice(0, n)
}

// After receiving composition API response — tracks placement counts from the API data.
export const trackApiResponsePlacement = (compositionId: string, apiRenderItems: RenderItemMap | undefined): void => {
    const totalCount = apiRenderItems ? Object.keys(apiRenderItems).length : 0
    const withPlacement = countItemsWithPlacement(apiRenderItems)

    if (totalCount === 0 || withPlacement === 0) {
        tracker.track(`${TRACKING_PREFIX}.ApiResponse`, {
            compositionId,
            totalItemCount: totalCount,
            itemsWithPlacement: withPlacement,
            sampleIds: firstNIds(apiRenderItems),
        })
    }
}

// After Redux state update — tracks placement count now in the Redux store.
export const trackReduxStatePlacement = (
    source: string,
    compositionId: string,
    storeRenderItems: RenderItemMap | undefined,
): void => {
    const totalCount = storeRenderItems ? Object.keys(storeRenderItems).length : 0
    const withPlacement = countItemsWithPlacement(storeRenderItems)

    if (totalCount === 0 || withPlacement === 0) {
        tracker.track(`${TRACKING_PREFIX}.ReduxUpdate`, {
            source,
            compositionId,
            totalItemCount: totalCount,
            itemsWithPlacement: withPlacement,
            sampleIds: firstNIds(storeRenderItems),
        })
    }
}

// Before serialization — tracks placement count from the source renderItems map.
export const trackPreSerialization = (
    compositionId: string,
    renderItems: RenderItemMap | undefined,
    needs3DSaveData: boolean,
): void => {
    const totalCount = renderItems ? Object.keys(renderItems).length : 0
    const withPlacement = countItemsWithPlacement(renderItems)

    if (withPlacement === 0 || withPlacement !== totalCount) {
        tracker.track(`${TRACKING_PREFIX}.PreSerialization`, {
            compositionId,
            totalItemCount: totalCount,
            itemsWithPlacement: withPlacement,
            needs3DSaveData,
            sampleIds: firstNIds(renderItems),
        })
    }
}

// After serialization — compares input renderItems count to serialized output count.
export const trackPostSerialization = (
    compositionId: string,
    inputItemCount: number,
    outputItemCount: number,
    needs3DSaveData: boolean,
): void => {
    if (outputItemCount === 0 || inputItemCount !== outputItemCount) {
        tracker.track(`${TRACKING_PREFIX}.PostSerialization`, {
            compositionId,
            inputItemCount,
            outputItemCount,
            needs3DSaveData,
            itemsDropped: inputItemCount - outputItemCount,
        })
    }
}

// Before PUT save request — tracks final payload placement count.
export const trackPreSavePayload = (
    compositionId: string,
    placedFurnitureCount: number,
    renderItemCount: number,
): void => {
    if (placedFurnitureCount === 0 || placedFurnitureCount !== renderItemCount) {
        tracker.track(`${TRACKING_PREFIX}.PreSave`, {
            compositionId,
            placedFurnitureCount,
            renderItemCount,
        })

        if (placedFurnitureCount === 0 && renderItemCount > 0) {
            Sentry.addBreadcrumb({
                category: SENTRY_CATEGORY,
                level: 'error',
                message: 'About to PUT with 0 placedFurniture despite non-empty renderItems',
                data: { compositionId, renderItemCount },
            })
        }
    }
}

// Double-save detection — fires when two saves happen within a short window.
let lastSaveTimestamp = 0
let lastSaveCompositionId = ''

export const trackDoubleSave = (compositionId: string, windowMs = 2000): void => {
    const now = Date.now()
    const elapsed = now - lastSaveTimestamp

    if (lastSaveTimestamp > 0 && elapsed < windowMs && lastSaveCompositionId === compositionId) {
        tracker.track(`${TRACKING_PREFIX}.DoubleSave`, {
            compositionId,
            elapsedMs: elapsed,
            windowMs,
        })

        Sentry.addBreadcrumb({
            category: SENTRY_CATEGORY,
            level: 'warning',
            message: `Double save detected within ${elapsed}ms`,
            data: { compositionId, elapsedMs: elapsed },
        })
    }

    lastSaveTimestamp = now
    lastSaveCompositionId = compositionId
}

// Records a breadcrumb whenever live renderItems are about to be replaced with API-derived
// items that have no `placement` field. Investigating long-standing prod bug where the next
// save in a 3D-GLTF scene ships placedFurniture: [].
export const recordPlacementClobber = (
    source: PlacementClobberSource,
    compositionId: string,
    liveRenderItems: RenderItemMap | undefined,
): void => {
    const liveItemCount = liveRenderItems ? Object.keys(liveRenderItems).length : 0
    if (liveItemCount === 0) return

    const itemsWithPlacement = countItemsWithPlacement(liveRenderItems)

    Sentry.addBreadcrumb({
        category: SENTRY_CATEGORY,
        level: 'warning',
        message: `Replacing live renderItems with API-derived items via ${source}`,
        data: {
            source,
            compositionId,
            liveItemCount,
            itemsWithPlacement,
        },
    })
}

// Fires only when a save attempt looks anomalous — render-item count mismatch, or the
// empty-payload special case where the save is about to ship placedFurniture: [] despite
// the user's composition having items. The Sentry capture inherits the recordPlacementClobber
// breadcrumbs so we can see *which* clobber path fired before the save.
export const detectCompositionSaveAnomaly = (compositionData: CompositionDataItem, productItemCount: number): void => {
    const renderedItemCount = getRenderedItemCountForSave(compositionData)
    const mismatchPayload = getCompositionItemMismatchPayload(compositionData.id, renderedItemCount, productItemCount)

    if (!mismatchPayload) return

    tracker.track('Decorate.Composition.ItemMismatch', mismatchPayload)

    if (mismatchPayload.isEmptyMismatch) {
        // WEBFS-902: the title-rename race is the only confirmed cause as of 2026-05-18. Capture
        // activeElement so we can fingerprint that path post-deploy — if the design-header title
        // input is focused at save time, the user had an uncommitted rename.
        const activeElement = typeof document !== 'undefined' ? document.activeElement : null
        Sentry.captureMessage('Empty placedFurniture in save with non-empty renderItems', {
            level: 'warning',
            tags: { bug: 'placement-loss' },
            extra: {
                compositionId: compositionData.id,
                liveItemCount: Object.keys(compositionData.renderItems).length,
                itemsWithPlacement: countItemsWithPlacement(compositionData.renderItems),
                pathname: typeof window !== 'undefined' ? window.location.pathname : null,
                hash: typeof window !== 'undefined' ? window.location.hash : null,
                activeElementTag: activeElement?.tagName ?? null,
                activeElementAriaLabel: activeElement?.getAttribute('aria-label') ?? null,
            },
        })
    }
}

// Called inside saveSelectedComposition right before the PUT/POST. If the composition
// has renderItems but the serialized save payload would ship placedFurniture: [],
// emits a rich Sentry capture (so we can identify which code path raced) and returns
// true. The caller is expected to use the return value to abort the save and dispatch
// failedSaveComposition so the destructive empty payload never reaches the server.
export const detectEmptyPlacementSaveAnomaly = (
    compositionData: CompositionDataItem,
    placedFurnitureCount: number,
    saveType: CompositionSaveType | undefined,
    trackingInfo: { SavedFrom?: string } | undefined,
): boolean => {
    const renderItemCount = Object.keys(compositionData.renderItems).length
    if (renderItemCount === 0 || placedFurnitureCount > 0) return false

    const activeElement = typeof document !== 'undefined' ? document.activeElement : null

    Sentry.captureMessage('Aborting save: empty placedFurniture with non-empty renderItems', {
        level: 'error',
        tags: { bug: 'placement-loss', action: 'save-aborted' },
        extra: {
            compositionId: compositionData.id,
            renderItemCount,
            itemsWithPlacement: countItemsWithPlacement(compositionData.renderItems),
            saveType: saveType ?? null,
            savedFrom: trackingInfo?.SavedFrom ?? null,
            pathname: typeof window !== 'undefined' ? window.location.pathname : null,
            hash: typeof window !== 'undefined' ? window.location.hash : null,
            activeElementTag: activeElement?.tagName ?? null,
            activeElementAriaLabel: activeElement?.getAttribute('aria-label') ?? null,
            sampleItemIds: Object.keys(compositionData.renderItems).slice(0, 10),
        },
    })

    tracker.track(SAVE_ABORTED_EVENT, {
        compositionId: compositionData.id,
        renderItemCount,
        saveType: saveType ?? null,
        savedFrom: trackingInfo?.SavedFrom ?? null,
    })

    return true
}
