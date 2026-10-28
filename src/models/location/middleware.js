import * as types from 'models/actionTypes'
import { withPrefix } from 'gatsby'
import qs from 'qs'

import { FURNITURE_ITEM } from 'constants/renderItemTypes'
import {
    getSearch,
    getDebugFurnitureId,
    getDefaultRedirectUrl,
    getDebugFurnitureModelUrl,
    getApiPrefix,
    getSaveOnFirstRender,
    getReturnUrl,
    getHash,
    getDebugGeometryData,
    getWindow,
} from 'models/location/selectors'
import { clickPlaceRenderItem, resetPlaceProduct } from 'models/compositions/actions'
import { reset } from 'utils/tracker'
import { NEW_COMPOSITION_ID } from 'models/compositions/constants'
import { openDesignLab } from 'models/ui/actions'

import {
    PARAM_SAVEONFIRSTRENDER,
    PARAM_ROOM_TYPE,
    PARAM_FURNISHING_TYPE,
    PARAM_SEARCH_QUERY,
    PARAM_SEARCH_CATEGORYID,
} from './constants'

const locationMiddleware = (store) => (next) => (action) => {
    switch (action.type) {
        case types.FURNITURE_FILTER_UPDATE: {
            // TODO make generic
            if (action.filter.collection) {
                const search =
                    action.filter.collection === '*' ? null : qs.stringify({ collection: action.filter.collection })

                if (window && window.history) {
                    window.history.replaceState('', '', withPrefix(`/?${search}#${getHash()}`))
                }
            }
            break
        }

        case types.RENDERER_READY: {
            const debugModelUrl = getDebugFurnitureModelUrl(store.getState())
            const debugGeometryData = getDebugGeometryData(store.getState())

            let debugFurnitureId
            if (debugGeometryData) {
                debugFurnitureId = debugGeometryData.id
            } else if (debugModelUrl) {
                debugFurnitureId = 1
            } else {
                debugFurnitureId = getDebugFurnitureId(store.getState())
            }
            if (debugFurnitureId) {
                store.dispatch(
                    clickPlaceRenderItem(NEW_COMPOSITION_ID, debugFurnitureId, {
                        id: debugFurnitureId,
                        heading: 0,
                        renderType: FURNITURE_ITEM,
                    }),
                )
            }
            break
        }
        case types.LOGOUT_USER: {
            const redirect = getDefaultRedirectUrl()
            reset().then(() => {
                window.location.href = `${getApiPrefix()}/auth/logout?redirectUrl=${redirect}`
            })
            break
        }
        case types.RELOAD_PAGE: {
            window.location.reload()
            break
        }
        case types.RECEIVE_SAVE_COMPOSITION: {
            const state = store.getState()
            // Clear the autosave param after saving
            if (getSaveOnFirstRender(state)) {
                const nextSearch = new URLSearchParams(getSearch(state))
                nextSearch.delete(PARAM_SAVEONFIRSTRENDER)
                if (getWindow().history) {
                    const hashString = getHash()
                    getWindow().history.replaceState(
                        {},
                        '',
                        `?${nextSearch.toString()}${hashString ? `#${hashString}` : ''}`,
                    )
                }
            }
            break
        }
        case types.EXIT_DESIGN: {
            const returnUrl = getReturnUrl(store.getState())
            if (returnUrl) {
                window.open(returnUrl, '_top')
            } else {
                store.dispatch(openDesignLab())
            }
            store.dispatch(resetPlaceProduct())
            break
        }
        case types.FILTER_SHOWROOMS:
        case types.FILTER_FURNISHING_TYPE: {
            const filterString = action.payload
            const urlParam = action.type === types.FILTER_SHOWROOMS ? PARAM_ROOM_TYPE : PARAM_FURNISHING_TYPE

            const nextSearch = new URLSearchParams(getSearch())
            nextSearch.set(urlParam, filterString)

            // We are not using navigate here because this takes
            // the scroll position to the top of the page.
            if (window && window.history) {
                const hashString = getHash()
                window.history.replaceState({}, '', `?${nextSearch.toString()}${hashString ? `#${hashString}` : ''}`)
            }

            break
        }
        case types.FURNITURE_SEARCH_CLEAR: {
            const nextSearch = new URLSearchParams(getSearch())
            const queryParam = nextSearch.get(PARAM_SEARCH_QUERY)
            const categoryIdParam = nextSearch.get(PARAM_SEARCH_CATEGORYID)

            if (queryParam) {
                nextSearch.delete(PARAM_SEARCH_QUERY)
            }

            if (categoryIdParam) {
                nextSearch.delete(PARAM_SEARCH_CATEGORYID)
            }

            if (queryParam || categoryIdParam) {
                window.history.replaceState({}, '', `?${nextSearch.toString()}`)
            }
            break
        }
        default:
            break
    }
    return next(action)
}

export default locationMiddleware
