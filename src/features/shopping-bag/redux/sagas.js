import { takeEvery, call, select, put, delay } from 'redux-saga/effects'
import * as Sentry from '@sentry/react'

import * as caasCartApi from 'services/cart'
import { getShoppingCartUrl, getAddToCartUrl } from 'utils/buildUrls'
import * as tracker from 'utils/tracker'
import toastsService, { ToastType } from 'services/toasts'
import { getRegion, isProdOrCte, getUrlParams } from 'models/location/selectors'
import { getFurnitureById } from 'models/furniture/selectors'
import { isPubSubAvailable, publish, PUB_SUB_ADD_CART_SUCCESS, getPubSubCartItem } from 'services/pubsub'
import * as fetchApi from 'services'
import { addInvalidLocalItemNumbers } from 'models/ui/actions'

import {
    actionTypes,
    addToBagRequest,
    addToBagSuccess,
    addToBagFailure,
    addRoomToBagRequest,
    addRoomToBagSuccess,
    addRoomToBagFailure,
    clearAddedProductId,
    clearRoomAdded,
} from './actions'

function createCartItems(localItemNumbers) {
    const itemCounts = localItemNumbers.reduce((acc, itemNo) => {
        acc[itemNo] = (acc[itemNo] || 0) + 1
        return acc
    }, {})

    return Object.entries(itemCounts).map(([itemNo, quantity]) => ({
        itemNo,
        quantity,
    }))
}

// Minimum delay to ensure loader is visible (UX feedback)
const MINIMUM_LOADING_DELAY_MS = 800

export function* addToBag(action) {
    // Dispatch loading state
    const { furnitureId, source, hideToast, uniqueId } = action.payload
    yield put(addToBagRequest(furnitureId, source, uniqueId))

    // Start timer for minimum loading delay
    const startTime = Date.now()

    const isAuthenticated = yield call(fetchApi.isAuthenticated)
    const byId = yield select(getFurnitureById)
    const thisFurniture = byId[furnitureId]
    const isProdOrCteEnv = yield call(isProdOrCte)

    try {
        if (!thisFurniture) {
            // Note: this case should not happen but leaving this case here just in case.
            // This case should not happen becuase the add to bag buttons are only shown once this furniture is in the store.
            yield put(addToBagFailure())
            return
        }
        const { name, region, localItemNumber } = thisFurniture

        if (!localItemNumber) {
            yield put(addToBagFailure())
            return
        }

        // Check for dev flag to disable cart redirect
        const urlParams = yield call(getUrlParams)
        const disableCartRedirect = urlParams.disableCartRedirect === 'true'

        if (isAuthenticated && isProdOrCteEnv) {
            const items = [{ itemNo: localItemNumber, quantity: 1 }]
            yield call(caasCartApi.addItemsToCart, items)
        } else if (!disableCartRedirect) {
            // When there is no token or the environment is Cloudflare or localhost,
            // we can check that the shopping cart is correctly added with this url.
            const cartUrl = getAddToCartUrl([localItemNumber], region)
            if (cartUrl) {
                window.open(cartUrl, '_blank')
            }
        }

        const hasPubSub = yield call(isPubSubAvailable)
        // Publish add to cart success event to pubsub.
        if (hasPubSub) {
            const items = [getPubSubCartItem(thisFurniture)]
            // The AB testing snippet fires an optimizely event
            // on add to cart success: add_to_cart_global and add_to_cart_{market}.
            yield call(publish, PUB_SUB_ADD_CART_SUCCESS, { items })
        }

        // Ensure minimum loading time for UX feedback
        const elapsed = Date.now() - startTime
        if (elapsed < MINIMUM_LOADING_DELAY_MS) {
            yield delay(MINIMUM_LOADING_DELAY_MS - elapsed)
        }

        yield put(addToBagSuccess(furnitureId, source, uniqueId))

        // Show toast after loading is complete (unless hideToast is true)
        if (!hideToast) {
            yield call(toastsService.showToast, { toastType: ToastType.ADDED_ITEM_TO_BAG, name })
        }

        // Clear added state after 2 seconds
        yield delay(2000)
        yield put(clearAddedProductId())
    } catch (error) {
        const { name } = thisFurniture

        // Ensure minimum loading time even on error for UX feedback
        const elapsed = Date.now() - startTime
        if (elapsed < MINIMUM_LOADING_DELAY_MS) {
            yield delay(MINIMUM_LOADING_DELAY_MS - elapsed)
        }

        yield put(addToBagFailure())

        yield call(Sentry.captureException, error)
        yield call(tracker.error, `AddToCartFailure`, {
            Error: error.message,
            LocalItemNumbers: [thisFurniture?.localItemNumber],
            ErrorDetail: error?.response?.data?.error,
            StatusCode: error?.response?.status,
        })
        yield call(toastsService.showToast, {
            toastType: ToastType.ADDED_ITEM_TO_BAG,
            name,
            failed: true,
        })
    }
}

/**
 * This is based on the Ingka cart API's error response when an 'invalid'/unpublished item was included in the request
 */
const isInvalidCartItemsError = (response) =>
    response?.status === 400 && response?.data?.title === 'BadRequest' && Array.isArray(response?.data?.items)

