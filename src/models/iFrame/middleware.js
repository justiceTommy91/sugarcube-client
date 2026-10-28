import * as types from 'models/actionTypes'
import * as msgTypes from 'models/iFrame/msgTypes'
import { actionTypes as addToBagActionTypes } from 'features/shopping-bag/redux/actions'
import { setResumeParam } from 'models/iFrame/actions'
import { getIsIFrame, getSkipAuth, usesDevAuth } from 'models/location/selectors'
import { getSelectedCompositionTrackingRoomInfo, getProductListWithNumbers } from 'models/compositions/selectors'
import { getTestingEnv } from 'utils/environment'
import { selectStore, selectZipcode, storeSelection } from 'services/storeSelection'
import { updateLocation } from 'models/furniture/actions'
import { getFurnitureById, getFurnitureByUniqueId } from 'models/furniture/selectors'
import { getIkeaTokens } from 'services/user'
import { receiveIkeaTokens } from 'models/tokens/actions'
import { requestUser, skipFetchUser } from 'models/user/actions'
import { messageParent } from 'utils/iframe'

const isTestingEnv = getTestingEnv()

const iFrameMiddleware = (store) => (next) => (action) => {
    const state = store.getState()
    const returnState = next(action)
    const isInIframe = getIsIFrame()

    switch (action.type) {
        case types.NEW_IFRAME_MESSAGE: {
            const { message } = action
            messageParent(message)
            break
        }
        case types.REQUEST_IKEA_TOKENS: {
            if (usesDevAuth()) {
                if (isInIframe && getSkipAuth(state)) {
                    store.dispatch(skipFetchUser())
                } else {
                    store.dispatch(receiveIkeaTokens({}))
                }
                break
            }

            if (isInIframe) {
                if (getSkipAuth(state)) {
                    store.dispatch(skipFetchUser())
                } else {
                    messageParent({ type: msgTypes.GET_TOKENS })
                }
            } else {
                getIkeaTokens()
                    .then((tokens) => store.dispatch(receiveIkeaTokens(tokens)))
                    .catch(() => store.dispatch(requestUser()))
            }
            break
        }
        case types.SET_MAGIC_WINDOW_LOADING: {
            if (!action.isMagicWindowLoading) {
                messageParent({ type: msgTypes.MAGIC_WINDOW_LOADED })
            }
            break
        }
        case types.DELETE_COMPOSITION_RENDER_ITEM: {
            const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
            const roomSource = roomInfo && roomInfo.RoomSource
            const roomSourceLabel = roomSource ? `|${roomSource}` : ''
            const { trackingInfo } = action.payload
            if (trackingInfo && !trackingInfo.hidden && !isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: 'remove_product',
                    label: `${trackingInfo.LocalItemNumber}${roomSourceLabel}`,
                })
            }
            break
        }
        case types.PLACE_RENDER_ITEM: {
            const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
            const roomSource = roomInfo && roomInfo.RoomSource
            const roomSourceLabel = roomSource ? `|${roomSource}` : ''
            const { trackingInfo, settings: { hidden = false } = {} } = action.payload
            if (trackingInfo && !hidden && !isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: 'add_product',
                    label: `${trackingInfo.LocalItemNumber}${roomSourceLabel}`,
                })
            }
            break
        }
        case types.UPDATE_COMPOSITION_RENDER_ITEM: {
            const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
            const roomSource = roomInfo && roomInfo.RoomSource
            const roomSourceLabel = roomSource ? `|${roomSource}` : ''
            const { trackingInfo } = action.payload
            if (trackingInfo && !trackingInfo.hidden && !isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: 'move_product',
                    label: `${trackingInfo.LocalItemNumber}${roomSourceLabel}`,
                })
            }
            break
        }
        case types.RECEIVE_SAVE_COMPOSITION: {
            const { compositionId, originId } = action.payload
            const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
            const roomSource = roomInfo && roomInfo.RoomSource
            const roomSourceLabel = roomSource ? `|${roomSource}` : ''
            if (!isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: 'save',
                    label: `${originId}|${compositionId}${roomSourceLabel}`,
                })
            }

            break
        }
        case addToBagActionTypes.ADD_TO_BAG: {
            const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
            const roomSource = roomInfo && roomInfo.RoomSource
            const roomSourceLabel = roomSource ? `|${roomSource}` : ''
            const { trackingInfo, localItemNumber } = action.payload
            if (trackingInfo && localItemNumber && !isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: 'add_to_bag',
                    label: `${localItemNumber}${roomSourceLabel}`,
                })
            }
            break
        }
        case types.REQUEST_PRODUCT_LIST: {
            const productListMap = getProductListWithNumbers(state)
            messageParent({
                type: msgTypes.SEND_PRODUCT_LIST,
                method: msgTypes.SEND_PRODUCT_LIST,
                productListMap,
            })
            break
        }

        case addToBagActionTypes.ADD_ROOM_TO_BAG: {
            const { localItemNumbers, trackingInfo } = action.payload
            const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
            const roomSource = roomInfo && roomInfo.RoomSource
            const roomSourceLabel = roomSource ? `|${roomSource}` : ''
            const label = `${localItemNumbers.toString()}${roomSourceLabel}`

            if (trackingInfo && localItemNumbers && localItemNumbers.length && !isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: 'add_room_to_bag',
                    label,
                })
            }
            break
        }

        case types.TRACK_SHOW_DETAILS: {
            const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
            const roomSource = roomInfo && roomInfo.RoomSource
            const roomSourceLabel = roomSource ? `|${roomSource}` : ''
            const { trackingInfo } = action
            // Only track when there is a productId/title/accessFrom fields
            if (trackingInfo && trackingInfo.LocalItemNumber && !isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: 'get_additional_details',
                    label: `${trackingInfo.LocalItemNumber}${roomSourceLabel}`,
                })
            }
            break
        }
        case types.TOGGLE_FAVORITE: {
            const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
            const roomSource = roomInfo && roomInfo.RoomSource
            const roomSourceLabel = roomSource ? `|${roomSource}` : ''
            const { isFavorite, localItemNumber } = action.payload
            const gaAction = isFavorite ? 'add_favorite' : 'remove_favorite'
            if (localItemNumber && !isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: gaAction,
                    label: `${localItemNumber}${roomSourceLabel}`,
                })
            }
            break
        }
        case types.REQUEST_LOGIN_PAGE: {
            messageParent(setResumeParam())
            break
        }
        case types.SWAP_RENDER_ITEM: {
            const { furnitureToSwapOut, productToSwapIn } = action.payload
            const swappedInLocalItemNo = getFurnitureById(state)[productToSwapIn]?.localItemNumber
            const swappedOutLocalItemNo = getFurnitureByUniqueId(state, furnitureToSwapOut)?.localItemNumber
            const roomInfo = getSelectedCompositionTrackingRoomInfo(state)
            const roomSource = roomInfo && roomInfo.RoomSource
            const roomSourceLabel = roomSource ? `|${roomSource}` : ''
            if (swappedInLocalItemNo && !isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: 'add_product',
                    label: `${swappedInLocalItemNo}${roomSourceLabel}`,
                })
            }

            if (swappedOutLocalItemNo && !isTestingEnv) {
                messageParent({
                    type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                    action: 'remove_product',
                    label: `${swappedOutLocalItemNo}${roomSourceLabel}`,
                })
            }

            break
        }
        case types.REQUEST_STORE_SELECTION:
            if (isInIframe) {
                messageParent({ type: msgTypes.REQUEST_STORE_SELECTION })
            } else {
                storeSelection().then((selection) => store.dispatch(updateLocation(selection)))
            }
            break
        case types.REQUEST_STORE_SELECTION_CHANGE:
            if (action.isZip) {
                if (isInIframe) {
                    messageParent({ type: msgTypes.REQUEST_POSTALCODE_PICKER })
                } else {
                    selectZipcode().then((zipcode) => store.dispatch(updateLocation({ zipcode })))
                }
            } else if (isInIframe) {
                messageParent({ type: msgTypes.REQUEST_STORE_SELECTION_CHANGE })
            } else {
                selectStore().then((storeId) => store.dispatch(updateLocation({ storeId })))
            }
            break
        case types.TRACK_GA_EVENT: {
            if (!isTestingEnv) {
                const { trackingInfo } = action
                if (trackingInfo?.action) {
                    messageParent({
                        type: msgTypes.MAGIC_WINDOW_GA_TRACKING,
                        action: trackingInfo.action,
                        label: trackingInfo.label,
                        custom: trackingInfo.custom,
                    })
                }
            }
            break
        }

        default:
            break
    }
    return returnState
}

export default iFrameMiddleware
