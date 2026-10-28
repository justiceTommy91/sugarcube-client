import { takeEvery, call, put } from 'redux-saga/effects'

import * as favsApi from 'services/spiderpigs'

import { REQUEST_FAVORITES, TOGGLE_FAVORITE, TOGGLE_FAVORITES } from 'models/actionTypes'
import { receiveFavorites, failedReceiveFavorites } from 'models/favorites/actions'
import { requestFurnitureByLocalItemNos } from 'models/furniture/actions'

export function* requestFavorites() {
    try {
        const favorites = yield call(favsApi.getDefaultFavs)
        if (favorites) {
            yield put(receiveFavorites(favorites))
            if (favorites.length) {
                yield put(requestFurnitureByLocalItemNos(favorites))
            }
        } else {
            yield put(failedReceiveFavorites())
        }
    } catch (error) {
        yield put(failedReceiveFavorites())
    }
}

export function* toggleFavorite({ payload }) {
    const { isFavorite, localItemNumber } = payload
    try {
        if (isFavorite) {
            yield call(favsApi.addToFavs([localItemNumber]))
        } else {
            yield call(favsApi.removeFromFavs([localItemNumber]))
        }
    } catch (error) {
        //
    }
}

export function* toggleFavorites({ payload }) {
    const { isFavorite, itemsToFavorite } = payload
    try {
        if (isFavorite) {
            yield call(favsApi.addToFavs(itemsToFavorite))
        } else {
            yield call(favsApi.removeFromFavs(itemsToFavorite))
        }
    } catch (error) {
        //
    }
}

export function* watchRequestFavorites() {
    yield takeEvery(REQUEST_FAVORITES, requestFavorites)
}

export function* watchToggleFavorite() {
    yield takeEvery(TOGGLE_FAVORITE, toggleFavorite)
}

export function* watchToggleFavorites() {
    yield takeEvery(TOGGLE_FAVORITES, toggleFavorites)
}

export const favoritesSagas = [watchRequestFavorites(), watchToggleFavorite(), watchToggleFavorites()]
