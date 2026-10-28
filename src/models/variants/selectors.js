import { getSelectedFurnitureData, getFurnitureById, getSwapAnchorId } from 'models/furniture/selectors'
import { createSelector } from 'reselect'
import { getFurnitureVariantOptions } from './helpers'

const getById = (state) => state.variants.byId
export const getSelectedVariant = (state) => state.variants.selectedVariant

export const getIsVariantsLoading = (state) => state.variants.isVariantsLoading

export const getVariantsById = createSelector([getById], (itemsById) => itemsById)

export const getSelectedFurnitureVariants = createSelector(
    [getSelectedFurnitureData, getVariantsById, getFurnitureById],
    (selectedFurnitureData, variantsById, furnitureById) => {
        if (
            !selectedFurnitureData ||
            !selectedFurnitureData.variants ||
            !variantsById[selectedFurnitureData.variants] ||
            !selectedFurnitureData.variantsSelected ||
            !selectedFurnitureData.variantsSelected.length
        ) {
            return null
        }
        const variantsData = variantsById[selectedFurnitureData.variants]
        const variantOptions = getFurnitureVariantOptions(
            variantsData,
            selectedFurnitureData.id,
            selectedFurnitureData.variantsSelected,
            selectedFurnitureData.priceNumeral,
        )

        return variantOptions.map((variant) => {
            const { options, showThumbnail } = variant
            const updatedOptions = options.map((option) => {
                const { productId } = option
                const furnitureData = productId ? furnitureById[productId] : {}
                const { thumbUrl = null } = furnitureData
                return {
                    ...option,
                    thumbUrl: showThumbnail ? thumbUrl : null,
                    furnitureData,
                }
            })

            return {
                ...variant,
                options: updatedOptions,
            }
        })
    },
)

export const getSelectedFurnitureVariantCategory = createSelector(
    [getSelectedFurnitureVariants, getSelectedVariant],
    (variantOptions, variantCategoryIndex) => {
        if (variantCategoryIndex === null || !(variantOptions && variantOptions.length)) {
            return null
        }

        return variantOptions[variantCategoryIndex]
    },
)

export const getVariantSwapped = createSelector(
    [getSelectedFurnitureData, getVariantsById, getSwapAnchorId],
    (selectedFurnitureData, variantsById, swapAnchorId) => {
        if (
            !selectedFurnitureData ||
            !selectedFurnitureData.variants ||
            !variantsById[selectedFurnitureData.variants] ||
            !selectedFurnitureData.variantsSelected ||
            !selectedFurnitureData.variantsSelected.length ||
            !swapAnchorId
        ) {
            return false
        }

        const { variantsArray } = variantsById[selectedFurnitureData.variants]
        const variantProductIds = variantsArray.flat(Infinity)

        return variantProductIds?.length ? variantProductIds.includes(swapAnchorId) : false
    },
)
