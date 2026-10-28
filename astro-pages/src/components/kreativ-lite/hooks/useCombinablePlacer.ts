import { useCallback, useEffect, useRef } from 'react'
import { GeomViewer, NOTIFY_SCENE_ITEM_UPDATE } from '@gatsby/Renderer/geomviewer'
import type { SceneItemUpdateNotification, NotificationObserver } from '@gatsby/Renderer/geomviewer'
import { getGrandCentral } from '@gatsby/Renderer/GrandCentral'
import { createMatrix4Elements } from '@gatsby/Renderer/geometry/utilities'
import { furniturePropsToFurnitureItemParams } from '@gatsby/utils/geomviewer_utils'
import { findSocketProductGeometry } from '@gatsby/models/furniture/helpers'
import type { APIProduct, ProductData, Socket, SocketSet } from '@gatsby/models/furniture'
import { normalizeFurnitureItem } from '../utils/normalizeFurnitureItem'
import type { FurnitureSearchItem } from './useKreativLiteSearch'
import type { FurnitureApiProduct } from '../../../services/kreativLiteFurnitureService'
import type { SceneContextValue } from '../SceneContext'
import { nextSceneItemId } from './sceneItemIds'

type PendingCombinableEntry = {
    sockets: Socket[]
    defaultProductsById: Map<string, FurnitureApiProduct>
    parentItem: FurnitureSearchItem
}

/**
 * Manages automatic placement of Morpheus combinable items (duvet, pillow, mattress, etc.)
 * on their parent items (bed frames) once the parent finishes loading in the renderer.
 *
 * Returns `scheduleCombinable` — call this after adding a parent item to the scene to
 * register its combinable children for placement when the parent fires its `ItemReady` event.
 *
 * Mirrors the Gatsby app's RECEIVE_FURNITURE_COMBINABLES middleware logic in
 * src/models/compositions/middleware.js and requestFurnitureCombinablesSaga.
 */
export function useCombinablePlacer(registerItemProduct: SceneContextValue['registerItemProduct']) {
    const pendingRef = useRef<Map<string, PendingCombinableEntry>>(new Map())

    useEffect(() => {
        const gc = getGrandCentral()
        const observer = (notification: SceneItemUpdateNotification) => {
            if (notification.payload.stateInfo !== 'ItemReady') return
            const parentUniqueId = notification.payload.itemId
            const entry = pendingRef.current.get(parentUniqueId)
            if (!entry) return
            pendingRef.current.delete(parentUniqueId)

            entry.sockets.forEach((socket) => {
                const product = entry.defaultProductsById.get(String(socket.defaultProductId))
                if (!product) return
                const normalized = normalizeFurnitureItem(product)
                let socketItemOptions
                try {
                    socketItemOptions = furniturePropsToFurnitureItemParams(normalized)
                } catch {
                    return
                }
                // Apply per-socket geometry override (e.g. duvet blanket vs pillow shape).
                // findSocketProductGeometry expects the Gatsby APIProduct shape; cast is unavoidable
                // since FurnitureApiProduct is a slim subset.
                const geom = findSocketProductGeometry(
                    socket.name,
                    product as unknown as APIProduct | ProductData,
                    entry.parentItem as unknown as APIProduct | ProductData,
                    entry.sockets,
                )
                if (geom) {
                    Object.assign(socketItemOptions, {
                        modelUrl: geom.modelUrl,
                        min: { x: geom.minX, y: geom.minY, z: geom.minZ },
                        max: { x: geom.maxX, y: geom.maxY, z: geom.maxZ },
                        scale: geom.scale,
                        rotX: geom.rotX,
                    })
                }
                socketItemOptions.combinablePlacement = {
                    parentId: parseInt(parentUniqueId, 10),
                    linkGroupName: socket.linkGroupName,
                    socketName: socket.name,
                    localTransform: createMatrix4Elements({ x: socket.x, y: socket.y, z: socket.z }, [
                        socket.headingI,
                        socket.headingJ,
                        socket.headingK,
                        socket.headingW,
                    ]),
                }
                const childId = nextSceneItemId()
                GeomViewer.bindings?.addSceneItem(childId, {
                    itemKind: `furniture-item`,
                    itemOptions: socketItemOptions,
                })
                registerItemProduct(childId, normalizeFurnitureItem(product))
            })
        }
        gc.addObserver(NOTIFY_SCENE_ITEM_UPDATE, observer as NotificationObserver)
        return () => gc.removeObserver(observer as NotificationObserver)
    }, [registerItemProduct])

    /**
     * Schedules combinable children for placement when the parent item fires `ItemReady`.
     * Call this immediately after `addSceneItem` for a parent that may have sockets.
     *
     * @param uniqueId       The uniqueId passed to `addSceneItem` for the parent item.
     * @param item           The normalized item (needs `combinablesDefaultSocketSet`,
     *                       `combinablesSocketSets`, `combinablesDefaultProducts`).
     * @param supplemental   Optional response-level products keyed by string ID — merged
     *                       with item-level `combinablesDefaultProducts` as a starting base,
     *                       matching the behaviour of the search response pipeline.
     */
    const scheduleCombinable = useCallback(
        (uniqueId: string, item: FurnitureSearchItem, supplemental?: ReadonlyMap<string, FurnitureApiProduct>) => {
            const socketSetName = item.combinablesDefaultSocketSet
            const socketSets = item.combinablesSocketSets as Array<SocketSet> | undefined
            if (!socketSetName || !socketSets) return
            const socketSet = socketSets.find((s) => s.name === socketSetName)
            if (!socketSet?.sockets?.length) return

            // Start with supplemental (response-level) products; item-level products
            // are added after, matching the merge order in the search placement path.
            const byId = new Map<string, FurnitureApiProduct>()
            supplemental?.forEach((p, key) => byId.set(key, p))
            const itemDefaults = item.combinablesDefaultProducts as FurnitureApiProduct[] | undefined
            itemDefaults?.forEach((p) => byId.set(String(p.id), p))
            if (byId.size === 0) return

            pendingRef.current.set(uniqueId, {
                sockets: socketSet.sockets,
                defaultProductsById: byId,
                parentItem: item,
            })
        },
        [],
    )

    return { scheduleCombinable }
}
