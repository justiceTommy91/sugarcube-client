import { useEffect } from 'react'
import { GeomViewer, NOTIFY_VIEWER_STATE_UPDATE } from '@gatsby/Renderer/geomviewer'
import type { ViewerStateUpdateNotification, NotificationObserver } from '@gatsby/Renderer/geomviewer'
import { getGrandCentral } from '@gatsby/Renderer/GrandCentral'
import type { Placement } from '@gatsby/Renderer/geomviewer/geom_types'
import { furniturePropsToFurnitureItemParams } from '@gatsby/utils/geomviewer_utils'
import type { CompositionRestoreItem } from '@astro-services/compositionService'
import type { FurnitureApiProduct } from '../../../services/kreativLiteFurnitureService'
import { normalizeFurnitureItem } from '../utils/normalizeFurnitureItem'
import type { SceneItemTracker } from './useSceneItemTracker'
import type { SceneContextValue } from '../SceneContext'
import type { FurnitureSearchItem } from './useKreativLiteSearch'

// eslint-disable-next-line i18next/no-literal-string
const PLACEMENT_KIND_LOCATION3_LEGACY = 'location3Legacy' as const
// eslint-disable-next-line i18next/no-literal-string
const ITEM_KIND_FURNITURE = 'furniture-item' as const

/** If WallDataReady has not fired after this many ms, restore items anyway as a fallback. */
const WALL_DATA_READY_TIMEOUT_MS = 10_000

/**
 * Restores scene items from a saved composition's `restoreItems` list.
 * Called when the page loads with a `?compositionId=` URL parameter.
 *
 * Uses `item.product` for normalization and `item.placement` for positioning.
 * Combinable children are re-placed automatically via `scheduleCombinable`.
 */
interface UseCompositionRestoreOptions {
    restoreItems: CompositionRestoreItem[]
    tracker: SceneItemTracker
    scheduleCombinable: SceneContextValue['scheduleCombinable']
    registerItemProduct: (uniqueId: string, item: FurnitureSearchItem) => void
    supplementalCombinableProducts?: ReadonlyMap<string, FurnitureApiProduct>
}

export function useCompositionRestore({
    restoreItems,
    tracker,
    scheduleCombinable,
    registerItemProduct,
    supplementalCombinableProducts,
}: UseCompositionRestoreOptions): void {
    useEffect(() => {
        const addItems = () => {
            restoreItems.forEach((item) => {
                const normalized = normalizeFurnitureItem(item.product)
                registerItemProduct(item.uniqueId, normalized)
                let itemOptions
                try {
                    itemOptions = furniturePropsToFurnitureItemParams(normalized)
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn(
                        '[useCompositionRestore] furniturePropsToFurnitureItemParams failed for',
                        item.uniqueId,
                        err,
                    )
                    return
                }

                const { parentId, parentAttachment } = item.placement
                const isDynamicStacked = parentId !== null && parentId !== 'SURFACE' && parentAttachment !== undefined
                if (isDynamicStacked) {
                    itemOptions.stackOnSurfaceId = `${parentId}${String(parentAttachment)}`
                }

                const { x, y, z, heading, headingI, headingJ, headingK } = item.placement
                const placement: Placement = {
                    kind: PLACEMENT_KIND_LOCATION3_LEGACY,
                    location3: {
                        bindTo: String(parentAttachment ?? ''),
                        localPos: { x, y, z },
                    },
                    rotation: [headingI, headingJ, headingK, heading],
                    parentId: parentId ?? undefined,
                } as Placement

                const result = GeomViewer.bindings?.addSceneItem(item.uniqueId, {
                    itemKind: ITEM_KIND_FURNITURE,
                    itemOptions,
                    placement,
                    currentSnapRotationIndex: item.gfxAttributes?.anchorCombinationIndex,
                })
                if (result && !result.ok) {
                    // eslint-disable-next-line no-console
                    console.warn('[useCompositionRestore] addSceneItem failed for', item.uniqueId, result.errorMsg)
                    return
                }

                tracker.registerItem(item.uniqueId, item.furnitureId, item.localItemNumber, {
                    additionalContacts: item.gfxAttributes?.additionalContacts ?? [],
                    stackedPlane: undefined,
                    mirrorOptionEnabled: item.gfxAttributes?.mirrorOptionEnabled ?? false,
                    artData: item.gfxAttributes?.artData ?? {},
                    placingBehavior: item.product.placingBehavior,
                })

                scheduleCombinable(
                    item.uniqueId,
                    normalized,
                    supplementalCombinableProducts,
                )
            })
        }

        const gc = getGrandCentral()
        let settled = false
        let observer: (notification: ViewerStateUpdateNotification) => void
        let timeoutId: ReturnType<typeof setTimeout>
        const settle = () => {
            if (settled) return
            settled = true
            gc.removeObserver(observer as NotificationObserver)
            clearTimeout(timeoutId)
            addItems()
        }
        observer = (notification: ViewerStateUpdateNotification) => {
            if (notification.payload.stateInfo !== 'WallDataReady') return
            settle()
        }
        // Fallback: if WallDataReady never fires (e.g. scene load failure), restore
        // items after a timeout so the user isn't silently left with an empty room.
        timeoutId = setTimeout(settle, WALL_DATA_READY_TIMEOUT_MS)
        gc.addObserver(NOTIFY_VIEWER_STATE_UPDATE, observer as NotificationObserver)

        return () => {
            settled = true
            gc.removeObserver(observer as NotificationObserver)
            clearTimeout(timeoutId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // intentionally run only on mount
}
