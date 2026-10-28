import { useMemo } from 'react'
import { useRenderItems } from '@gatsby/Renderer/ui/hooks/useRenderItems'
import { useSceneContext } from '../SceneContext'
import type { FurnitureSearchItem } from './useKreativLiteSearch'

type ExportedItem = { itemId?: string }

export type RoomProduct = FurnitureSearchItem & { sceneItemId: string }

/** Returns the list of products currently in the scene, in render order. */
export function useRoomProducts(): RoomProduct[] {
    const { roomProductsById } = useSceneContext()
    const renderItems = useRenderItems()

    return useMemo(
        () =>
            (renderItems ?? []).flatMap((renderItem) => {
                const itemId = (renderItem as typeof renderItem & ExportedItem).itemId ?? ''
                const product = roomProductsById.get(itemId)
                return product ? [{ ...product, sceneItemId: itemId }] : []
            }),
        [renderItems, roomProductsById],
    )
}
