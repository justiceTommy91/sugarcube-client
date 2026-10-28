import { createSelector } from 'reselect'

import { getFurnitureById as getProductsById } from 'models/furniture/selectors'
import { getSelectedCompositionShoppableLocalIds } from 'models/compositions/selectors'
import type { ProductData } from 'models/furniture'
import type { RootState } from 'store'

export const getIds = (state: RootState) => state.favorites.ids

export const getHasFavoritesList = createSelector([getIds], (ids) => !!ids && Array.isArray(ids))

const defined = <T>(value?: T | null): value is T => value != null

export const getFavoriteProducts = createSelector(
    [getIds, getProductsById],
    (favIds, productsById: Record<number, ProductData>) => {
        if (favIds) {
            const products = Object.values(productsById)
            return favIds.map((favId) => products.find((product) => product.localItemNumber === favId)).filter(defined)
        }
        return []
    },
)

export const getNumFavorites = createSelector([getIds], (favIds) => (favIds ? favIds.length : 0))

export const getFavoritesToModify = createSelector(
    [getIds, getSelectedCompositionShoppableLocalIds],
    (favorites, localItemNumbers) => {
        const hasFavorites = !!(favorites && favorites.length)
        const selected =
            hasFavorites &&
            localItemNumbers &&
            localItemNumbers.length &&
            localItemNumbers.every((val) => favorites.includes(val))

        // If all items are favorited or there are no favorites, we want to send all items to fav/un-favorite
        // else, we want to favorite the remaining items that are not already in favorites
        const modifyAll = selected || !hasFavorites
        const itemsToModify = modifyAll
            ? localItemNumbers
            : localItemNumbers.filter((item) => !favorites.includes(item))
        return itemsToModify
    },
)
