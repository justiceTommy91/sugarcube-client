import type { RenderItemComplete, ArtRenderItemComplete, FurnitureRenderItemComplete } from 'models/compositions'

export type ImageCache = { artImageData: ImageData; msFileDownloadTime: number } | undefined

/**
 * Extended render item types that include additional runtime properties not in the base types.
 * These properties come from selectors that merge product data with render item state.
 */
export type ExtendedRenderItem = RenderItemComplete & {
    hidden?: boolean
    isNoninteractable?: boolean
    name?: string
    description?: string
    localItemNumber?: number
    thumbUrl?: string
    subCategoryIds?: string[]
}

export type ExtendedFurnitureItem = FurnitureRenderItemComplete & ExtendedRenderItem & {
    isLeftMost?: boolean
    combinablesPlugs?: unknown
    socket?: string
}

export type ExtendedArtItem = ArtRenderItemComplete & ExtendedRenderItem

export type CompositionItemProps = {
    renderItem: RenderItemComplete
    parentItem?: RenderItemComplete
    compositionId: string
    customContext: string
    artImageData?: ImageCache
    revealDots?: boolean
    showRotateByDefault?: boolean
}
