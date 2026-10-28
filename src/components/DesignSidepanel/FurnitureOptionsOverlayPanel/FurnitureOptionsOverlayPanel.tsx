import React from 'react'
import { useTranslation } from 'react-i18next'
import crossIcon from '@ingka/ssr-icon/paths/cross'

import { useTracker, withTrackingBoundary } from 'apps/TrackingBoundary'

import { useAppSelector } from 'hooks/useAppSelector'

import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'

import { RenderItemComplete } from 'models/compositions'
import * as furnitureSelectors from 'models/furniture/selectors'

import { DesignSidepanelOverlayPanel } from '../DesignSidepanelOverlayPanel'

import { RelatedProducts } from './RelatedProducts'
import { FurnitureOptions } from './FurnitureOptions'
import { VariantOptionsSubpanel } from './VariantOptionsSubpanel'

require('./FurnitureOptionsOverlayPanel.scss')

export type FurnitureOptionsOverlayPanelProps = {
    productId?: number | undefined
}

export const FurnitureOptionsOverlayPanel = withTrackingBoundary('ItemOptions')(
    ({ productId }: FurnitureOptionsOverlayPanelProps): React.ReactElement => {
        const track = useTracker()
        React.useEffect(() => {
            track('DecorateRoom.DesignSidepanel.ItemOptions.View', {
                hints: {
                    productId,
                },
            })
        }, [productId])

        const { dismissOverlay, focusedProductVariantCategoryIndex } = useDesignSidebarContext()

        const selectedProduct = useAppSelector(furnitureSelectors.getSelectedFurnitureData) as RenderItemComplete | null

        const { t } = useTranslation()
        /* eslint-disable i18next/no-literal-string */
        const deselectKey = 'design.deselect'
        /* eslint-enable i18next/no-literal-string */
        return (
            <DesignSidepanelOverlayPanel
                open={productId != null}
                heading={t('design.item options')}
                onClickBack={(event) => {
                    track('DecorateRoom.DesignSidepanel.ItemOptions.Dismiss', {
                        hints: {
                            userInteraction: {
                                event,
                                elementName: deselectKey,
                            },
                            productId,
                        },
                    })
                    dismissOverlay()
                }}
                backButtonProps={{
                    ssrIcon: crossIcon,
                    text: t(deselectKey),
                }}
            >
                <div className="FurnitureOptionsOverlayPanel">
                    {focusedProductVariantCategoryIndex != null ? (
                        <VariantOptionsSubpanel />
                    ) : (
                        <>
                            <FurnitureOptions productId={selectedProduct?.id} />
                            <RelatedProducts productId={productId} />
                        </>
                    )}
                </div>
            </DesignSidepanelOverlayPanel>
        )
    },
)