export function* addRoomToBag(action) {
    const { localItemNumbers, region, blockRedirect, isRetry = false, invalidItemNumbers, hideToast } = action.payload

    // Add room to bag should not be called with zero product items.
    // Adding this early return just in case.
    if (!localItemNumbers || !localItemNumbers.length) {
        return
    }

    // Only dispatch loading state on first attempt (not on retry)
    if (!isRetry) {
        yield put(addRoomToBagRequest())
    }

    // Start timer for minimum loading delay
    const startTime = Date.now()

    const isAuthenticated = yield call(fetchApi.isAuthenticated)
    const isProdOrCteEnv = yield call(isProdOrCte)

    // Check for dev flag to disable cart redirect
    const urlParams = yield call(getUrlParams)
    const disableCartRedirect = urlParams.disableCartRedirect === 'true'

    try {
        if (isAuthenticated && isProdOrCteEnv) {
            const roomItems = createCartItems(localItemNumbers)
            yield call(caasCartApi.addItemsToCart, roomItems)
        } else if (!disableCartRedirect) {
            const cartUrl = getAddToCartUrl(localItemNumbers, region)
            window.open(cartUrl, '_blank')
        }

        // Always open cart after adding items, unless blockRedirect or disableCartRedirect is set
        // In the case of the Design summary modal for the mobile web, we do not want to redirect
        // to the cart url. Instead we want to show and exit popup that has a checkout button.
        // In this case, we pass the blockRedirect parameter as true. It is false by default.
        if (isAuthenticated && isProdOrCteEnv && !blockRedirect && !disableCartRedirect) {
            const shoppingCartUrl = getShoppingCartUrl(region)
            window.open(shoppingCartUrl, '_blank')
        }
        if (!hideToast) {
            if (isRetry) {
                yield call(toastsService.showToast, {
                    toastType: ToastType.ADDED_MULTIPLE_ITEMS_TO_BAG_AFTER_RETRY,
                    invalidItems: invalidItemNumbers,
                })
            } else {
                yield call(toastsService.showToast, {
                    toastType: ToastType.ADDED_MULTIPLE_ITEMS_TO_BAG,
                    count: localItemNumbers.length,
                })
            }
        }

        // Ensure minimum loading time for UX feedback
        const elapsed = Date.now() - startTime
        if (elapsed < MINIMUM_LOADING_DELAY_MS) {
            yield delay(MINIMUM_LOADING_DELAY_MS - elapsed)
        }

        yield put(addRoomToBagSuccess())

        // Clear "Added" state after 2 seconds
        yield delay(2000)
        yield put(clearRoomAdded())
    } catch (error) {
        // Ensure minimum loading time even on error for UX feedback
        const elapsed = Date.now() - startTime
        if (elapsed < MINIMUM_LOADING_DELAY_MS) {
            yield delay(MINIMUM_LOADING_DELAY_MS - elapsed)
        }

        yield put(addRoomToBagFailure())

        yield call(Sentry.captureException, error)
        yield call(tracker.error, `AddToCartFailure`, {
            Error: error.message,
            LocalItemNumbers: localItemNumbers,
            ErrorDetail: error?.response?.data?.error,
            StatusCode: error?.response?.status,
            IsRetry: isRetry,
        })

        if (isInvalidCartItemsError(error?.response)) {
            const invalidItemNos = error.response.data.items
                .filter((item) => item.description === 'Item is invalid')
                .map((item) => item.itemNo)
            yield put(addInvalidLocalItemNumbers(invalidItemNos))

            const validItemNumbers = localItemNumbers.filter((itemNo) => !invalidItemNos.includes(itemNo))
            // There are still valid items, retry with them once
            if (validItemNumbers.length > 0 && !isRetry) {
                yield call(addRoomToBag, {
                    payload: {
                        ...action.payload,
                        localItemNumbers: validItemNumbers,
                        invalidItemNumbers: invalidItemNos,
                        isRetry: true,
                    },
                })
                return
            }
            // There are no valid items left yet we still got the error
            // log this exception
            if (validItemNumbers.length === 0) {
                yield call(tracker.error, `AddToCartRetryFailure`, {
                    ErrorTitle: `Cart API BadRequest without valid items`,
                    InvalidItems: invalidItemNos,
                })
            }
        }
        yield call(toastsService.showToast, {
            toastType: ToastType.ADDED_MULTIPLE_ITEMS_TO_BAG,
            count: localItemNumbers.length,
            failed: true,
        })
    }
}

export function* openBag() {
    const region = yield select(getRegion)
    const shoppingCartUrl = getShoppingCartUrl(region)
    window.open(shoppingCartUrl, '_blank')
}

function* watchAddToBag() {
    yield takeEvery(actionTypes.ADD_TO_BAG, addToBag)
}

function* watchAddRoomToBag() {
    yield takeEvery(actionTypes.ADD_ROOM_TO_BAG, addRoomToBag)
}

function* watchOpenBag() {
    yield takeEvery(actionTypes.OPEN_BAG, openBag)
}

export const bagSagas = [watchAddToBag(), watchAddRoomToBag(), watchOpenBag()]
