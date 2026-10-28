import React from 'react'
import classNames from 'classnames'
import type { ProductFamily } from '../types'
import './VariantSwatches.scss'

type VariantSwatchesProps = {
    variants: ProductFamily['variants']
    selectedIndex: number
    onSelect: (index: number) => void
}

const VariantSwatches = ({ variants, selectedIndex, onSelect }: VariantSwatchesProps) => {
    if (variants.length <= 1) return null

    return (
        <div className="VariantSwatches">
            {variants.map((variant, idx) => {
                const isSelected = idx === selectedIndex
                return (
                    <button
                        key={variant.data?.id ?? idx}
                        type="button"
                        className={classNames('VariantSwatches__swatch', {
                            'VariantSwatches__swatch--selected': isSelected,
                        })}
                        aria-label={variant.label}
                        aria-pressed={isSelected}
                        disabled={isSelected}
                        onClick={(e) => {
                            e.stopPropagation()
                            onSelect(idx)
                        }}
                    >
                        <img src={variant.data?.thumbUrl} alt={variant.label} />
                    </button>
                )
            })}
        </div>
    )
}

export default VariantSwatches
