import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { Link, withPrefix } from 'gatsby'
import Button from '@ingka/button'
import shoppingBagAddIcon from '@ingka/ssr-icon/paths/shopping-bag-add'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'
import trashCanIcon from '@ingka/ssr-icon/paths/trash-can'
import plusIcon from '@ingka/ssr-icon/paths/plus'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'

import { SUB_CATEGORIES_IDS_MAP } from 'constants/categories'
import { getComfortGuideLink } from 'models/location/constants'

import { useDesignSidebarContext, DesignSidepanelView } from 'components/design/DesignSidepanelContext'
import { ProductSuggestionCard } from 'components/design/ProductSuggestionCard'

import * as compositionActions from 'models/compositions/actions'
import * as compositionSelectors from 'models/compositions/selectors'
import type { RenderItemComplete } from 'models/compositions'
import { getLocale } from 'models/location/selectors'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'

import { useShoppingBag, AddToBagSource } from 'features/shopping-bag'

import { ProductCard } from '../../ProductCard'
import { useEditFurnitureTab } from '../../useEditFurnitureTab'

require('./EditFurnitureTab.scss')

const AddToShoppingBagButton = ({ productId, uniqueId }: { productId: number; uniqueId: number }) => {
    const { addItemToBag, isAddingProductToBag, isProductAdded } = useShoppingBag()
    const { t } = useTranslation()
    const isAddingThisProduct = isAddingProductToBag(productId, AddToBagSource.EDIT_TAB, uniqueId)
    const isThisProductAdded = isProductAdded(productId, AddToBagSource.EDIT_TAB, uniqueId)

    return (
        <Button
            className="AddToShoppingBagButton"
            aria-label={t('design.add to bag')}
            iconOnly
            type="tertiary"
            size="small"
            loading={isAddingThisProduct}
            aria-busy={isAddingThisProduct ? true : undefined}
            aria-live={isAddingThisProduct ? 'polite' : undefined}
            ssrIcon={isThisProductAdded ? checkmarkIcon : shoppingBagAddIcon}
            text={isThisProductAdded ? t('design.added') : isAddingThisProduct ? '' : t('design.add to bag')}
            onClick={() => {
                if (isAddingThisProduct || isThisProductAdded) {
                    return
                }
                addItemToBag({
                    productId,
                    trackingInfoAddedFrom: TRACKING_ADDED_FROM.SIDEPANEL_EDIT_TAB,
                    source: AddToBagSource.EDIT_TAB,
                    uniqueId,
                })
            }}
        />
    )
}

export const EditFurnitureTab: React.FunctionComponent = () => {
    const { displaySidepanelView } = useDesignSidebarContext()
    const furniture = useAppSelector(
        compositionSelectors.getSelectedCompositionShoppableProductData,
    ) as RenderItemComplete[]

    const locale = getLocale()
    const comfortGuideLink = getComfortGuideLink(locale)

    const hasNoAddedProducts = furniture.length === 0
    const hasAddedBed = useAppSelector(
        compositionSelectors.isSubcategoryInShoppableSelection(SUB_CATEGORIES_IDS_MAP.Beds),
    )
    const dispatch = useAppDispatch()
    const removeFurnitureFromComposition = (furnitureId: number) => {
        dispatch(compositionActions.removeFurnitureFromComposition(furnitureId))
    }
    const { addRoomToBag } = useShoppingBag()

    const { selectFurniture } = useEditFurnitureTab()
    const { t } = useTranslation()
    return (
        <div className="EditFurnitureTab">
            <ul
                className={classNames('EditFurnitureTab__furnitureList', {
                    EditFurnitureTab__furnitureList_empty: hasNoAddedProducts,
                })}
            >
                {hasNoAddedProducts && (
                    <li className="EditFurnitureTab__emptyMesssageWrapper">
                        <img
                            className="EditFurnitureTab__emptyMessageImg"
                            width="300"
                            height="330"
                            src={withPrefix('images/graphics/chairAndPin.png')}
                            alt={t('design.alt.product with pin')}
                        />

                        <Button
                            ssrIcon={plusIcon}
                            text={t('design.add items to get started')}
                            onClick={() => displaySidepanelView(DesignSidepanelView.ADD)}
                        />

                        <p>{t('design.add items to edit')}</p>
                    </li>
                )}

                {furniture.map((f) => (
                    <li key={f.uniqueId} className="EditFurnitureTab__furniture">
                        <ProductCard
                            primaryAction={
                                <Button
                                    text={t('design.more options')}
                                    size="small"
                                    onClick={() => selectFurniture(f.uniqueId, f.id)}
                                />
                            }
                            secondaryAction={<AddToShoppingBagButton productId={f.id} uniqueId={f.uniqueId} />}
                            tertiaryAction={
                                !f.isCombinableChild ? (
                                    <Button
                                        aria-label={t('design.remove from design')}
                                        iconOnly
                                        type="tertiary"
                                        size="small"
                                        ssrIcon={trashCanIcon}
                                        onClick={() => removeFurnitureFromComposition(f.uniqueId)}
                                        text={t('design.remove from design')}
                                    />
                                ) : null
                            }
                            productId={f.id}
                            onClick={() => selectFurniture(f.uniqueId, f.id)}
                        />
                    </li>
                ))}
            </ul>
            {hasAddedBed && (
                <div className="EditFurnitureTab__suggestionCardWrapper">
                    <div className="EditFurnitureTab__suggestionCard">
                        <ProductSuggestionCard
                            onClick={() => window.open(comfortGuideLink, '_blank')}
                            title={
                                <Trans i18nKey="design.planning to buy a mattress too">
                                    Planning to buy a mattress too?
                                </Trans>
                            }
                            caption={
                                <div>
                                    <Trans i18nKey="design.explore our most-loved mattresses">
                                        Explore our most-loved mattresses for every bedroom and budget. Or use the IKEA
                                        <Link
                                            to={comfortGuideLink}
                                            target="blank"
                                            style={{ textDecoration: 'underline' }}
                                        >
                                            comfort guide
                                        </Link>
                                        to find your ultimate mattress.
                                    </Trans>
                                </div>
                            }
                            pillLabel={t('aria.link to comfort guide')}
                        />
                    </div>
                </div>
            )}

            <div className="EditFurnitureTab__footer">
                <Button
                    disabled={hasNoAddedProducts}
                    onClick={() =>
                        addRoomToBag({
                            trackingInfoAddedFrom: TRACKING_ADDED_FROM.SIDEPANEL_EDIT_TAB,
                        })
                    }
                    type="emphasised"
                    text={t('design.add all to shopping bag')}
                    ssrIcon={shoppingBagAddIcon}
                />
            </div>
        </div>
    )
}
