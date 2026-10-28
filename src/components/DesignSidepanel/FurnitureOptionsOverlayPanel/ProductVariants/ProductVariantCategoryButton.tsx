import React from 'react'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import chevronRight from '@ingka/ssr-icon/paths/chevron-right'

import { useSugarcubeContext } from 'apps/SugarcubeContext'

import type { ProductVariant } from 'hooks/useCatalogProductVariants'

require('./ProductVariantCategoryButton.scss')

type ProductVariantCategoryButtonProps = {
    category: string
    variants: ProductVariant[]
    onClickCategoryButton: () => void
    currentVariantId?: number
}

export const ProductVariantCategoryButton = ({
    currentVariantId,
    category,
    variants,
    onClickCategoryButton,
}: ProductVariantCategoryButtonProps): React.ReactElement => {
    const { isUpptacka } = useSugarcubeContext()
    const currentVariant = variants.find((v) => v.productId === currentVariantId)
    return (
        <button onClick={onClickCategoryButton} className={classNames('ProductVariantCategoryButton', { isUpptacka })}>
            <div className="ProductVariantCategoryButton__info">
                <h3 className="ProductVariantCategoryButton__category">{category}</h3>
                <p className="ProductVariantCategoryButton__selectedVariantName">{currentVariant?.valueKey}</p>
            </div>
            <SSRIcon paths={chevronRight} />
        </button>
    )
}
