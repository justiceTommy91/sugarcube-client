/* eslint-disable i18next/no-literal-string */
import { useCallback, useRef } from 'react'
import { removeById } from '../SceneItemManager'
import type { SceneItemManager } from '../SceneItemManager'
import type { ProductFamily } from '../types'

export type VariantSwapDeps = {
    manager: SceneItemManager
    animateRef: (ref: React.MutableRefObject<number>, target: number, onDone?: () => void) => void
    callUpdateItems: () => void
    curItemRef: React.MutableRefObject<number>
    curSceneId: React.MutableRefObject<string>
    variantIndexRef: React.MutableRefObject<number>
    placementRef: React.MutableRefObject<import('@gatsby/Renderer/geomviewer/geom_types').Placement | null>
    families: ProductFamily[]
    setVariantIndex: (idx: number) => void
}

export function useVariantSwap(deps: VariantSwapDeps) {
    const {
        manager,
        animateRef,
        callUpdateItems,
        curItemRef,
        curSceneId,
        variantIndexRef,
        placementRef,
        families,
        setVariantIndex,
    } = deps

    const variantSwapValue = useRef(0)
    const variantSwapDirection = useRef<-1 | 0 | 1>(0)
    const variantSwapTargetIdx = useRef(-1)
    const activeSwapSceneId = useRef<string | null>(null)

    const cleanupVariantSwap = useCallback(() => {
        if (activeSwapSceneId.current) {
            removeById(activeSwapSceneId.current)
            activeSwapSceneId.current = null
        }
        variantSwapValue.current = 0
        variantSwapDirection.current = 0
        variantSwapTargetIdx.current = -1
    }, [])

    // Creates the swap scene item on the first vertical drag tick.
    const startVariantSwap = useCallback(
        (normalized: number) => {
            const curFamily = families[manager.wrapIdx(curItemRef.current)]
            if (curFamily.variants.length <= 1) return

            if (variantSwapDirection.current === 0) {
                const dir: -1 | 1 = normalized > 0 ? 1 : -1
                const count = curFamily.variants.length
                const targetIdx = manager.wrapVariantIdx(variantIndexRef.current + dir, count)

                const p = placementRef.current
                if (!p) return
                const cur = curItemRef.current
                const swapId = manager.nextSwapId()
                manager.addItem(cur, p, { variantIdx: targetIdx, hidden: true, itemId: swapId })
                activeSwapSceneId.current = swapId

                variantSwapDirection.current = dir
                variantSwapTargetIdx.current = targetIdx
            }

            variantSwapValue.current = normalized
            callUpdateItems()
        },
        [families, manager, curItemRef, variantIndexRef, placementRef, callUpdateItems],
    )

    const handleVariantSwipeCommit = useCallback(
        (direction: -1 | 0 | 1) => {
            if (variantSwapDirection.current === 0) return

            const swapId = activeSwapSceneId.current
            if (!swapId) return

            if (direction === 0) {
                animateRef(variantSwapValue, 0, () => {
                    removeById(swapId)
                    activeSwapSceneId.current = null
                    variantSwapDirection.current = 0
                    variantSwapTargetIdx.current = -1
                })
            } else {
                animateRef(variantSwapValue, variantSwapDirection.current, () => {
                    const newVariantIdx = variantSwapTargetIdx.current

                    removeById(curSceneId.current)
                    curSceneId.current = swapId
                    activeSwapSceneId.current = null

                    variantSwapValue.current = 0
                    variantSwapDirection.current = 0
                    variantSwapTargetIdx.current = -1

                    variantIndexRef.current = newVariantIdx
                    setVariantIndex(newVariantIdx)
                    callUpdateItems()
                })
            }
        },
        [animateRef, callUpdateItems, curSceneId, variantIndexRef, setVariantIndex],
    )

    return {
        variantSwapValue,
        variantSwapDirection,
        activeSwapSceneId,
        handleVariantSwipeCommit,
        startVariantSwap,
        cleanupVariantSwap,
    }
}
