import { getLocalizedCurrencyString } from 'utils/convertCurrency'
import { getLocale } from 'models/location/selectors'
import { SHOW_THUMBNAIL_VARIANT_KEYS } from './constants'

// Explanation about variantsArray:
// variantsArray is an array of arrays that whose dimensions match the variant categoris and their values.
// For example, if there are 3 variant categories with varying number of values, like this,
//   'color' (black/white),
//   'size' (full/queen/king),
//   'bed base' (luroy/lonset)
// variantArray will be an array of 2 arrays, which contain the product id's with two colors (black/white).
// The next category is nested inside the first category arrays. Since size has 2 values, inside each color
// value array, we have two arrays, each of which contain the product values for bed base.
// variantsArray looks like this:
//    [
//      // color black product id's
//      [
//         // sizes full
//         [
//            <lonset productid>, <luroy product id>
//         ],
//         // sizes queen
//         [
//            <lonset productid>, <luroy product id>
//         ],
//         // sizes king
//         [
//            <lonset productid>, <luroy product id>
//         ]
//      ],
//      // color white product id's
//      [
//         // sizes full
//         [
//            <lonset productid>, <luroy product id>
//         ],
//         // sizes queen
//         [
//            <lonset productid>, <luroy product id>
//         ],
//         // sizes king
//         [
//            <lonset productid>, <luroy product id>
//         ]
//      ]
//    ]

// Get the product id from the variantsArray, based on the currently selected variants.
// To access an item in a nested array structure that is number of categories deep,
// we use an array item pointer to retrieve the correct productId
const getProductId = (variantsArray, selectedIndices, valueIndex, variantIndex) => {
    // Initialize array item pointer to point to the entire array
    let arrayItemPointer = variantsArray

    // selectedIndices array has a length of the number of variant categories
    for (let i = 0; i < selectedIndices.length; i += 1) {
        // variantsArray might have a null entry for a category that has no models
        if (!arrayItemPointer) {
            return null
        }
        if (i === variantIndex) {
            arrayItemPointer = arrayItemPointer[valueIndex]
        } else {
            arrayItemPointer = arrayItemPointer[selectedIndices[i]]
        }
    }

    // Return the product id
    return arrayItemPointer
}

// This function returns the list of variant options: an array of options for each variant category.
// Each category in this array contains the metadata for that category like typeName/showThumbnail and
// a list of options of values for that category.
// The values of productIds in this options array will depend on what is already selected.
// For the beds variants example (see above explanation of variantsArray), if the selected values
// are black, queen size, lonset, and the user now uses the white color bed, the productIds for
// size and base categories are updated to reflect the change in color.
export const getFurnitureVariantOptions = (
    variantsData,
    selectedFurnitureId,
    selectedIndices,
    selectedFurniturePrice,
) => {
    const { variantTypes, variantsArray } = variantsData
    if (!variantTypes || !variantTypes.length) {
        return null
    }

    const onlyOneVariantType = variantTypes.length === 1
    return variantTypes.map((variant, variantIndex) => {
        const { type, typeName, showThumbnail, values, fallbackProductIds } = variant

        const options = values.map((valueKey, valueIndex) => {
            // For the case where we have only 1 variant, we do not need to use selected indices of the
            // other variants to determine the productId.
            // For greater than one variant, the product ids will depend on what is already selected in
            // other categories. Use the getProductId function to get the correct product id.
            const productId = onlyOneVariantType
                ? variantsArray[0][valueIndex]
                : getProductId(variantsArray, selectedIndices, valueIndex, variantIndex)

            // Fallback to get the image for the category, even if it's not available.
            // if the product id doesn't match with the current variants indices we are getting
            // the first item just to display an image and disable it.
            const fallbackProductId = fallbackProductIds[valueIndex] || null
            return {
                valueKey,
                productId: productId || fallbackProductId,
                disabled: !productId,
                selected: selectedFurnitureId === productId,
            }
        })

        if (options.length === 1) {
            return null
        }

        return {
            type,
            typeName,
            showThumbnail,
            options,
            selectedFurniturePrice,
        }
    })
}

