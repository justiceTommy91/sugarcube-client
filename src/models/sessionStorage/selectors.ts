import type { RootState } from 'store'
import { getDebugSettings } from 'models/admin/selectors'

import {
    ADD_FURNITURE_SUBCATEGORY,
    CTX_LOSS_COUNT_LABEL,
    FURNITURE_ADD_COUNT,
    FURNITURE_SWAP_COUNT,
    TOOLTIP_HOVER_COUNT,
} from 'models/sessionStorage/constants'
import { HAS_USED_ERASER, SEEN_FINAL_PRICE_MESSAGE } from 'models/actionTypes'
import { AfterFoldSessionKeyType } from '.'

export const getCompositionCtxLossCount = (state: RootState) => {
    try {
        const saveCtxString = window.sessionStorage.getItem(CTX_LOSS_COUNT_LABEL)
        if (!saveCtxString) {
            return 0
        }
        const saveCtxData = JSON.parse(saveCtxString)
        if (Date.now() - saveCtxData.timestamp > getDebugSettings(state).ctxLossFrequencyWindow * 1000) {
            return 0
        }
        return saveCtxData.i
    } catch (error) {
        return 0
    }
}

export const getFurnitureSwapCount = () => {
    try {
        const savedCount = window.sessionStorage.getItem(FURNITURE_SWAP_COUNT)
        if (!savedCount) {
            return 0
        }
        const swapCount = JSON.parse(savedCount)
        return swapCount
    } catch (error) {
        return 0
    }
}

export const getFurnitureAddCount = (): number => {
    try {
        const savedCount = window.sessionStorage.getItem(FURNITURE_ADD_COUNT)
        if (!savedCount) {
            return 0
        }
        const addCount = JSON.parse(savedCount)
        return addCount
    } catch (error) {
        return 0
    }
}

export const getSeenFinalPriceMessage = () => {
    try {
        return !!window.sessionStorage.getItem(SEEN_FINAL_PRICE_MESSAGE)
    } catch (error) {
        return false
    }
}

export const getHasUsedEraser = () => {
    try {
        return !!window.sessionStorage.getItem(HAS_USED_ERASER)
    } catch (error) {
        return false
    }
}

export const getSessionAddedSubCategories = (byId?: string) => {
    try {
        const addedSubcategories = window.sessionStorage.getItem(ADD_FURNITURE_SUBCATEGORY)
        if (!addedSubcategories) {
            return false
        }

        if (byId) {
            return !!JSON.parse(addedSubcategories).find((subcategory: string) => subcategory === byId)
        }

        return JSON.parse(addedSubcategories)
    } catch (error) {
        return []
    }
}

export const getUserScrolledFold = (type: AfterFoldSessionKeyType) => {
    try {
        return !!window.sessionStorage.getItem(type)
    } catch (error) {
        return false
    }
}

export const getTooltipHoverCount = (): number => {
    try {
        const savedCount = window.sessionStorage.getItem(TOOLTIP_HOVER_COUNT)
        if (!savedCount) {
            return 0
        }
        return JSON.parse(savedCount)
    } catch (error) {
        return 0
    }
}
