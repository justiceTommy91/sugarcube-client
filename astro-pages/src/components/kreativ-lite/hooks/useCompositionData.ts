import { useMemo } from 'react'
import type { SceneInfo, PersistUserData } from '@gatsby/Renderer/geomviewer/geom_types'
import { useScene } from '@astro-hooks/useScene'
import { useComposition } from '@astro-hooks/useComposition'
import type { CompositionRestoreItem } from '@astro-services/compositionService'
import type { FurnitureApiProduct } from '@astro-services/kreativLiteFurnitureService'

interface UseCompositionDataResult {
    loading: boolean
    scene: SceneInfo | null
    compositionRestoreItems: CompositionRestoreItem[] | undefined
    supplementalCombinableProducts: Map<string, FurnitureApiProduct> | undefined
    persistUserData: PersistUserData | undefined
}

/**
 * Loads and resolves scene and composition data from the given IDs.
 *
 * When `compositionId` is non-empty, loads the full composition (which includes
 * the scene, restore items, supplemental combinable products, and saved erased
 * segments). When `compositionId` is empty, loads only the scene by `sceneId`.
 */
export function useCompositionData(compositionId: string, sceneId: string): UseCompositionDataResult {
    const { composition, loading: compositionLoading } = useComposition(compositionId)
    const { scene: sceneData, loading: sceneLoading } = useScene(compositionId ? '' : sceneId)

    const loading = compositionId ? compositionLoading : sceneLoading

    const scene = useMemo((): SceneInfo | null => {
        if (compositionId) return composition?.scene ?? null
        return (sceneData as SceneInfo | null | undefined) ?? null
    }, [compositionId, composition, sceneData])

    const compositionRestoreItems = useMemo(
        () => (compositionId && composition ? composition.restoreItems : undefined),
        [compositionId, composition],
    )

    const supplementalCombinableProducts = useMemo(
        () => (compositionId && composition ? composition.supplementalCombinableProducts : undefined),
        [compositionId, composition],
    )

    const persistUserData = useMemo((): PersistUserData | undefined => {
        if (!compositionId) return undefined
        const segments = composition?.savedProperties?.erasedSegments
        if (!segments?.length) return undefined
        return { magicEraser: { saveData: { erasedSegments: segments.map(Number) } } }
    }, [composition, compositionId])

    return { loading, scene, compositionRestoreItems, supplementalCombinableProducts, persistUserData }
}
