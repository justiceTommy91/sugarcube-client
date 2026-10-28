import { useCallback } from 'react'
import { GeomViewer } from '@gatsby/Renderer/geomviewer'
import type { SceneInfo } from '@gatsby/Renderer/geomviewer/geom_types'
import { furniturePropsToFurnitureItemParams } from '@gatsby/utils/geomviewer_utils'
import { placeSingle, buildPlacementFromSmartaResponse, isSmartaError } from '@astro-services/smartaService'
import { nextSceneItemId } from './sceneItemIds'
import type { FurnitureSearchItem } from './useKreativLiteSearch'
import type { FurnitureApiProduct } from '../../../services/kreativLiteFurnitureService'
import type { SceneItemTracker } from './useSceneItemTracker'
import type { SceneContextValue } from '../SceneContext'

const SMARTA_TIMEOUT_MS = 3000

interface UseAddFurnitureToSceneOptions {
    tracker: SceneItemTracker
    scheduleCombinable: SceneContextValue['scheduleCombinable']
    /** The current scene. Smarta requires a GLTF manifest; if absent, smarta is skipped. */
    scene: SceneInfo
}

/**
 * Handles adding a furniture item to the 3D scene.
 *
 * When the product supports autodecorate, calls the smarta AI placement API.
 * Falls back to default viewer placement if smarta is unavailable or times out.
 * Combinable children (duvet, pillow, mattress, etc.) are scheduled via
 * `scheduleCombinable` from `useCombinablePlacer` and placed automatically
 * when the parent fires its `ItemReady` event.
 */
export function useAddFurnitureToScene({ tracker, scheduleCombinable, scene }: UseAddFurnitureToSceneOptions) {
    const { sceneId } = scene
    const addItem = useCallback(
        async (
            item: FurnitureSearchItem,
            combinablesDefaultProductsById: Map<string, FurnitureApiProduct>,
        ): Promise<string | undefined> => {
            if (!item.modelUrl) return undefined
            let itemOptions
            try {
                itemOptions = furniturePropsToFurnitureItemParams(item)
            } catch {
                return undefined
            }
            const uniqueId = nextSceneItemId()

            // Register the item in the tracker before calling smarta so it exists in the map
            // when updatePlacementFromSmarta is called with the response data.
            tracker.registerItem(uniqueId, Number(item.id), item.localItemNumber, {
                additionalContacts: [],
                stackedPlane: undefined,
                mirrorOptionEnabled: false,
                artData: {},
                placingBehavior: item.placingBehavior,
            })

            // Smarta requires a 3D GLTF room manifest — skip if the scene doesn't have one.
            let smartaPlacement: ReturnType<typeof buildPlacementFromSmartaResponse> | undefined
            let smartaAnchorCombinationIndex: number | undefined
            if (item.isSupportedAutodecorate && scene.gltfManifest) {
                const abortController = new AbortController()
                const timeoutId = setTimeout(() => abortController.abort(), SMARTA_TIMEOUT_MS)
                try {
                    const response = await placeSingle(
                        {
                            sceneId,
                            placedFurniture: tracker.getPlacedFurniture(),
                            localProductIdToPlace: Number(item.id),
                            localItemNumberToPlace: item.localItemNumber,
                            savedProperties: tracker.getSavedProperties(),
                        },
                        abortController.signal,
                    )
                    if (!isSmartaError(response)) {
                        smartaPlacement = buildPlacementFromSmartaResponse(response.placedFurniture)
                        const pf = response.placedFurniture
                        tracker.updatePlacementFromSmarta(uniqueId, {
                            x: pf.x,
                            y: pf.y,
                            z: pf.z,
                            heading: pf.heading,
                            headingI: pf.headingI,
                            headingJ: pf.headingJ,
                            headingK: pf.headingK,
                            parentAttachment: pf.parentAttachment,
                            parentId: pf.parentId,
                            anchorCombinationIndex: pf.gfxAttributes?.anchorCombinationIndex,
                        })

                        smartaAnchorCombinationIndex = pf.gfxAttributes?.anchorCombinationIndex

                        // Compute stackedPlane from parentId + parentAttachment so the
                        // viewer knows which surface the item is placed on.
                        const numParentId = parseInt(pf.parentId, 10)
                        const isParentSurface = pf.parentId === 'SURFACE'
                        const isParentFurniture = !isParentSurface && !Number.isNaN(numParentId)
                        const surfaceParent = isParentSurface ? `${pf.parentAttachment}` : undefined
                        const computedStackedPlane = isParentFurniture
                            ? `${pf.parentId}${pf.parentAttachment}`
                            : surfaceParent

                        // Rebuild itemOptions with smarta-enriched data so ALL derived
                        // properties are correct — especially placingBehaviorHint which
                        // depends on anchorCombinationIndex to determine wall vs floor
                        // placement. In Gatsby, furniturePropsToFurnitureItemParams is
                        // called with the enriched renderItem; here we must re-call it.
                        itemOptions = furniturePropsToFurnitureItemParams({
                            ...item,
                            smartaPlacement,
                            ...(smartaAnchorCombinationIndex !== undefined && {
                                anchorCombinationIndex: smartaAnchorCombinationIndex,
                            }),
                            ...(computedStackedPlane && { stackedPlane: computedStackedPlane }),
                        })
                    }
                } catch {
                    // Smarta unavailable or timed out — fall through to default placement
                } finally {
                    clearTimeout(timeoutId)
                }
            }

            // When smarta didn't provide a placement for a stackable item, skip placement
            // mode so the item is auto-placed on the floor via getRoomDefaultPlacement().
            if (!smartaPlacement && itemOptions.canStack) {
                itemOptions.hasSmartaPlacement = true
            }

            GeomViewer.bindings?.addSceneItem(uniqueId, {
                itemKind: `furniture-item` as const,
                itemOptions,
                placement: smartaPlacement,
                ...(smartaAnchorCombinationIndex !== undefined && {
                    currentSnapRotationIndex: smartaAnchorCombinationIndex,
                }),
            })

            tracker.markDirty()

            // Schedule combinable children (duvet, pillow, mattress, etc.) to be placed
            // automatically once the parent item fires its ItemReady event.
            scheduleCombinable(uniqueId, item, combinablesDefaultProductsById)

            return uniqueId
        },
        [sceneId, tracker, scheduleCombinable, scene],
    )

    return { addItem }
}
