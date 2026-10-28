import { createSelector } from 'reselect'
import CATEGORIES_LIST from './categories.json'

/**
 * Enriches a flat category object with parent category IDs from a tree structure.
 * For each subcategory in the tree, if it exists in the flat object, adds the parent category's key as categoryId.
 *
 * @param {Array} tree - Array of category objects with subCategories arrays
 * @param {Object} flat - Flat object with category keys as properties
 * @returns {Record<string, ContextualCategory>} Enriched flat object with categoryId added to subcategories
 */
export function enrichCategories(tree, flat) {
    const enriched = { ...flat }

    tree.forEach((cat) => {
        ;(cat.subCategories || []).forEach((sub) => {
            if (enriched[sub.key]) {
                enriched[sub.key] = {
                    ...enriched[sub.key],
                    categoryId: cat.key,
                }
            }
        })
    })

    return enriched
}

export const getRoomTypeFromHardcodedCategories = createSelector([(state) => state.referrer], (referrerState) => {
    const { categoryId } = referrerState || {}
    if (!categoryId) return null

    const categories = CATEGORIES_LIST
    const matched = categories[categoryId]
    const roomType = matched?.roomType?.toUpperCase()
    return roomType
})

/**
 * Determines the referrer context based on individual parameters.
 *
 * @param {string | null} productId - The product ID to check
 * @param {string | null} categoryId - The category ID to check
 * @param {string | null} queryTerm - The query term to check
 * @param {string | null} queryTermCategoryId - The query term category ID to check
 * @returns {import('./types').ReferrerContext} The determined context object or null
 */
export function determineReferrerContext(
    productId = null,
    categoryId = null,
    queryTerm = null,
    queryTermCategoryId = null,
) {
    if (productId) {
        return { type: 'product', value: productId }
    }

    // QueryTerm can have a category ID - this check is to avoid 'queryTerm' context not get into 'category' context
    if (categoryId && !queryTerm) {
        return { type: 'category', value: categoryId }
    }

    if (queryTerm || queryTermCategoryId) {
        return { type: 'queryTerm', value: queryTerm }
    }

    return null
}
