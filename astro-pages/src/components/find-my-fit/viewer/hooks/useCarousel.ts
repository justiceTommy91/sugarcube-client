import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Placement } from '@gatsby/Renderer/geomviewer/geom_types'
import type { DebugSettings } from '@gatsby/Renderer/geomviewer'
import {
    FMF_NAVIGATION_DIRECTION_NEXT,
    FMF_NAVIGATION_DIRECTION_PREVIOUS,
    FMF_NAVIGATION_METHOD_SWIPE,
    FMF_NAVIGATION_METHOD_PRODUCT_LIST,
    FMF_NAVIGATION_METHOD_VIEW_RESULTS,
} from '@lib/tracking/constants'
import { removeById, changeDebugSettings } from '../SceneItemManager'
import type { SceneItemManager } from '../SceneItemManager'
import type { SwipeConfig } from '../SwipeControl'
import type { ProductFamily, AnimParams, EasingFn } from '../types'
import { useAnimateRef } from './useAnimateRef'
import { useVariantSwap } from './useVariantSwap'
import { useSwipeBinding, type SwipeHandlers } from './useSwipeBinding'

export type CarouselState = {
    swipeValue: number
    variantSwapValue: number
    variantSwapDirection: -1 | 0 | 1
    curItemIndex: number
    curSceneId: string
    activeSwapSceneId: string | null
    // When a horizontal commit follows a variant swap, the sliding-away item's
    // scene ID differs from the canonical. This override lets the animation
    // position the correct item. Format: { id, direction } where direction is
    // the commit direction (1 = next, -1 = prev).
    slidingAwayOverride: { id: string; direction: 1 | -1 } | null
}

export type UpdateItemsFn = (state: CarouselState, manager: SceneItemManager) => void

export type OnProductViewedArgs = {
    familyIndex: number
    variantIndex: number
    totalResultCount: number
    navigationDirection: typeof FMF_NAVIGATION_DIRECTION_NEXT | typeof FMF_NAVIGATION_DIRECTION_PREVIOUS | null
    navigationMethod:
        | typeof FMF_NAVIGATION_METHOD_SWIPE
        | typeof FMF_NAVIGATION_METHOD_PRODUCT_LIST
        | typeof FMF_NAVIGATION_METHOD_VIEW_RESULTS
    families: ProductFamily[]
}

export type CarouselConfig = {
    manager: SceneItemManager
    families: ProductFamily[]
    isViewing: boolean
    placement: Placement | null
    animParams?: AnimParams
    easingFn?: EasingFn
    enableVariantSwipe?: boolean
    swipeConfig?: SwipeConfig
    updateItems: UpdateItemsFn
    onSwipe?: () => void
    onProductViewed?: (args: OnProductViewedArgs) => void
    // Base debug settings to restore when the carousel exits or resets. The two
    // internal changeDebugSettings calls below spread this instead of
    // defaultDebugSettings so scene-dependent flags set by useSceneSetup are
    // preserved across the reset.
    debugSettings: DebugSettings
}

export type CarouselControls = {
    familyIndex: number
    variantIndex: number
    swipeAreaRef: React.RefObject<HTMLDivElement>
    reset: (onAfterReset?: () => void) => void
    goNext: () => void
    goPrev: () => void
    changeVariant: (idx: number) => void
    goToFamily: (familyIdx: number, variantIdx?: number) => void
    currentSceneId: string
    isAnimating: boolean
}

