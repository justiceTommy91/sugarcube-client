/* eslint-disable i18next/no-literal-string */
import { type ProductVariantCategory, useCatalogProductVariants } from 'hooks/useCatalogProductVariants'
import { useCatalogRelatedProducts } from 'hooks/useCatalogRelatedProducts'
import { useCatalogSwappableProducts } from 'hooks/useCatalogSwappableProducts'
import { type Product } from 'hooks/useCompositionFurniture'

import { type AsyncResult, type Idle, idle } from 'utils/async'

export type ProductOptions = {
    variants: ProductVariantCategory[]
    swappableProducts: Product[]
    relatedProducts: Product[]
}

export const useProductOptions = (productId: number | Idle): AsyncResult<ProductOptions> => {
    const variants = useCatalogProductVariants(productId ?? idle)
    const swappableProducts = useCatalogSwappableProducts(productId ?? idle)
    const relatedProducts = useCatalogRelatedProducts(productId ?? idle)

    if (variants.status === 'error' || swappableProducts.status === 'error' || relatedProducts.status === 'error') {
        return {
            status: 'error',
            result: null,
            error: new Error('Failed to fetch variants, swappable products, or related products'),
        }
    }

    if (
        variants.status === 'loading' ||
        swappableProducts.status === 'loading' ||
        relatedProducts.status === 'loading'
    ) {
        return {
            status: 'loading',
            result: null,
            error: null,
        }
    }

    if (
        variants.status === 'success' &&
        swappableProducts.status === 'success' &&
        relatedProducts.status === 'success'
    ) {
        return {
            status: 'success',
            result: {
                variants: variants.result,
                swappableProducts: swappableProducts.result,
                relatedProducts: relatedProducts.result,
            },
            error: null,
        }
    }

    return {
        status: 'idle',
        result: null,
        error: null,
    }
}
