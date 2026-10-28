import { RenderItemComplete } from 'models/compositions'
import * as furnitureSelectors from 'models/furniture/selectors'

import { type AsyncResult, idle, type Idle } from 'utils/async'

import { useAppSelector } from './useAppSelector'
import type { Product } from './useCompositionFurniture'

export const useProduct = (productId: number | Idle): AsyncResult<Product> => {
    const renderItem = useAppSelector(
        (state) => furnitureSelectors.getFurnitureById(state)[productId] as RenderItemComplete | undefined,
    )

    if (productId === idle) {
        return {
            status: 'idle',
            result: null,
            error: null,
        }
    }

    if (!renderItem) {
        return {
            status: 'error',
            result: null,
            error: new Error(`no product with id ${productId} was found`),
        }
    }

    const product: Product = {
        id: renderItem.id,
        localItemNumber: renderItem.localItemNumber,
        name: renderItem.name,
        description: renderItem.description ?? '',
        canBeMirrored: Boolean(renderItem.mirrorType),
        productType: renderItem.renderType,
    }
    return {
        status: 'success',
        result: product,
        error: null,
    }
}
