/* eslint-disable i18next/no-literal-string */
import { GeomViewer } from '@gatsby/Renderer/geomviewer/geom_init'
import { furniturePropsToFurnitureItemParams } from '@gatsby/utils/geomviewer_utils'
import type { Placement } from '@gatsby/Renderer/geomviewer/geom_types'
import type { DebugSettings } from '@gatsby/Renderer/geomviewer/geom_debug'
import type { ProductFamily, AnimationOverride } from './types'
import { wrapIndex } from './carouselMath'

// Parks items off-screen in view-space until updateItems positions them.
export const HIDDEN_ANIMATION_OVERRIDE: AnimationOverride = {
    position: { x: 0, y: 0, z: -100 },
    blendFactor: 1,
    space: 'view',
}

export function removeById(id: string): void {
    GeomViewer.bindings?.deleteSceneItem(id)
}

export function modifyItem(id: string, animationOverride: AnimationOverride): void {
    GeomViewer.bindings?.modifySceneItem(id, {
        modifyFurnitureItem: { animationOverride },
    })
}

export function changeDebugSettings(settings: DebugSettings): void {
    GeomViewer.bindings?.changeDebugSettings(settings)
}

// GeomViewer parses item IDs as integers internally, so all IDs must be valid integer strings.
// Canonical items use the unwrapped family index offset to stay positive.
// Swap items use a separate counter range.
const CANONICAL_ID_OFFSET = 100000
const SWAP_ID_BASE = 200000

export class SceneItemManager {
    private swapCounter = 0

    constructor(private families: ProductFamily[]) {}

    // Uses the raw (unwrapped) index so each carousel slot gets a distinct ID,
    // offset by CANONICAL_ID_OFFSET to keep all values positive.
    // eslint-disable-next-line class-methods-use-this
    itemIdFor(familyIdx: number): string {
        return String(CANONICAL_ID_OFFSET + familyIdx)
    }

    nextSwapId(): string {
        this.swapCounter += 1
        return String(SWAP_ID_BASE + this.swapCounter)
    }

    wrapIdx(idx: number): number {
        return wrapIndex(idx, this.families.length)
    }

    // eslint-disable-next-line class-methods-use-this
    wrapVariantIdx(idx: number, variantCount: number): number {
        return wrapIndex(idx, variantCount)
    }

    addItem(
        familyIdx: number,
        placement: Placement,
        opts?: { variantIdx?: number; hidden?: boolean; itemId?: string },
    ): void {
        const variantIdx = opts?.variantIdx ?? 0
        const hidden = opts?.hidden ?? true
        const itemId = opts?.itemId

        const wrapped = this.wrapIdx(familyIdx)
        let product = this.families[wrapped].variants[variantIdx]?.data ?? this.families[wrapped].variants[0].data

        // Handle LOD model params
        if (!product.modelUrl) {
            const lodData = product.productGeometries.lite || product.productGeometries.simple
            product = { ...product, ...lodData }
        }

        const itemOptions = {
            ...furniturePropsToFurnitureItemParams(product),
            min: { x: product.minX, y: product.minY, z: product.minZ },
            max: { x: product.maxX, y: product.maxY, z: product.maxZ },
            ...(hidden ? { initialAnimationOverride: HIDDEN_ANIMATION_OVERRIDE } : {}),
        }
        GeomViewer.bindings?.addSceneItem(itemId ?? this.itemIdFor(familyIdx), {
            itemKind: 'furniture-item',
            itemOptions,
            placement,
            currentSnapRotationIndex: 0,
        })
    }

    removeItem(familyIdx: number): void {
        GeomViewer.bindings?.deleteSceneItem(this.itemIdFor(familyIdx))
    }
}