export const processFurnitureVariants = (variants) => {
    const variantCategoryKeys = Object.getOwnPropertyNames(variants)
    const variantsData = variantCategoryKeys.reduce(
        (accumulator, currentVariantKey) => {
            const { typeName, values } = variants[currentVariantKey]
            const showThumbnail = SHOW_THUMBNAIL_VARIANT_KEYS.includes(currentVariantKey)

            if (values.length > 1) {
                if (showThumbnail) {
                    accumulator.variantTypes.unshift({
                        type: currentVariantKey,
                        typeName,
                        values: values.map((item) => item.value),
                        showThumbnail,
                        fallbackProductIds: values.map((item) => item.items?.[0]),
                    })
                } else {
                    accumulator.variantTypes.push({
                        type: currentVariantKey,
                        typeName,
                        values: values.map((item) => item.value),
                        showThumbnail,
                        fallbackProductIds: values.map((item) => item.items?.[0]),
                    })
                }
            }

            return accumulator
        },
        {
            variantTypes: [],
        },
    )

    const { variantTypes } = variantsData
    const { values, type } = variantTypes[0]

    const numVariantCategories = variantTypes.length

    const variantsArray = []
    const selectedIndices = {}

    // Create variantsArray, an array of arrays holding productIds values for variant categories
    if (numVariantCategories === 1) {
        variantsArray[0] = variants[type].values.map((value, index) => {
            const { items } = value
            selectedIndices[items[0]] = [index]
            return items[0]
        })
    } else {
        // Store the index postions for each product variant value in a separate positions array.
        // This array is used later to set the productId in the correct position in variantsArray.
        const positions = new Array(numVariantCategories).fill(null)

        // Iterate over all product ids in the first category
        for (let valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
            positions[0] = valueIndex
            const { items } = variants[type].values[valueIndex]

            for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
                const item = items[itemIndex]
                // iterate over variant categories starting at the next category (categoryIndex = 1)
                for (let categoryIndex = 1; categoryIndex < numVariantCategories; categoryIndex += 1) {
                    const { values: searchValues, type: searchType } = variantTypes[categoryIndex]

                    let foundItem = false
                    for (
                        let searchValueIndex = 0;
                        searchValueIndex < searchValues.length && !foundItem;
                        searchValueIndex += 1
                    ) {
                        const { items: searchItems } = variants[searchType].values[searchValueIndex]
                        const found = searchItems.indexOf(item)

                        if (found > -1) {
                            if (searchValueIndex === numVariantCategories.length - 1) {
                                positions[categoryIndex] = found
                            } else {
                                positions[categoryIndex] = searchValueIndex
                            }
                            foundItem = true
                        }
                    }
                }

                // Get a pointer to the array in which we have to set the product id
                // Start with pointing to the entire variantsArray
                let arrayPointer = variantsArray

                // Traverse the variantsArray until we are at the last positions value
                for (let i = 0; i < positions.length - 1; i += 1) {
                    if (!arrayPointer[positions[i]]) {
                        arrayPointer[positions[i]] = new Array(variantTypes[i + 1].values.length).fill(null)
                    }
                    arrayPointer = arrayPointer[positions[i]]
                }

                // set the productId in variantsArray
                arrayPointer[positions[positions.length - 1]] = item
                selectedIndices[item] = [...positions]
            }
        }
    }

    variantsData.variantsArray = variantsArray
    variantsData.selectedIndices = selectedIndices

    return variantsData
}

export const getTotalPricePreview = (furniturePrice, selectedFurniturePrice) => {
    if (!furniturePrice) {
        return undefined
    }
    const totalPriceNumeral = furniturePrice - selectedFurniturePrice

    if (!totalPriceNumeral) {
        return undefined
    }

    const formattedPrice = getLocalizedCurrencyString(Math.abs(totalPriceNumeral), getLocale())
    const sign = totalPriceNumeral > 0 ? '+' : '-'
    return `${sign} ${formattedPrice}`
}

export default processFurnitureVariants
