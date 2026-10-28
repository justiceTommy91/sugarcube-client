import React from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { withPrefix } from 'gatsby'
import Button from '@ingka/button'
import plusIcon from '@ingka/ssr-icon/paths/plus'
import shoppingBagAddIcon from '@ingka/ssr-icon/paths/shopping-bag-add'

import { useTracker, withTrackingBoundary } from 'apps/TrackingBoundary'
import { useAppSelector } from 'hooks/useAppSelector'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { addProductToComposition } from 'models/compositions/actions'
import type { ProductData } from 'models/furniture'
import { getFavoriteProducts } from 'models/favorites/selectors'
import { ACTION_ADD_PRODUCT, TRACK_LOCATION_SIDEPANEL, TRACKING_ADDED_FROM } from 'models/tracking/constants'
import { getProductTrackingInfo } from 'models/tracking/utils'
import FavoriteButtonContainer from 'containers/uiElements/FavoriteButtonContainer'
import { useShoppingBag, AddToBagSource } from 'features/shopping-bag'
import { getIsAddingProduct, getIsProductAdded } from 'features/shopping-bag/redux/selectors'
import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import checkmarkIcon from '@ingka/ssr-icon/paths/checkmark'

import { ProductCard } from '../../ProductCard'

require('./FavoritesTab.scss')

export const FavoritesTab = withTrackingBoundary('Favorites')(() => {
    const favoritedProducts = useAppSelector(getFavoriteProducts)

    // Keep a cached copy of favorited products on the component so that as long as it is mounted unfavorited products
    // remain visible to allow the user to easily undo mistakenly unfavoriting a product.
    const [cachedProducts, setCachedProducts] = React.useState<ProductData[]>(favoritedProducts)
    React.useEffect(() => {
        setCachedProducts((products) => {
            const newFavorites = favoritedProducts.filter((f) => !products.find((p) => p.id === f.id))
            return [...products, ...newFavorites]
        })
    }, [favoritedProducts])

    const dispatch = useAppDispatch()
    const addToComposition = (productId: number) =>
        dispatch(addProductToComposition(productId, { AddedFrom: TRACK_LOCATION_SIDEPANEL }))

    const { viewProductDetailsOverlay } = useDesignSidebarContext()

    const track = useTracker()
    const { addItemToBag } = useShoppingBag()
    const { t } = useTranslation()

    // Get loading and added states for all products
    const productStates = useAppSelector((state) => {
        const states: Record<number, { isAdding: boolean; isAdded: boolean }> = {}
        cachedProducts.forEach((product) => {
            states[product.id] = {
                isAdding: getIsAddingProduct(product.id, AddToBagSource.FAVORITES_TAB)(state),
                isAdded: getIsProductAdded(product.id, AddToBagSource.FAVORITES_TAB)(state),
            }
        })
        return states
    })
    return (
        <ul className={classNames('FavoritesTab', { FavoritesTab_empty: cachedProducts.length === 0 })}>
            {cachedProducts.length === 0 && (
                <li className="FavoritesTab__emptyMessageWrapper">
                    <img
                        className="FavoritesTab__emptyImage"
                        width="336"
                        height="400"
                        src={withPrefix('/images/graphics/chairHeartAndHand.png')}
                        alt={t('design.alt.product with heart')}
                    />

                    <div className="FavoritesTab__emptyTextHeadline">{t('design.favorite a product')}</div>

                    <p>{t("design.add products you'd like")}</p>
                </li>
            )}

            {cachedProducts.map((product) => {
                const isAddingThisProduct = productStates[product.id]?.isAdding ?? false
                const isThisProductAdded = productStates[product.id]?.isAdded ?? false

                return (
                    <li key={product.id} className="FavoritesTab__product">
                        <ProductCard
                            productId={product.id}
                            onClick={() => viewProductDetailsOverlay(product.id)}
                            primaryAction={
                                !product.isCombinableChild ? (
                                    <Button
                                        className="primaryCTA"
                                        onClick={() => {
                                            track.click({
                                                target: 'design.add to room',
                                                intendedAction: ACTION_ADD_PRODUCT,
                                                attributes: { ...getProductTrackingInfo(product) },
                                            })
                                            addToComposition(product.id)
                                        }}
                                        type="secondary"
                                        text={t('design.add to room')}
                                        aria-label={`${t('design.add to room')} - ${product.name}`}
                                        ssrIcon={plusIcon}
                                        size="small"
                                    />
                                ) : undefined
                            }
                            secondaryAction={
                                <FavoriteButtonContainer
                                    localItemNumber={product.localItemNumber}
                                    location={TRACK_LOCATION_SIDEPANEL}
                                    productLabel={`${product.name} ${product.description}`}
                                />
                            }
                            tertiaryAction={
                                <Button
                                    aria-label={`${t('design.add to bag')} - ${product.name} ${product.description}`}
                                    iconOnly
                                    type="tertiary"
                                    size="small"
                                    loading={isAddingThisProduct}
                                    aria-busy={isAddingThisProduct ? true : undefined}
                                    aria-live={isAddingThisProduct ? 'polite' : undefined}
                                    ssrIcon={isThisProductAdded ? checkmarkIcon : shoppingBagAddIcon}
                                    onClick={() => {
                                        if (isThisProductAdded) {
                                            return
                                        }
                                        addItemToBag({
                                            productId: product.id,
                                            trackingInfoAddedFrom: TRACKING_ADDED_FROM.SIDEPANEL_FAVORITES_TAB,
                                            source: AddToBagSource.FAVORITES_TAB,
                                        })
                                    }}
                                    text={
                                        isThisProductAdded
                                            ? t('design.added')
                                            : isAddingThisProduct
                                            ? ''
                                            : t('design.add to bag')
                                    }
                                />
                            }
                        />
                    </li>
                )
            })}
        </ul>
    )
})
