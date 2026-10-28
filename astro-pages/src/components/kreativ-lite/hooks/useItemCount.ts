import { useMemo } from 'react'
import { useRenderItems } from '@gatsby/Renderer/ui/hooks/useRenderItems'
import { KREATIV_LITE_MOBILE_MAX_ITEMS } from '../constants'
import type { SceneItemTracker } from './useSceneItemTracker'

type ExportedItem = { itemId?: string; combinablePlacement?: { parentId?: unknown } }

/**
 * Returns whether the user has reached the maximum number of tracked scene items.
 * Only counts top-level items (excludes combinable children stacked on a parent).
 */
export function useItemCount(tracker: SceneItemTracker): { isAtLimit: boolean } {
    const renderItems = useRenderItems()
    const isAtLimit = useMemo(() => {
        const trackedIds = tracker.getTrackedUniqueIds()
        const userItemCount =
            renderItems?.filter((item) => {
                const ei = item as typeof item & ExportedItem
                return trackedIds.has(ei.itemId ?? '') && !ei.combinablePlacement?.parentId
            }).length ?? 0
        return userItemCount >= KREATIV_LITE_MOBILE_MAX_ITEMS
    }, [renderItems, tracker])

    return { isAtLimit }
}