export function useCarousel(config: CarouselConfig): CarouselControls {
    const { manager, families, isViewing, enableVariantSwipe = false, updateItems: updateItemsCallback } = config

    const swipeAreaRef = useRef<HTMLDivElement | null>(null)

    const [familyIndex, setFamilyIndex] = useState(0)
    const [variantIndex, setVariantIndex] = useState(0)

    const swipeValue = useRef(0)
    const curItemRef = useRef(0)
    const loadedItems = useRef(new Set<number>())
    const placementRef = useRef<Placement | null>(null)
    const variantIndexRef = useRef(0)
    const curSceneId = useRef('')
    const slidingAwayRef = useRef<{ id: string; direction: 1 | -1 } | null>(null)

    variantIndexRef.current = variantIndex

    // Stored in a ref so callUpdateItems closure stays stable across re-renders.
    const updateItemsRef = useRef(updateItemsCallback)
    updateItemsRef.current = updateItemsCallback

    const onSwipeRef = useRef(config.onSwipe)
    onSwipeRef.current = config.onSwipe

    const onProductViewedRef = useRef(config.onProductViewed)
    onProductViewedRef.current = config.onProductViewed

    const debugSettingsRef = useRef(config.debugSettings)
    debugSettingsRef.current = config.debugSettings

    const familiesRef = useRef(families)
    familiesRef.current = families

    // Populated after useVariantSwap so callUpdateItems can read swap state lazily.
    const variantSwapRefs = useRef<{
        variantSwapValue: React.MutableRefObject<number>
        variantSwapDirection: React.MutableRefObject<-1 | 0 | 1>
        activeSwapSceneId: React.MutableRefObject<string | null>
    } | null>(null)

    const callUpdateItems = useCallback(() => {
        const vs = variantSwapRefs.current
        const state: CarouselState = {
            swipeValue: swipeValue.current,
            variantSwapValue: vs?.variantSwapValue.current ?? 0,
            variantSwapDirection: vs?.variantSwapDirection.current ?? 0,
            curItemIndex: curItemRef.current,
            curSceneId: curSceneId.current,
            activeSwapSceneId: vs?.activeSwapSceneId.current ?? null,
            slidingAwayOverride: slidingAwayRef.current,
        }
        updateItemsRef.current(state, manager)
    }, [manager])

    const { animateRef, cancelAnimation, animationRef } = useAnimateRef(
        callUpdateItems,
        config.animParams,
        config.easingFn,
    )

    const variantSwap = useVariantSwap({
        manager,
        animateRef,
        callUpdateItems,
        curItemRef,
        curSceneId,
        variantIndexRef,
        placementRef,
        families,
        setVariantIndex,
    })

    variantSwapRefs.current = {
        variantSwapValue: variantSwap.variantSwapValue,
        variantSwapDirection: variantSwap.variantSwapDirection,
        activeSwapSceneId: variantSwap.activeSwapSceneId,
    }

    // Loads the current, next, and previous items into the scene for seamless swiping.
    const loadTriplet = useCallback(
        (idx: number, placement: Placement, opts?: { variantIdx?: number }) => {
            manager.addItem(idx, placement, { variantIdx: opts?.variantIdx, hidden: false })
            loadedItems.current.add(idx)
            if (families.length > 1) {
                manager.addItem(idx + 1, placement)
                loadedItems.current.add(idx + 1)
                manager.addItem(idx - 1, placement)
                loadedItems.current.add(idx - 1)
            }
        },
        [manager, families.length],
    )

    const removeAllItems = useCallback(() => {
        cancelAnimation()
        variantSwap.cleanupVariantSwap()
        const cur = curItemRef.current
        if (curSceneId.current && curSceneId.current !== manager.itemIdFor(cur)) {
            removeById(curSceneId.current)
        }
        curSceneId.current = manager.itemIdFor(cur)
        Array.from(loadedItems.current).forEach((idx) => manager.removeItem(idx))
        loadedItems.current.clear()
    }, [cancelAnimation, manager, variantSwap.cleanupVariantSwap])

    const prepareForIndex = useCallback(
        (prevIdx: number, newIdx: number, onSettle?: () => void) => {
            const p = placementRef.current
            if (!p) return
            const farIdx = prevIdx + (prevIdx > newIdx ? 1 : -1)
            if (loadedItems.current.has(farIdx)) {
                manager.removeItem(farIdx)
                loadedItems.current.delete(farIdx)
            }
            swipeValue.current += prevIdx > newIdx ? 1 : -1
            animateRef(swipeValue, 0, () => {
                const newAdjacentIdx = newIdx + (prevIdx > newIdx ? -1 : 1)
                if (!loadedItems.current.has(newAdjacentIdx)) {
                    manager.addItem(newAdjacentIdx, p)
                    loadedItems.current.add(newAdjacentIdx)
                }
                onSettle?.()
            })
        },
        [animateRef, manager],
    )

    const handleSwipeCommit = useCallback(
        (direction: -1 | 0 | 1) => {
            if (direction === 0) {
                animateRef(swipeValue, 0)
                return
            }
            onSwipeRef.current?.()

            const cur = curItemRef.current
            const variantSceneId =
                enableVariantSwipe && curSceneId.current !== manager.itemIdFor(cur) ? curSceneId.current : null

            if (enableVariantSwipe) {
                variantSwap.cleanupVariantSwap()
            }

            // If the current item was a variant, record its scene ID so the
            // animation can position it while it slides away.
            if (variantSceneId) {
                slidingAwayRef.current = { id: variantSceneId, direction: direction as 1 | -1 }
            }

            const newIdx = cur + direction
            curItemRef.current = newIdx
            curSceneId.current = manager.itemIdFor(newIdx)
            prepareForIndex(cur, newIdx, () => {
                // Clean up the variant after animation settles.
                if (slidingAwayRef.current) {
                    removeById(slidingAwayRef.current.id)
                    const p = placementRef.current
                    if (p) manager.addItem(cur, p)
                    slidingAwayRef.current = null
                }
                const wrappedIdx = manager.wrapIdx(newIdx)
                setFamilyIndex(wrappedIdx)
                variantIndexRef.current = 0
                setVariantIndex(0)
                onProductViewedRef.current?.({
                    familyIndex: wrappedIdx,
                    variantIndex: 0,
                    totalResultCount: familiesRef.current.length,
                    navigationDirection:
                        direction === 1 ? FMF_NAVIGATION_DIRECTION_NEXT : FMF_NAVIGATION_DIRECTION_PREVIOUS,
                    navigationMethod: FMF_NAVIGATION_METHOD_SWIPE,
                    families: familiesRef.current,
                })
            })
        },
        [animateRef, prepareForIndex, enableVariantSwipe, manager, variantSwap.cleanupVariantSwap],
    )

    const swipeHandlers: SwipeHandlers = useMemo(
        () => ({
            onHorizontalChange: (n: number) => {
                if (animationRef.current !== null || families.length <= 1) return
                const wrapped = manager.wrapIdx(curItemRef.current)
                const atFirst = wrapped === 0
                const atLast = wrapped === families.length - 1
                if ((atFirst && n < 0) || (atLast && n > 0)) {
                    if (swipeValue.current !== 0) {
                        swipeValue.current = 0
                        callUpdateItems()
                    }
                    return
                }
                swipeValue.current = n
                callUpdateItems()
            },
            onHorizontalSwipe: (d: -1 | 0 | 1) => {
                if (animationRef.current !== null || families.length <= 1) return
                const wrapped = manager.wrapIdx(curItemRef.current)
                const atFirst = wrapped === 0
                const atLast = wrapped === families.length - 1
                if ((atFirst && d === -1) || (atLast && d === 1)) {
                    handleSwipeCommit(0)
                    return
                }
                handleSwipeCommit(d)
            },
            onVerticalChange: (n: number) => {
                if (animationRef.current !== null || !enableVariantSwipe) return
                variantSwap.startVariantSwap(n)
            },
            onVerticalSwipe: (d: -1 | 0 | 1) => {
                if (animationRef.current !== null || !enableVariantSwipe) return
                variantSwap.handleVariantSwipeCommit(d)
            },
        }),
        [
            animationRef,
            callUpdateItems,
            handleSwipeCommit,
            enableVariantSwipe,
            families.length,
            manager,
            variantSwap.startVariantSwap,
            variantSwap.handleVariantSwipeCommit,
        ],
    )

    useSwipeBinding(swipeAreaRef, isViewing, swipeHandlers, config.swipeConfig)

    // React to isViewing transitions: auto-enter/resume when true, auto-pause when false.
    const wasViewingRef = useRef(isViewing)
    useEffect(() => {
        const wasViewing = wasViewingRef.current
        wasViewingRef.current = isViewing

        if (isViewing && !wasViewing) {
            const p = config.placement
            if (!p || families.length === 0) return
            if (placementRef.current) {
                // Resume: placement was set from a previous viewing session
                placementRef.current = p
                const cur = curItemRef.current
                curSceneId.current = manager.itemIdFor(cur)
                swipeValue.current = 0
                loadTriplet(cur, p, { variantIdx: variantIndexRef.current })
                callUpdateItems()
                onProductViewedRef.current?.({
                    familyIndex: manager.wrapIdx(cur),
                    variantIndex: variantIndexRef.current,
                    totalResultCount: familiesRef.current.length,
                    navigationDirection: null,
                    navigationMethod: FMF_NAVIGATION_METHOD_VIEW_RESULTS,
                    families: familiesRef.current,
                })
            } else {
                // Fresh entry
                const idx = familyIndex
                placementRef.current = p
                curItemRef.current = idx
                curSceneId.current = manager.itemIdFor(idx)
                loadTriplet(idx, p)
                swipeValue.current = 0
                callUpdateItems()
                onProductViewedRef.current?.({
                    familyIndex: manager.wrapIdx(idx),
                    variantIndex: 0,
                    totalResultCount: familiesRef.current.length,
                    navigationDirection: null,
                    navigationMethod: FMF_NAVIGATION_METHOD_VIEW_RESULTS,
                    families: familiesRef.current,
                })
            }
        } else if (!isViewing && wasViewing && loadedItems.current.size > 0) {
            removeAllItems()
            changeDebugSettings({ ...debugSettingsRef.current })
        }
    }, [isViewing, config.placement, families, familyIndex, manager, callUpdateItems, loadTriplet, removeAllItems])

    // Keep placementRef in sync with config.placement during viewing so items
    // added or re-added mid-session (e.g. after an item drag shifts the bbox)
    // are placed at the new position. When the placement actually changes
    // mid-session, also remove and re-add the hidden adjacent items so their
    // animations originate from the new spot.
    useEffect(() => {
        const placement = config.placement
        if (!isViewing || !placement) return
        const prev = placementRef.current
        if (!prev || prev === placement) {
            // Initial load (null) or unchanged. The main effect above
            // already handles the initial load.
            placementRef.current = placement
            return
        }
        placementRef.current = placement
        if (families.length <= 1) return

        const cur = curItemRef.current
        const adjacent = [cur - 1, cur + 1]
        adjacent.forEach((idx) => {
            if (loadedItems.current.has(idx)) {
                manager.removeItem(idx)
                loadedItems.current.delete(idx)
            }
            manager.addItem(idx, placement)
            loadedItems.current.add(idx)
        })
    }, [isViewing, config.placement, families.length, manager])

    const reset = useCallback(
        (onAfterReset?: () => void) => {
            removeAllItems()
            swipeValue.current = 0
            curItemRef.current = 0
            curSceneId.current = ''
            placementRef.current = null
            changeDebugSettings({ ...debugSettingsRef.current })
            setFamilyIndex(0)
            variantIndexRef.current = 0
            setVariantIndex(0)
            onAfterReset?.()
        },
        [removeAllItems],
    )

    const goNext = useCallback(() => {
        if (animationRef.current !== null) return
        handleSwipeCommit(1)
    }, [handleSwipeCommit, animationRef])

    const goPrev = useCallback(() => {
        if (animationRef.current !== null) return
        handleSwipeCommit(-1)
    }, [handleSwipeCommit, animationRef])

    const changeVariant = useCallback(
        (newVariantIdx: number) => {
            const p = placementRef.current
            if (!p) return
            cancelAnimation()
            variantSwap.cleanupVariantSwap()
            const cur = curItemRef.current
            // Clear everything first to avoid model-URL conflicts with adjacent
            // items that share the same product.
            removeAllItems()
            swipeValue.current = 0
            // Load adjacent items with default variant (canonical IDs, hidden).
            manager.addItem(cur + 1, p)
            loadedItems.current.add(cur + 1)
            manager.addItem(cur - 1, p)
            loadedItems.current.add(cur - 1)
            loadedItems.current.add(cur)
            // The selected variant uses a swap ID so the canonical slot keeps
            // variant 0. When the user swipes away, handleSwipeCommit detects
            // the non-canonical curSceneId and restores the default via
            // slidingAwayOverride — ensuring the model matches variant 0 on
            // swipe-back.
            const newId = manager.nextSwapId()
            manager.addItem(cur, p, { variantIdx: newVariantIdx, hidden: false, itemId: newId })
            curSceneId.current = newId
            variantIndexRef.current = newVariantIdx
            setVariantIndex(newVariantIdx)
            callUpdateItems()
            onProductViewedRef.current?.({
                familyIndex: manager.wrapIdx(cur),
                variantIndex: newVariantIdx,
                totalResultCount: familiesRef.current.length,
                navigationDirection: null,
                navigationMethod: FMF_NAVIGATION_METHOD_PRODUCT_LIST,
                families: familiesRef.current,
            })
        },
        [cancelAnimation, callUpdateItems, manager, variantSwap.cleanupVariantSwap, removeAllItems, loadTriplet],
    )

    // variantIdx lets the caller load a specific variant atomically when switching families.
    // This is used when a swatch from a different family is clicked — loading the target
    // variant in the same operation avoids a race condition where a follow-up changeVariant
    // call would fail to remove the previous item because curSceneId was already updated.
    const goToFamily = useCallback(
        (targetFamilyIdx: number, variantIdx = 0) => {
            if (animationRef.current !== null) return
            const p = placementRef.current
            if (!p) return
            removeAllItems()
            curItemRef.current = targetFamilyIdx
            swipeValue.current = 0

            if (variantIdx === 0) {
                // Default variant — load normally at the canonical ID.
                curSceneId.current = manager.itemIdFor(targetFamilyIdx)
                loadTriplet(targetFamilyIdx, p)
            } else {
                // Non-default variant — use a swap ID so the canonical slot
                // keeps variant 0 for correct swipe-back behavior.
                manager.addItem(targetFamilyIdx + 1, p)
                loadedItems.current.add(targetFamilyIdx + 1)
                manager.addItem(targetFamilyIdx - 1, p)
                loadedItems.current.add(targetFamilyIdx - 1)
                loadedItems.current.add(targetFamilyIdx)
                const newId = manager.nextSwapId()
                manager.addItem(targetFamilyIdx, p, { variantIdx, hidden: false, itemId: newId })
                curSceneId.current = newId
            }

            setFamilyIndex(targetFamilyIdx)
            variantIndexRef.current = variantIdx
            setVariantIndex(variantIdx)
            callUpdateItems()
            onProductViewedRef.current?.({
                familyIndex: targetFamilyIdx,
                variantIndex: variantIdx,
                totalResultCount: familiesRef.current.length,
                navigationDirection: null,
                navigationMethod: FMF_NAVIGATION_METHOD_PRODUCT_LIST,
                families: familiesRef.current,
            })
        },
        [removeAllItems, callUpdateItems, manager, animationRef, loadTriplet],
    )

    useEffect(
        () => () => {
            cancelAnimation()
            if (variantSwap.activeSwapSceneId.current) {
                removeById(variantSwap.activeSwapSceneId.current)
            }
            const cur = curItemRef.current
            if (curSceneId.current && curSceneId.current !== manager.itemIdFor(cur)) {
                removeById(curSceneId.current)
                loadedItems.current.delete(cur)
            }
            Array.from(loadedItems.current).forEach((idx) => manager.removeItem(idx))
            loadedItems.current.clear()
        },
        [cancelAnimation, manager, variantSwap.activeSwapSceneId],
    )

    return {
        familyIndex,
        variantIndex,
        swipeAreaRef,
        reset,
        goNext,
        goPrev,
        changeVariant,
        goToFamily,
        currentSceneId: curSceneId.current,
        isAnimating: animationRef.current !== null,
    }
}
