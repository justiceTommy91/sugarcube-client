import classNames from 'classnames'
import React from 'react'
import Image from '@ingka/image'

import { useSugarcubeContext } from 'apps/SugarcubeContext'

import { ProductVariant } from 'hooks/useCatalogProductVariants'

require('./ProductVariantCategorySection.scss')

export type ProductVariantCategorySectionProps = {
    category: string
    variants: ProductVariant[]
    onClickVariant: (event: React.MouseEvent, variantId: number) => void
    currentVariantId?: number
}

/**
 * Product variant selection component that implements WCAG-compliant radio group pattern.
 *
 * Accessibility features:
 * - ARIA radio group pattern for single selection per category
 * - Full keyboard navigation with arrow keys
 * - Roving tabindex (only selected item in tab order)
 * - Clear focus indicators with proper visual styling
 * - Screen reader announcements for selection state
 */
export const ProductVariantCategorySection = ({
    category,
    variants,
    onClickVariant,
    currentVariantId,
}: ProductVariantCategorySectionProps): React.ReactElement => {
    const { isUpptacka } = useSugarcubeContext()
    const [highlightedVariantId, setHighlightedVariantId] = React.useState<number | undefined>(currentVariantId)
    const highlightVariant = (variantId: number) => setHighlightedVariantId(variantId)
    const clearHighlightedVariant = () => setHighlightedVariantId(currentVariantId)
    const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([])

    /**
     * Implements keyboard navigation for the radio group pattern.
     * Arrow keys move focus between options, Space/Enter selects.
     * This ensures keyboard users can navigate variants efficiently.
     */
    const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
        const totalVariants = variants.length
        let newIndex = currentIndex

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault()
                newIndex = (currentIndex + 1) % totalVariants
                break
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault()
                newIndex = (currentIndex - 1 + totalVariants) % totalVariants
                break
            case ' ':
            case 'Enter':
                event.preventDefault()
                onClickVariant(event as unknown as React.MouseEvent, variants[currentIndex].productId)
                return
            default:
                return
        }

        // Focus the new element
        buttonRefs.current[newIndex]?.focus()
    }

    const highlightedVariant = variants.find((v) => v.productId === highlightedVariantId)

    return (
        <div className={classNames('ProductVariantCategorySection', { isUpptacka })}>
            <h3 className="ProductVariantCategorySection__category">{category}</h3>
            <p className="ProductVariantCategorySection__highlightedVariantName">{highlightedVariant?.valueKey}</p>

            {/* ARIA radiogroup pattern for variant selection */}
            <ul
                className="ProductVariantCategorySection__variantList"
                role="radiogroup"
                aria-label={`Select ${category} variant`}
            >
                {variants.map((variant, index) => {
                    const isSelected = currentVariantId === variant.productId
                    return (
                        <li key={variant.productId}>
                            {/* Roving tabindex: only selected item is tabbable */}
                            <button
                                ref={(el) => {
                                    buttonRefs.current[index] = el
                                }}
                                className={classNames('ProductVariantCategorySection__variant', {
                                    ProductVariantCategorySection__variant_selected: isSelected,
                                })}
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={variant.valueKey}
                                tabIndex={isSelected ? 0 : -1}
                                onKeyDown={(event) => handleKeyDown(event, index)}
                                onPointerEnter={() => highlightVariant(variant.productId)}
                                onPointerLeave={clearHighlightedVariant}
                                onClick={(event) => onClickVariant(event, variant.productId)}
                            >
                                <Image
                                    className="ProductVariantCategorySection__variantImage"
                                    src={variant.thumbUrl}
                                    alt=""
                                />
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
