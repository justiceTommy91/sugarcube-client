import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import type { Product } from 'hooks/useCompositionFurniture'

import * as furnitureActions from 'models/furniture/actions'
import * as furnitureSelectors from 'models/furniture/selectors'
import { getLocation } from 'models/furniture/selectors'
import { useEffect } from 'react'

import { type AsyncResult, type AsyncParams, idle } from 'utils/async'

const fetchTimes: Record<number, number | undefined> = {}
const TTL = 1_000 * 60 * 2 // 2 minutes

export const useCatalogSwappableProducts = (productId: AsyncParams<number>): AsyncResult<Product[]> => {
    const products = useAppSelector((state) => {
        if (productId === idle) {
            return []
        }
        const productIds = furnitureSelectors.getSwappableProducts(state, productId)
        return productIds.map((id) => furnitureSelectors.getFurnitureById(state)[id]) as Product[]
    })
    const isLoading = useAppSelector(furnitureSelectors.getIsSwappablesLoading) as boolean
    const location = useAppSelector(getLocation)

    // KLUDGE: This caching and revalidation logic is a bit brittle....
    const isFirstFetch = productId === idle || fetchTimes[productId] == null
    const dispatch = useAppDispatch()

    // Clear cache when location changes to force re-fetch with new location
    useEffect(() => {
        if (productId !== idle) {
            delete fetchTimes[productId]
        }
    }, [location, productId])

    useEffect(() => {
        if (productId === idle) {
            return
        }

        const now = Date.now()
        const lastFetchedAt = fetchTimes[productId] ?? Number.NEGATIVE_INFINITY
        if (isFirstFetch || now - lastFetchedAt > TTL) {
            dispatch(furnitureActions.requestFurnitureSwappables(productId))
            fetchTimes[productId] = now
        }
    }, [isFirstFetch, productId, location]) // Re-fetch when location changes

    if (productId === idle) {
        return { status: 'idle', result: null, error: null }
    }

    if (isFirstFetch || isLoading) {
        return { status: 'loading', result: null, error: null }
    }

    return { status: 'success', result: products, error: null }
}
