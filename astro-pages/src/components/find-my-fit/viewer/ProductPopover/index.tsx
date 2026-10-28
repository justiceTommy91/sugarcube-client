import React, { useCallback } from 'react'
import Button from '@ingka/button'
import shoppingBagAddIcon from '@ingka/ssr-icon/paths/shopping-bag-add'
import SSRIcon from '@ingka/ssr-icon'
import linkOutIcon from '@ingka/ssr-icon/paths/link-out'
import { useViewerContext } from '@gatsby/Renderer/ui/components/ViewerContext'
import { useTranslation } from 'react-i18next'
import { useAddToBag } from '@astro-hooks/useAddToBag'
import { useGetPriceString } from '@hooks/useGetPriceString'
import FavoriteButton from '@astro-components/common/FavoriteButton'
import { click, trackGoogleAnalytics } from '@utils/tracker'
import { GA_CATEGORY_DYH_SUGARCUBE } from '@gatsby/models/tracking/constants'
import {
    FMFBROWSER_ADD_TO_CART,
    FMFBROWSER_ADD_FAVORITE,
    FMFBROWSER_REMOVE_FAVORITE,
    FMFBROWSER_SHOW_DETAILS_CLICK,
    GA_ACTION_FMFBROWSER_ADD_TO_CART,
    GA_ACTION_FMFBROWSER_ADD_FAVORITE,
    GA_ACTION_FMFBROWSER_REMOVE_FAVORITE,
    GA_ACTION_FMFBROWSER_SHOW_DETAILS,
    FMF_CART_FAVORITE_ACCESS_FROM_SELECTED_PRODUCT,
    FMF_CART_FAVORITE_ACCESS_FROM_PRODUCT_LIST,
} from '@lib/tracking/constants'
import { getFmfProductTrackingInfo } from '@lib/tracking/fmfTrackingUtils'
import type { ProductFamily } from '../types'
import { useIsLandscape } from '../hooks/useIsLandscape'
import Popover from './Popover'
import VariantSwatches from './VariantSwatches'
import './styles.scss'

type ProductPopoverProps = {
    families: ProductFamily[]
    familyIndex: number
    variantIndex: number
    onFamilyClick: (index: number, variantIdx?: number) => void
    onVariantClick: (variantIdx: number) => void
    sceneId: string
}

const HEIGHT_OFFSET = 16
const MIN_COLLAPSED_HEIGHT = 150

