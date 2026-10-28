import React from 'react'
import { degreesToQuat } from '@gatsby/Renderer/geometry/utilities'
import type { PointXYZ, Quat4D } from '@gatsby/Renderer/geomviewer/geom_types'
import type { DebugSettings } from '@gatsby/Renderer/geomviewer'
import type { CarouselState } from './hooks/useCarousel'
import { SceneItemManager, modifyItem, changeDebugSettings } from './SceneItemManager'
import { smootherstep, clamp, lerpScale, lerpOpacity } from './carouselMath'
import { DEFAULT_ANIM_PARAMS } from './types'

const { snapThresh, eps, slideX, slideY, viewY, viewZ } = DEFAULT_ANIM_PARAMS
const TARGET_SCALE = { x: 0.1, y: 0.1, z: 0.1 }
const TARGET_OPACITY = 0
const SIDE_PUSH = 50 // large horizontal push (view-space) to hide items at rest
const ROTATION_X = 50
const ROTATION_Y = 90 // symmetric: negative when exiting left, positive when exiting right

// At dist >= 1.0 items are at rest — push them off-screen instantly.
const sidePush = (dist: number) => (dist >= 1.0 ? SIDE_PUSH : 0)

function lerpRotation(dist: number, rotY: number): Quat4D {
    return degreesToQuat({ x: ROTATION_X * dist, y: rotY * dist, z: 0 } as PointXYZ)
}

// Only calls changeDebugSettings when the occlusion state actually changes.
export function updateCarouselItems(
    state: CarouselState,
    manager: SceneItemManager,
    occlusionRef: React.MutableRefObject<boolean | null>,
    debugSettingsRef: React.MutableRefObject<DebugSettings>,
): void {
    const { swipeValue: hT, variantSwapValue: vT, curItemIndex: cur, curSceneId: cid } = state
    const absH = Math.abs(hT)
    const absV = Math.abs(vT)
    const absT = Math.max(absH, absV)

    const shouldDisableOcclusion = absT > eps && absT < 1.0 - eps
    if (shouldDisableOcclusion !== occlusionRef.current) {
        // eslint-disable-next-line no-param-reassign
        occlusionRef.current = shouldDisableOcclusion
        changeDebugSettings({
            ...debugSettingsRef.current,
            disableSceneOcclusion: shouldDisableOcclusion,
        })
    }

    const animOverride = (position: { x: number; y: number; z: number }, dist: number, rotation?: Quat4D) => ({
        position,
        rotation,
        scale: lerpScale(dist, TARGET_SCALE),
        opacity: lerpOpacity(dist, TARGET_OPACITY),
        blendFactor: smootherstep(dist, 0, snapThresh),
        space: `view` as const,
        anchorToRest: true,
    })

    // Current item: Y rotation only on horizontal swipes.
    const curRotY = hT >= 0 ? -ROTATION_Y : ROTATION_Y
    modifyItem(
        cid,
        animOverride({ x: hT * -slideX, y: viewY + vT * slideY, z: viewZ }, absT, lerpRotation(absH, curRotY)),
    )

    const override = state.slidingAwayOverride

    // Next item (right side): negative Y rotation.
    const nextDist = 1.0 - clamp(hT, 0, 1)
    const nextId = override?.direction === 1 ? override.id : manager.itemIdFor(cur + 1)
    modifyItem(
        nextId,
        animOverride(
            { x: (1.0 - hT) * slideX + sidePush(nextDist), y: viewY, z: viewZ },
            nextDist,
            lerpRotation(nextDist, -ROTATION_Y),
        ),
    )

    // Prev item (left side): positive Y rotation.
    const prevDist = 1.0 + clamp(hT, -1, 0)
    const prevId = override?.direction === -1 ? override.id : manager.itemIdFor(cur - 1)
    modifyItem(
        prevId,
        animOverride(
            { x: (1.0 + hT) * -slideX - sidePush(prevDist), y: viewY, z: viewZ },
            prevDist,
            lerpRotation(prevDist, ROTATION_Y),
        ),
    )

    if (state.variantSwapDirection !== 0 && state.activeSwapSceneId) {
        const swapId = state.activeSwapSceneId
        if (vT > 0) {
            const swapDist = 1.0 - clamp(vT, 0, 1)
            modifyItem(
                swapId,
                animOverride({ x: 0, y: viewY + (1.0 - vT) * -slideY - sidePush(swapDist), z: viewZ }, swapDist),
            )
        } else {
            const swapDist = 1.0 + clamp(vT, -1, 0)
            modifyItem(
                swapId,
                animOverride({ x: 0, y: viewY + (1.0 + vT) * slideY + sidePush(swapDist), z: viewZ }, swapDist),
            )
        }
    }
}
