import React from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import SSRIcon from '@ingka/ssr-icon'
import arrowLeftArrowRightIcon from '@ingka/ssr-icon/paths/arrow-left-arrow-right'
import furnitureSetIcon from '@ingka/ssr-icon/paths/furniture-set'
import arrowCounterclockwise from '@ingka/ssr-icon/paths/arrow-counterclockwise'

import { useSugarcubeContext } from 'apps/SugarcubeContext'

import { useAriaTabs } from 'hooks/aria/useAriaTabs'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import { useCatalogSwappableProducts } from 'hooks/useCatalogSwappableProducts'
import { useCatalogRelatedProducts } from 'hooks/useCatalogRelatedProducts'

import {
    RELATED_PRODUCT_TYPES,
    RelatedProductType,
    useDesignSidebarContext,
} from 'components/design/DesignSidepanelContext'
import Tooltip from 'components/Tooltip'

import type { RenderItemComplete } from 'models/compositions'
import * as compositionActions from 'models/compositions/actions'
import * as furnitureSelectors from 'models/furniture/selectors'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'
import * as uiActions from 'models/ui/actions'
import * as uiConstants from 'models/ui/constants'

import { idle } from 'utils/async'
import { assertUnreachable } from 'utils/semantics'

import { ToggleTab, ToggleTabList, ToggleTabProps } from './ToggleTab'
import { SwappableResults } from './SwappableResults'
import { GoesWellWithResults } from './GoesWellWithResults'

require('./RelatedProducts.scss')

export type RelatedProductsProps = {
    productId?: number | undefined
}

export const RelatedProducts = ({ productId }: RelatedProductsProps): React.ReactElement => {
    const { isUpptacka } = useSugarcubeContext()

    const { t } = useTranslation()
    const relatedProductTypeProps = (relatedType: RelatedProductType): ToggleTabProps => {
        switch (relatedType) {
            case RelatedProductType.SWAP: {
                return {
                    icon: arrowLeftArrowRightIcon,
                    label: t('design.swap with similar'),
                }
            }
            case RelatedProductType.GOES_WELL_WITH: {
                return {
                    icon: furnitureSetIcon,
                    label: t('design.goes well with'),
                }
            }
            default: {
                return assertUnreachable(relatedType)
            }
        }
    }
    const tabpanelContent = (relatedType: RelatedProductType): React.ReactNode => {
        switch (relatedType) {
            case RelatedProductType.SWAP: {
                return <SwappableResults />
            }
            case RelatedProductType.GOES_WELL_WITH: {
                return <GoesWellWithResults productId={productId} />
            }
            default: {
                return assertUnreachable(relatedType)
            }
        }
    }

    const { relatedProductsDisplayed, displayRelatedProducts } = useDesignSidebarContext()
    const { tablistProps, tabProps, tabpanelProps } = useAriaTabs({
        tabs: RELATED_PRODUCT_TYPES,
        selectedTab: relatedProductsDisplayed ?? RelatedProductType.SWAP,
        onChange: displayRelatedProducts,
        'aria-label': t('design.replace with similar'),
    })

    const dispatch = useAppDispatch()

    const swappables = useCatalogSwappableProducts(productId ?? idle)
    const related = useCatalogRelatedProducts(productId ?? idle)

    // Consider we have products if they're loading or if results exist
    // This ensures UI doesn't disappear during re-fetch after location change
    const hasSwappableProducts = swappables.status === 'loading' || (swappables.result?.length ?? 0) > 0
    const hasSwappableResults = (swappables.result?.length ?? 0) > 0

    const ref = React.useRef<HTMLDivElement | null>(null)
    React.useEffect(() => {
        if (ref.current && hasSwappableResults) {
            dispatch(uiActions.swappableItemsRendered())
        }
    }, [hasSwappableResults])

    const undoSwap = () => {
        dispatch(
            compositionActions.undoSwap({
                trackingInfo: {
                    actionType: 'click',
                    from: TRACKING_ADDED_FROM.SIDEPANEL_FURNITURE_OPTIONS,
                },
            }),
        )
    }
    const hasGoesWithProducts = related.status === 'loading' || (related.result?.length ?? 0) > 0

    const selectedFurniture = useAppSelector(furnitureSelectors.getSelectedFurnitureData) as RenderItemComplete | null
    const swapAnchor = useAppSelector(furnitureSelectors.getSelectedSwapFurnitureData) as RenderItemComplete | null
    const showUndoSwapButton = swapAnchor?.id && swapAnchor.id !== selectedFurniture?.id
    const swapViewId = React.useId()
    const hasContent = hasGoesWithProducts || hasSwappableProducts

    return (
        <div
            ref={ref}
            className={classNames('RelatedProducts', {
                isUpptacka,
                'RelatedProducts--no-content': !hasContent,
            })}
            id={uiConstants.SWAP_TITLE}
        >
            {hasGoesWithProducts && hasSwappableProducts && (
                <>
                    <ToggleTabList {...tablistProps()}>
                        {RELATED_PRODUCT_TYPES.map((relatedType) => (
                            <ToggleTab
                                key={relatedType}
                                {...tabProps(relatedType)}
                                {...relatedProductTypeProps(relatedType)}
                            />
                        ))}
                    </ToggleTabList>

                    {RELATED_PRODUCT_TYPES.map((relatedType) => (
                        <div key={relatedType} {...tabpanelProps(relatedType)}>
                            {tabpanelContent(relatedType)}
                        </div>
                    ))}
                </>
            )}

            {!hasGoesWithProducts && hasSwappableProducts && (
                <>
                    <h3 className="RelatedProducts__headline">
                        <SSRIcon paths={arrowLeftArrowRightIcon} /> {t('design.swap with similar')}
                    </h3>

                    <SwappableResults />
                </>
            )}

            {showUndoSwapButton && (
                <div className="RelatedProducts__undoSwapButton">
                    <Tooltip describedById={swapViewId} place="leading" title={t('tooltip.revert to original')}>
                        <button
                            onClick={(event) => {
                                event.preventDefault()
                                undoSwap()
                            }}
                            aria-label={t('tooltip.revert to original')}
                        >
                            <SSRIcon paths={arrowCounterclockwise} />
                            <img src={swapAnchor.thumbUrl} alt="" />
                        </button>
                    </Tooltip>
                </div>
            )}
        </div>
    )
}
