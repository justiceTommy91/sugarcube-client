import * as msgTypes from 'models/iFrame/msgTypes'
import { receiveIkeaTokens } from 'models/tokens/actions'
import {
    receiveCompiledComposition,
    resetCompositionToLatestSavedState,
    setCompositionPreFetchLoading,
} from 'models/compositions/actions'
import { updateLocation } from 'models/furniture/actions'
import { getNotifyActivity, getRouteCompositionIds } from 'models/location/selectors'
import { requestProductList } from 'models/iFrame/actions'
import { messageParent } from 'utils/iframe'
import { saveSelectedCompositionToLocalStorage } from 'models/localStorage/actions'
import { getIsSaved } from 'models/compositions/selectors'

export const setUpCompositionPreFetch = (store) => {
    const onCompositionPreFetchCallback = (data) => {
        const { composition, scene, furnitures } = data
        if (composition && scene && furnitures) {
            store.dispatch(receiveCompiledComposition(composition, scene, furnitures))
        } else {
            store.dispatch(setCompositionPreFetchLoading(false))
        }
    }
    const onCompositionPreFetchFailedCallback = () => {
        store.dispatch(setCompositionPreFetchLoading(false))
    }
    if (window.compositionPreFetchData) {
        // If we have the data, send it out
        onCompositionPreFetchCallback(window.compositionPreFetchData)
    } else if (window.compositionPreFetchLoading) {
        // If we're still loading, provide a callback
        window.onCompositionPreFetchCallback = onCompositionPreFetchCallback
        window.onCompositionPreFetchFailedCallback = onCompositionPreFetchFailedCallback
        // Let the application know we're loading something
        store.dispatch(setCompositionPreFetchLoading(true))
    }
}

export const setUpIFrameListener = (store) => {
    // Forward clicks to reset session timeouts
    if (getNotifyActivity()) {
        window.addEventListener('click', () => messageParent({ type: msgTypes.USER_ACTIVITY }), {
            capture: true,
            passive: true,
        })
    }

    // Listen for messages sent to our app
    window.addEventListener('message', (message) => {
        if (
            process.env.GATSBY_MAGICWINDOW_ORIGIN !== '*' &&
            message.origin !== process.env.GATSBY_MAGICWINDOW_ORIGIN &&
            message.origin !== process.env.GATSBY_PARTNER_PORTAL_ORIGIN
        ) {
            return
        }
        switch (message.data.type) {
            case msgTypes.GET_TOKENS_RESPONSE:
                store.dispatch(receiveIkeaTokens(message.data.tokens))
                break
            case msgTypes.STORE_SELECTION_UPDATED: {
                const { zipcode, storeId } = message.data
                let updatedZipcode = zipcode
                if (zipcode) {
                    // remove spaces from zipcode
                    updatedZipcode = zipcode.split(' ').join('')
                }
                store.dispatch(updateLocation({ zipcode: updatedZipcode, storeId }))
                break
            }
            case msgTypes.STORE_SELECTION_CHANGE_ZIP_CODE: {
                const { zipcode } = message.data
                let updatedZipcode = zipcode
                if (zipcode) {
                    // remove spaces from zipcode
                    updatedZipcode = zipcode.split(' ').join('')
                }
                store.dispatch(updateLocation({ zipcode: updatedZipcode }))
                break
            }
            case msgTypes.STORE_SELECTION_CHANGE_STORE_ID: {
                const { storeId } = message.data
                store.dispatch(updateLocation({ storeId }))
                break
            }
            case msgTypes.REQUEST_PRODUCT_LIST: {
                store.dispatch(requestProductList())
                break
            }
            case msgTypes.STASH_COMPOSITION: {
                store.dispatch(saveSelectedCompositionToLocalStorage())
                break
            }
            default:
                break
        }
    })
}

export const setupBrowserNavigationListener = (store) => {
    window.addEventListener('popstate', () => {
        if (window.history.state?.preserveCurrentCompositionState) {
            return
        }

        const { compositionId } = getRouteCompositionIds()
        const isSaved = getIsSaved(store.getState())
        if (compositionId && isSaved) {
            store.dispatch(resetCompositionToLatestSavedState(compositionId))
        }
    })
}
