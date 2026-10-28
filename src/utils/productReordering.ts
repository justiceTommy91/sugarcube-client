import type { RenderItemComplete } from 'models/compositions'

/**
 * Reorders products by distributing duplicates of the same name throughout the results.
 * Uses a round-robin algorithm to distribute products with the same name.
 *
 * Example:
 * Input: [Billy, Billy, Billy, Hemnes, Hemnes, Kallax]
 * Output: [Billy, Hemnes, Kallax, Billy, Hemnes, Billy]
 *
 * @param products Array of products to reorder
 * @returns Reordered array with duplicate names distributed
 */
export function reorderByUniqueName(products: RenderItemComplete[]): RenderItemComplete[] {
    if (products.length <= 1) {
        return products
    }

    // Group products by name
    const productsByName = new Map<string, RenderItemComplete[]>()

    products.forEach((product) => {
        const name = product.name
        const existing = productsByName.get(name)
        if (existing) {
            existing.push(product)
        } else {
            productsByName.set(name, [product])
        }
    })

    // If all products have unique names, no reordering needed
    if (productsByName.size === products.length) {
        return products
    }

    // Round-robin distribution
    const result: RenderItemComplete[] = []
    const groups = Array.from(productsByName.values())

    // Keep distributing until all groups are empty
    let continueDistributing = true
    while (continueDistributing) {
        let addedInThisRound = false

        // Process each group in order
        let groupIndex = 0
        while (groupIndex < groups.length) {
            const group = groups[groupIndex]
            if (group && group.length > 0) {
                const product = group.shift()
                if (product) {
                    result.push(product)
                    addedInThisRound = true
                }
            }
            groupIndex += 1
        }

        continueDistributing = addedInThisRound
    }

    return result
}
