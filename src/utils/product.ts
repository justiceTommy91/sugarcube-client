import { LOCALES_USING_IMPERIAL_SYSTEM } from 'models/location/constants'

type MeasureReference = {
    metric?: string
    imperial?: string
}

type ProductLike = {
    typeName?: string
    validDesign?: string
    description?: string
    measureReference?: MeasureReference
    region?: string
}

/**
 * Generate product description from typeName and validDesign.
 * Uses IKEA's pattern: filters out falsy values and joins with comma.
 * Falls back to the original product description if no valid fields are available.
 * Appends measureReference at the end based on the locale (imperial vs metric).
 * Shows only the preferred measurement system for the locale (imperial for US/CA, metric for others).
 * If metric and imperial are identical, shows the measurement only once.
 * Reference: https://github.com/ingka-group-digital/pip-components/blob/e997e4d7cb7ed74adc3b59571f475bfaa4a9d32d/packages/pip-price-parser/src/product.ts#L229C3-L229C93
 *
 * @example
 * generateProductDescription({ typeName: 'table', validDesign: 'birch veneer' })
 * // Returns: "Table, birch veneer"
 *
 * @example
 * generateProductDescription({ typeName: 'chair' })
 * // Returns: "Chair"
 *
 * @example
 * generateProductDescription({ validDesign: 'oak' })
 * // Returns: "oak"
 *
 * @example
 * generateProductDescription({ description: 'Shelf unit, 30 1/8x30 1/8 "' })
 * // Returns: 'Shelf unit, 30 1/8x30 1/8 "'
 *
 * @example
 * generateProductDescription({ typeName: 'bed frame', validDesign: 'black-brown', measureReference: { metric: 'Queen', imperial: 'Queen' }, region: 'us/en' })
 * // Returns: "Bed frame, black-brown, Queen"
 */
export const generateProductDescription = (product: ProductLike): string | undefined => {
    const capitalizedTypeName = product.typeName
        ? product.typeName.charAt(0).toUpperCase() + product.typeName.slice(1)
        : ''

    const descriptionParts = [capitalizedTypeName, product.validDesign].filter(Boolean)

    // Add measureReference based on locale, following Ingka's PIP's pattern
    if (product.measureReference && product.region) {
        const { metric, imperial } = product.measureReference
        const isImperial = LOCALES_USING_IMPERIAL_SYSTEM.includes(product.region)

        // If both measurements exist and are the same, show only once
        if (metric && imperial && metric === imperial) {
            descriptionParts.push(metric)
        } else {
            // Show the preferred measurement based on locale
            const measureRef = isImperial ? imperial : metric
            if (measureRef) {
                descriptionParts.push(measureRef)
            }
        }
    }

    const descriptionText = descriptionParts.join(', ')

    // Fall back to original description if we generated nothing
    return descriptionText || product.description
}
