import * as types from 'models/actionTypes'

export const setVariants = (variants, id) => ({
    type: types.SET_VARIANTS,
    id,
    variants,
})

export const setVariantSelected = (variantCategoryIndex) => ({
    type: types.SET_VARIANT_SELECTED,
    variantCategoryIndex,
})
