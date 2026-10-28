import { combineReducers } from 'redux'
import * as types from 'models/actionTypes'

export const initialState = {
    byId: {},
    isVariantsLoading: false,
    selectedVariant: null,
}

export const byId = (state = initialState.byId, action) => {
    switch (action.type) {
        case types.SET_VARIANTS: {
            const { variants, id } = action
            return {
                ...state,
                [id]: variants,
            }
        }

        default:
            return state
    }
}

export const isVariantsLoading = (state = initialState.isVariantsLoading, action) => {
    switch (action.type) {
        case types.REQUEST_FURNITURE_VARIANTS_SAGA:
            return true
        case types.RECEIVE_FURNITURE_VARIANTS:
        case types.FAILED_RECEIVE_FURNITURE_VARIANTS:
            return false
        default:
            return state
    }
}

export const selectedVariant = (state = initialState.selectedVariant, action) => {
    const { variantCategoryIndex } = action
    switch (action.type) {
        case types.SELECT_FURNITURE:
            return null
        case types.SET_VARIANT_SELECTED:
            return variantCategoryIndex
        default:
            return state
    }
}
export default combineReducers({
    byId,
    isVariantsLoading,
    selectedVariant,
})