const ProductPopover = ({
    families,
    familyIndex,
    variantIndex,
    onFamilyClick,
    onVariantClick,
    sceneId,
}: ProductPopoverProps) => {
    const [isExpanded, setIsExpanded] = React.useState(false)
    const [collapsedHeight, setCollapsedHeight] = React.useState<number>(200)
    const popoverContentRef = React.useRef<HTMLDivElement | null>(null)
    const { canvasDimensions } = useViewerContext()
    const isSidebar = useIsLandscape()
    // Sidebar has no drag handle; description + results must always be visible.
    const showExpandedDetails = isSidebar || isExpanded

    const calculateCollapsedHeight = React.useCallback(() => {
        const canvas = document.getElementById(`ViewportCanvas`) as HTMLCanvasElement
        if (!canvas) return null

        const canvasRect = canvas.getBoundingClientRect()
        if (canvasRect.height === 0) return null

        const remainingHeight = window.innerHeight - canvasRect.bottom + HEIGHT_OFFSET
        return Math.max(remainingHeight, MIN_COLLAPSED_HEIGHT)
    }, [])

    React.useEffect(() => {
        if (canvasDimensions.width > 1 && canvasDimensions.height > 1) {
            const newHeight = calculateCollapsedHeight()
            if (newHeight !== null) {
                setCollapsedHeight(newHeight)
            }
        }
    }, [canvasDimensions, calculateCollapsedHeight])

    // Exclude the currently displayed family from the "See all results" list — it already
    // appears as the selected item at the top, so showing it again would be redundant.
    // originalIndex is preserved so click handlers can reference the correct position in families[].
    const otherFamilies = React.useMemo(
        () =>
            families
                .map((family, i) => ({ family, originalIndex: i }))
                .filter(({ originalIndex }) => originalIndex !== familyIndex),
        [families, familyIndex],
    )

    const { t } = useTranslation('find-my-fit')
    const { getPriceString } = useGetPriceString()
    const { addToBag, pendingItemNumber } = useAddToBag()

    const handleFavoriteToggle = useCallback(
        (item: Parameters<typeof getFmfProductTrackingInfo>[0], accessFrom: string) => (isFavorited: boolean) => {
            const event = isFavorited ? FMFBROWSER_ADD_FAVORITE : FMFBROWSER_REMOVE_FAVORITE
            const gaAction = isFavorited ? GA_ACTION_FMFBROWSER_ADD_FAVORITE : GA_ACTION_FMFBROWSER_REMOVE_FAVORITE
            click(event, { SceneUuid: sceneId, AccessFrom: accessFrom, ...getFmfProductTrackingInfo(item) })
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: gaAction,
                label: item.localItemNumber,
                custom: { SceneUuid: sceneId, AccessFrom: accessFrom },
            })
        },
        [sceneId],
    )

    const handleAddToCart = useCallback(
        (item: Parameters<typeof getFmfProductTrackingInfo>[0], accessFrom: string) => () => {
            addToBag({ product: item })
            click(FMFBROWSER_ADD_TO_CART, {
                SceneUuid: sceneId,
                AccessFrom: accessFrom,
                ...getFmfProductTrackingInfo(item),
            })
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: GA_ACTION_FMFBROWSER_ADD_TO_CART,
                label: item.localItemNumber,
                custom: { SceneUuid: sceneId, AccessFrom: accessFrom },
            })
        },
        [sceneId, addToBag],
    )

    const handleShowDetails = useCallback(
        (item: Parameters<typeof getFmfProductTrackingInfo>[0]) => () => {
            click(FMFBROWSER_SHOW_DETAILS_CLICK, { SceneUuid: sceneId, ...getFmfProductTrackingInfo(item) })
            trackGoogleAnalytics({
                category: GA_CATEGORY_DYH_SUGARCUBE,
                action: GA_ACTION_FMFBROWSER_SHOW_DETAILS,
                label: item.localItemNumber,
                custom: { SceneUuid: sceneId },
            })
        },
        [sceneId],
    )

    const currentFamily = families[familyIndex]
    if (!currentFamily) return null

    const currentVariant = currentFamily.variants[variantIndex] ?? currentFamily.variants[0]
    const product = currentVariant.data
    const name = product.name
    const description = product.description
    const price = getPriceString(product.price)

    const handleVariantClick = (variantIdx: number) => {
        onVariantClick(variantIdx)
        popoverContentRef.current?.scrollTo({ top: 0, behavior: `smooth` })
        setIsExpanded(false)
    }

    const handleProductClick = (originalIndex: number, variantIdx?: number) => {
        // originalIndex is the position in the full families array, not the filtered otherFamilies list.
        // Using the list index would be off-by-one once the current family is excluded.
        onFamilyClick(originalIndex, variantIdx)
        popoverContentRef.current?.scrollTo({ top: 0, behavior: `smooth` })
        setIsExpanded(false)
    }

    return (
        <div className="ProductPopover">
            <Popover
                isExpanded={isExpanded}
                onExpandedChange={setIsExpanded}
                collapsedHeight={collapsedHeight}
                contentRef={popoverContentRef}
                isSidebar={isSidebar}
            >
                <div className="product-details">
                    <div className="product-details__header">
                        <h2 className="product-details__name">{name}</h2>
                        <div className="product-details__info">
                            <span className="product-details__price">{price}</span>
                            <div className="product-details__actions">
                                <FavoriteButton
                                    localItemNumber={product.localItemNumber}
                                    onToggle={handleFavoriteToggle(
                                        product,
                                        FMF_CART_FAVORITE_ACCESS_FROM_SELECTED_PRODUCT,
                                    )}
                                />
                                <Button
                                    type="emphasised"
                                    size="small"
                                    ssrIcon={shoppingBagAddIcon}
                                    text={t('find-my-fit.viewer.addToBag')}
                                    loading={pendingItemNumber === product.localItemNumber}
                                    onClick={handleAddToCart(product, FMF_CART_FAVORITE_ACCESS_FROM_SELECTED_PRODUCT)}
                                />
                            </div>
                        </div>
                        <div className="product-details__body">
                            <div className="product-details__body-text">
                                {showExpandedDetails && <p className="product-details__desc">{description}</p>}
                                <VariantSwatches
                                    variants={currentFamily.variants}
                                    selectedIndex={variantIndex}
                                    onSelect={handleVariantClick}
                                />
                                <a
                                    className="product-details__external-link"
                                    href={product.ecommerceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={handleShowDetails(product)}
                                >
                                    <SSRIcon paths={linkOutIcon} /> {t('find-my-fit.viewer.showMoreDetails')}
                                </a>
                            </div>
                        </div>
                    </div>

                    {otherFamilies.length > 0 && (
                        <div className="product-details__expanded-content">
                            <div className="product-details__section">
                                <h3 className="product-details__heading">{t('find-my-fit.viewer.seeAllResults')}</h3>
                                <div className="productsInRoom">
                                    {otherFamilies.map(({ family, originalIndex }) => {
                                        const variant = family.variants[0]
                                        const p = variant.data
                                        return (
                                            <div
                                                className="ProductItem"
                                                // eslint-disable-next-line react/no-array-index-key
                                                key={`${family.name}-${originalIndex}`}
                                                onClick={() => handleProductClick(originalIndex)}
                                            >
                                                <div className="itemImageContainer">
                                                    <img src={p.thumbUrl} alt={family.name} className="itemImage" />
                                                </div>
                                                <div className="itemDetailsContainer">
                                                    <div className="nameAndPrice">
                                                        <span className="name">{family.name}</span>
                                                        <span className="price">{getPriceString(p.price)}</span>
                                                    </div>
                                                    <div className="itemDetails__body">
                                                        <div className="description">{p.description}</div>
                                                        <FavoriteButton
                                                            localItemNumber={p.localItemNumber}
                                                            onToggle={handleFavoriteToggle(
                                                                p,
                                                                FMF_CART_FAVORITE_ACCESS_FROM_PRODUCT_LIST,
                                                            )}
                                                        />
                                                        <Button
                                                            iconOnly
                                                            type="tertiary"
                                                            size="small"
                                                            ssrIcon={shoppingBagAddIcon}
                                                            aria-label={t('find-my-fit.viewer.addToBag')}
                                                            loading={pendingItemNumber === p.localItemNumber}
                                                            onClick={(e: React.MouseEvent) => {
                                                                e.stopPropagation()
                                                                handleAddToCart(
                                                                    p,
                                                                    FMF_CART_FAVORITE_ACCESS_FROM_PRODUCT_LIST,
                                                                )()
                                                            }}
                                                        />
                                                    </div>
                                                    <VariantSwatches
                                                        variants={family.variants}
                                                        selectedIndex={-1}
                                                        onSelect={(idx) => handleProductClick(originalIndex, idx)}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Popover>
        </div>
    )
}

export default ProductPopover
