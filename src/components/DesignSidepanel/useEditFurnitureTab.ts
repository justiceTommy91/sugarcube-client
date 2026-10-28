import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import type { ProductVariant, ProductVariantCategory } from 'hooks/useCatalogProductVariants'

import type { RenderItemComplete } from 'models/compositions'
import * as compositionActions from 'models/compositions/actions'
import * as furnitureActions from 'models/furniture/actions'
import * as compositionSelectors from 'models/compositions/selectors'
import * as variantSelectors from 'models/variants/selectors'
import * as uiSelectors from 'models/ui/selectors'

import { GeomViewer } from 'Renderer/geomviewer'

export const RELATED_PRODUCTS_MODE_GOES_WELL_WITH = 'goes well with'
export const RELATED_PRODUCTS_MODE_SWAP = 'swap'

export type RelatedProductsMode = typeof RELATED_PRODUCTS_MODE_GOES_WELL_WITH | typeof RELATED_PRODUCTS_MODE_SWAP

export const relatedProductModes: RelatedProductsMode[] = [
    RELATED_PRODUCTS_MODE_GOES_WELL_WITH,
    RELATED_PRODUCTS_MODE_SWAP,
]

export type UseEditFurnitureTabResults = {
    mode: RelatedProductsMode
    selectedFurniture: number | null
    selectedRenderItem: RenderItemComplete | null
    selectFurniture: (furnitureId: number, productId: number) => void
    clearFurnitureSelection: () => void
    // KLUDGE: We should not be relying upon selected state being part of the variant.
    selectedVariantCategory: Omit<ProductVariantCategory, 'options'> & {
        selectedFurniturePrice: string
        options: ProductVariant & { selected: boolean }[]
    }
}

export const useEditFurnitureTab = (): UseEditFurnitureTabResults => {
    const dispatch = useAppDispatch()

    const selectedFurniture = useAppSelector((state) => {
        const renderItem = compositionSelectors.getSelectedCompositionRenderedFurnitureItem(state) as
            | RenderItemComplete
            | undefined
        return renderItem?.uniqueId
    })
    const selectFurniture = (furnitureId: number, productId: number) => {
        dispatch(compositionActions.selectCompositionRenderItem(furnitureId))
        dispatch(furnitureActions.selectFurniture(productId))
        GeomViewer.bindings?.selectSceneItem(String(furnitureId))
    }
    const clearFurnitureSelection = () => dispatch(compositionActions.selectCompositionRenderItem(-1))

    const mode: RelatedProductsMode = useAppSelector((state) => {
        const showGoesWith = uiSelectors.getShowGoesWithTab(state) as boolean
        return showGoesWith ? RELATED_PRODUCTS_MODE_GOES_WELL_WITH : RELATED_PRODUCTS_MODE_SWAP
    })

    const selectedVariantCategory = useAppSelector((state) =>
        variantSelectors.getSelectedFurnitureVariantCategory(state),
    )
    const selectedRenderItem = useAppSelector((state) => compositionSelectors.getSelectedRenderItem(state))

    return {
        mode,
        selectedFurniture: selectedFurniture ?? null,
        selectFurniture,
        clearFurnitureSelection,
        selectedVariantCategory,
        selectedRenderItem,
    }
}
