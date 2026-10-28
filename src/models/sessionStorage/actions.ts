import { createAction } from '@reduxjs/toolkit'
import * as types from 'models/actionTypes'
import { ProductData } from 'models/furniture'

export const incrementCompositionCtxLossCount = createAction(types.INCREMENT_COMPOSITION_CTX_LOSS_COUNT)

export const clearCompositionCtxLossCount = createAction(types.CLEAR_COMPOSITION_CTX_LOSS_COUNT)

export const dismissFinalPriceMessage = createAction(types.DISMISS_FINAL_PRICE_MESSAGE)

export const incrementFurnitureSwapCount = createAction(types.INCREMENT_FURNITURE_SWAP_COUNT)

export const incrementFurnitureAddCount = createAction(types.INCREMENT_FURNITURE_ADD_COUNT)

export const incrementTooltipHoverCount = createAction(types.INCREMENT_TOOLTIP_HOVER_COUNT)

export const hasUsedEraser = createAction(types.HAS_USED_ERASER)

export const addStoragedSubcategoryId = createAction(
    types.INCREMENT_STORAGED_SUBCATEGORY_IDS,
    (subCategoryIds: ProductData['subCategoryIds']) => ({
        payload: {
            subCategoryIds,
        },
    }),
)
