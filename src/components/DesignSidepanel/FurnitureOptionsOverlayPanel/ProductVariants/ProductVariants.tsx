import React from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { useStore } from 'react-redux'

import { useSugarcubeContext } from 'apps/SugarcubeContext'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useCatalogProductVariants } from 'hooks/useCatalogProductVariants'

import * as compositionActions from 'models/compositions/actions'
import * as compositionSelectors from 'models/compositions/selectors'
import * as variantsActions from 'models/variants/actions'
import * as furnitureSelectors from 'models/furniture/selectors'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'

import { ProductVariantCategorySection } from './ProductVariantCategorySection'
import { ProductVariantCategoryButton } from './ProductVariantCategoryButton'

require('./ProductVariants.scss')

export type ProductVariantsProps = {
    productId: number
}

export const ProductVariants: React.FunctionComponent<ProductVariantsProps> = ({ productId }) => {
    const { isUpptacka } = useSugarcubeContext()

    const variants = useCatalogProductVariants(productId)

    const dispatch = useAppDispatch()
    const store = useStore()
    const swapVariant = (variantId: number) => {
        const state = store.getState()
        const selectedFurniture = compositionSelectors.getSelectedRenderItem(state)
        const furnitureId = selectedFurniture?.uniqueId
        if (furnitureId == null) {
            return
        }

        const swapParams: compositionActions.SwapRenderItemArgs = {
            furnitureToSwapOut: furnitureId,
            productToSwapIn: variantId,
            trackingInfo: {
                actionType: `click`,
                from: TRACKING_ADDED_FROM.PRODUCT_VARIANT,
            }
        }

        const variantProductData = furnitureSelectors.getFurnitureById(state)[variantId]
        if (selectedFurniture?.materialUrl && variantProductData?.materialUrl) {
            dispatch(compositionActions.softSwapRenderItem(swapParams))
        } else {
            dispatch(compositionActions.swapRenderItem(swapParams))
        }
    }

    const setSelectedCategoryIndex = (categoryIndex: number) =>
        dispatch(variantsActions.setVariantSelected(categoryIndex))

    const { t } = useTranslation()
    return (
        <div
            className={classNames('ProductVariants', {
                ProductVariants_empty: variants.result?.length === 0,
                isUpptacka,
            })}
        >
            {variants.status === 'error' && <div className="ProductVariants--error">{t('common.errMessage')}</div>}

            {variants.result?.map((cat, variantCategoryIndex) => {
                if (cat.showThumbnail) {
                    return (
                        <ProductVariantCategorySection
                            key={cat.type}
                            category={cat.typeName}
                            variants={cat.options}
                            currentVariantId={productId}
                            onClickVariant={(event, variantId) => swapVariant(variantId)}
                        />
                    )
                }
                return (
                    <ProductVariantCategoryButton
                        key={cat.type}
                        category={cat.typeName}
                        variants={cat.options}
                        currentVariantId={productId}
                        onClickCategoryButton={() => setSelectedCategoryIndex(variantCategoryIndex)}
                    />
                )
            })}
        </div>
    )
}
