import type { Middleware } from 'redux'

import type { RootState } from 'store'

import {
    CTX_LOSS_COUNT_LABEL,
    FURNITURE_SWAP_COUNT,
    FURNITURE_ADD_COUNT,
    ADD_FURNITURE_SUBCATEGORY,
    TOOLTIP_HOVER_COUNT,
} from 'models/sessionStorage/constants'
import {
    getCompositionCtxLossCount,
    getFurnitureAddCount,
    getFurnitureSwapCount,
    getSessionAddedSubCategories,
    getTooltipHoverCount,
} from 'models/sessionStorage/selectors'

import * as types from 'models/actionTypes'

const sessionStorageMiddleware: Middleware<null, RootState> = (store) => (next) => (action) => {
    let nextAction = action
    switch (action.type) {
        case types.INCREMENT_COMPOSITION_CTX_LOSS_COUNT: {
            try {
                const ctxLossCount = getCompositionCtxLossCount(store.getState())
                window.sessionStorage.setItem(
                    CTX_LOSS_COUNT_LABEL,
                    JSON.stringify({
                        timestamp: Date.now(),
                        i: ctxLossCount + 1,
                    }),
                )
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.CLEAR_COMPOSITION_CTX_LOSS_COUNT: {
            try {
                window.sessionStorage.removeItem(CTX_LOSS_COUNT_LABEL)
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.DISMISS_FINAL_PRICE_MESSAGE:
            nextAction = {
                ...nextAction,
            }
            window.sessionStorage.setItem(types.SEEN_FINAL_PRICE_MESSAGE, nextAction.seenFinalPriceMessage)
            break
        case types.SWAP_RENDER_ITEM:
        case types.INCREMENT_FURNITURE_SWAP_COUNT: {
            try {
                const swapCount = getFurnitureSwapCount()
                const incrementCount = Number(swapCount) + 1
                window.sessionStorage.setItem(FURNITURE_SWAP_COUNT, JSON.stringify(incrementCount))
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.INCREMENT_FURNITURE_ADD_COUNT: {
            try {
                const addCount = getFurnitureAddCount()
                const incrementCount = Number(addCount) + 1
                window.sessionStorage.setItem(FURNITURE_ADD_COUNT, JSON.stringify(incrementCount))
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.INCREMENT_TOOLTIP_HOVER_COUNT: {
            try {
                const hoverCount = getTooltipHoverCount()
                const incrementCount = Number(hoverCount) + 1
                window.sessionStorage.setItem(TOOLTIP_HOVER_COUNT, JSON.stringify(incrementCount))
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.HAS_USED_ERASER: {
            nextAction = {
                ...nextAction,
                hasUsedEraser: true,
            }
            window.sessionStorage.setItem(types.HAS_USED_ERASER, nextAction.hasUsedEraser)
            break
        }
        case types.INCREMENT_STORAGED_SUBCATEGORY_IDS: {
            const subcategoryIds = action.payload?.subCategoryIds || []
            const existingIds = getSessionAddedSubCategories() || []
            const updatedSubcategoryIds = new Set([...existingIds, ...subcategoryIds])
            window.sessionStorage.setItem(ADD_FURNITURE_SUBCATEGORY, JSON.stringify(Array.from(updatedSubcategoryIds)))
            break
        }
        case types.SKIP_FEEDBACK_FORM:
        case types.SUBMIT_FEEDBACK_FORM:
        default:
            break
    }
    return next(nextAction)
}

export default sessionStorageMiddleware
