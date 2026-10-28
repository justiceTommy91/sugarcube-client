/* eslint-disable i18next/no-literal-string */
import * as React from 'react'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import * as furnitureActions from 'models/furniture/actions'
import * as variantsSelectors from 'models/variants/selectors'

import { type AsyncResult, type AsyncParams, idle } from 'utils/async'

export type ProductVariant = {
    productId: number
    thumbUrl: string
    valueKey: string
}

export type ProductVariantCategory = {
    type: string
    typeName: string
    options: ProductVariant[]
    showThumbnail: boolean
}

const fetchTimes: Record<number, number | undefined> = {}
const TTL = 1_000 * 60 * 2 // 2 minutes

export const useCatalogProductVariants = (productId: AsyncParams<number>): AsyncResult<ProductVariantCategory[]> => {
    const variantCategories = useAppSelector((state) => variantsSelectors.getSelectedFurnitureVariants(state)) as
        | ProductVariantCategory[]
        | null
    const areVariantsLoading = useAppSelector(variantsSelectors.getIsVariantsLoading) as boolean

    // KLUDGE: This caching and revalidation logic is a bit brittle....
    const isFirstFetch = productId === idle || fetchTimes[productId] == null
    const dispatch = useAppDispatch()
    React.useEffect(() => {
        if (productId === idle) {
            return
        }

        const now = Date.now()
        const lastFetchedAt = fetchTimes[productId] ?? Number.NEGATIVE_INFINITY
        if (isFirstFetch || now - lastFetchedAt > TTL) {
            dispatch(furnitureActions.requestFurnitureVariants(productId))
            fetchTimes[productId] = now
        }
    }, [variantCategories, isFirstFetch, productId])

    if (productId === idle) {
        return { status: 'idle', result: null, error: null }
    }

    if (isFirstFetch || areVariantsLoading) {
        return { status: 'loading', result: null, error: null }
    }

    return { status: 'success', result: variantCategories ?? [], error: null }
}
