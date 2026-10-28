import React, { Component } from 'react'
import { bool, func, number, oneOf, string } from 'prop-types'
import { connect } from 'react-redux'

import { productDataType } from 'models/propTypes'
import { FURNITURE_ITEM } from 'constants/renderItemTypes'
import {
    selectFurniture,
    selectSwapFurnitureForDetails,
    receivePlaceProduct as receivePlaceProductAction,
} from 'models/furniture/actions'
import { setDesignSidepanelMode } from 'models/ui/actions'
import * as modes from 'models/ui/constants'
import {
    getSelectedCompositionId,
    getSelectedRenderItemId,
    getSelectedComposition,
    getPlaceProductId,
} from 'models/compositions/selectors'
import {
    clickPlaceRenderItem,
    selectCompositionRenderItem,
    swapRenderItem,
    removeFurnitureFromComposition,
} from 'models/compositions/actions'
import {
    GET_INFO_CATALOG_LIST,
    GET_INFO_SWAP_LIST,
    GET_INFO_ROOM_LIST,
    GET_INFO_FAVORITES_LIST,
    PRODUCT_SWAP,
    TRACKING_ADDED_FROM,
} from 'models/tracking/constants'
import { getDesignSidepanelMode, getShowDesignSummary } from 'models/ui/selectors'
import { getSelectedFurnitureData, getSelectedSwapFurnitureData } from 'models/furniture/selectors'
import { getProductTrackingInfo } from 'models/tracking/utils'
import { PRODUCT_ITEM_WIDE, PRODUCT_ITEM_SWAP, PRODUCT_ITEM_DEFAULT } from 'models/ui/constants'
import SugarcubeContext from 'apps/SugarcubeContext'

import classNames from 'classnames'
import { incrementFurnitureAddCount as incrementFurnitureAddCountAction } from 'models/sessionStorage/actions'

// Drag and Drop feature imports (conditionally used)
import { ConditionalDragWrapper } from 'features/drag-and-drop-product/components'

import ProductItem from './ProductItem'
import ProductItemWide from './ProductItemWide'
import ProductItemInSwap from './ProductItemInSwap'

class ProductItemContainer extends Component {
    constructor(props) {
        super(props)
        this.onSelect = this.onSelect.bind(this)
        this.addToRoom = this.addToRoom.bind(this)
        this.viewDetails = this.viewDetails.bind(this)
        this.onSwap = this.onSwap.bind(this)
        this.onUndoSwap = this.onUndoSwap.bind(this)
        this.removeFromComposition = this.removeFromComposition.bind(this)
    }

    onSelect() {
        const {
            onSelect,
            furnitureData: { id: furnitureDataId, uniqueId },
            mode,
            selectItem,
        } = this.props
        const isInMyItems = mode === modes.DESIGN_SIDEPANEL_MODE_MYITEMS_BROWSE

        onSelect(furnitureDataId)
        if (isInMyItems) {
            if (uniqueId) {
                selectItem(uniqueId)
            }
        }
    }

    onSwap(e) {
        e.stopPropagation()
        const {
            onSwap,
            selectedId: furnitureToSwapOut,
            furnitureData,
            placeProductId,
            selectedSwapFurnitureData,
            receivePlaceProduct,
        } = this.props
        const { id: productToSwapIn } = furnitureData
        const { isLivingRoomIntegration } = this.context

        if (furnitureToSwapOut) {
            // For category pages like living-room page, we store the auto place product in composition redux store as placeProductId.
            // This value is used to get the goes well with products and is displayed in teh add tab in the sidepanel for this integration.
            // If a product is swapped and it was the auto placed product, then we have to update the redux store value so
            // the goes well list is also updated in the Add tab.
            if (
                isLivingRoomIntegration &&
                placeProductId &&
                selectedSwapFurnitureData &&
                placeProductId === selectedSwapFurnitureData.id
            ) {
                receivePlaceProduct(furnitureData)
            }
            onSwap({
                furnitureToSwapOut,
                productToSwapIn,
                trackingInfo: { actionType: 'click', from: PRODUCT_SWAP },
            })
        }
    }

    onUndoSwap(e) {
        e.stopPropagation()
        const {
            onSwap,
            selectedId: removedFurnitureId,
            selectedFurnitureData,
            selectedSwapFurnitureData,
            receivePlaceProduct,
            placeProductId,
        } = this.props
        const { isLivingRoomIntegration } = this.context
        // Swap back the original product, the swap anchor
        if (selectedFurnitureData && selectedSwapFurnitureData) {
            const { id: productToSwapIn } = selectedSwapFurnitureData

            if (removedFurnitureId) {
                // For category pages like the living-room page, we store the auto placed product and this must
                // be kept updated to reflect the swapped / unswapped products.
                // Here, for the undo swap, we store the original swap anchor id.
                if (
                    isLivingRoomIntegration &&
                    placeProductId &&
                    selectedSwapFurnitureData &&
                    placeProductId !== selectedSwapFurnitureData.id
                ) {
                    receivePlaceProduct(selectedSwapFurnitureData)
                }
                onSwap({
                    furnitureToSwapOut: removedFurnitureId,
                    productToSwapIn,
                    trackingInfo: { actionType: 'click', from: PRODUCT_SWAP },
                })
            }
        }
    }

    addToRoom() {
        const {
            furnitureData: productData,
            compositionId,
            addProductToRoom,
            trackingInfoAddedFrom,
            incrementFurnitureAddCount,
        } = this.props
        const { id, stacks, renderType, hidden, placeables } = productData
        let renderData
        if (renderType === FURNITURE_ITEM) {
            renderData = {
                heading: 0,
                stacks,
                hidden,
                placeables,
            }
        } else {
            // For Art
            renderData = {
                matteId: 1,
                frameId: 1,
                sizeId: 1,
                colorId: 1,
                customHeight: null,
            }
        }
        const productTrackingInfo = getProductTrackingInfo(productData)
        incrementFurnitureAddCount()
        addProductToRoom(
            compositionId,
            id,
            {
                renderType,
                ...renderData,
            },
            {
                ...productTrackingInfo,
                d_id_click_item: Math.floor(Math.random() * 10000000000), // For debugging
                AddedFrom: trackingInfoAddedFrom,
            },
        )
    }

    // Drag and drop version of addToRoom with different tracking
    addToRoomViaDragDrop() {
        const { furnitureData: productData, compositionId, addProductToRoom, incrementFurnitureAddCount } = this.props
        const { id, stacks, renderType, hidden, placeables } = productData
        let renderData
        if (renderType === FURNITURE_ITEM) {
            renderData = {
                heading: 0,
                stacks,
                hidden,
                placeables,
            }
        } else {
            renderData = {
                matteId: 1,
                frameId: 1,
                sizeId: 1,
                colorId: 1,
                customHeight: null,
            }
        }

        const productTrackingInfo = getProductTrackingInfo(productData)
        incrementFurnitureAddCount()
        addProductToRoom(
            compositionId,
            id,
            {
                renderType,
                ...renderData,
            },
            {
                ...productTrackingInfo,
                d_id_click_item: Math.floor(Math.random() * 10000000000),
                AddedFrom: TRACKING_ADDED_FROM.DRAG_DROP, // Different tracking for drag-drop
                ActionType: 'Drag & Drop', // As per requirements
            },
        )
    }

    viewDetails() {
        const { setMode, mode, furnitureData, selectSwapItemForDetails } = this.props

        const isInMyItems = mode === modes.DESIGN_SIDEPANEL_MODE_MYITEMS_BROWSE
        const isInFavorites = mode === modes.DESIGN_SIDEPANEL_MODE_FAVORITES_BROWSE
        const isInSwap = mode === modes.DESIGN_SIDEPANEL_MODE_SWAP_BROWSE

        const { id } = furnitureData

        const trackingInfo = getProductTrackingInfo(furnitureData)

        this.onSelect(id)

        if (isInMyItems) {
            setMode(modes.DESIGN_SIDEPANEL_MODE_MYITEMS_DETAILS, { ...trackingInfo, AccessFrom: GET_INFO_ROOM_LIST })
        } else if (isInFavorites) {
            setMode(modes.DESIGN_SIDEPANEL_MODE_FAVORITES_DETAILS, {
                ...trackingInfo,
                AccessFrom: GET_INFO_FAVORITES_LIST,
            })
        } else if (isInSwap) {
            selectSwapItemForDetails(id)
            setMode(modes.DESIGN_SIDEPANEL_MODE_SWAP_DETAILS, { ...trackingInfo, AccessFrom: GET_INFO_SWAP_LIST })
        } else {
            setMode(modes.DESIGN_SIDEPANEL_MODE_PRODUCT_DETAILS, { ...trackingInfo, AccessFrom: GET_INFO_CATALOG_LIST })
        }
    }

    removeFromComposition() {
        const { onRemove, furnitureData } = this.props
        onRemove(furnitureData.uniqueId)
    }

    render() {
        const {
            furnitureData,
            mode,
            selectedFurnitureData,
            isDesignSummaryVisible,
            format = PRODUCT_ITEM_DEFAULT,
            selectedOnPlacementModeId,
            setSelectedOnPlacementModeId,
            trackingInfoAddedFrom,
        } = this.props
        const isInFavorites = mode === modes.DESIGN_SIDEPANEL_MODE_FAVORITES_BROWSE
        const { isCombinableChild } = furnitureData
        const { isMobile = false } = this.context

        switch (format) {
            case PRODUCT_ITEM_WIDE: {
                return (
                    <div className="ProductItemContainer oneColumn" data-testid="product-item">
                        <ProductItemWide
                            productData={furnitureData}
                            onSelect={this.onSelect}
                            viewDetails={isDesignSummaryVisible ? null : this.viewDetails}
                            addToRoom={isInFavorites && !isCombinableChild ? this.addToRoom : null}
                            trackingInfoAddedFrom={trackingInfoAddedFrom}
                            removeFromComposition={this.removeFromComposition}
                        />
                    </div>
                )
            }
            case PRODUCT_ITEM_SWAP: {
                return (
                    <div
                        className={classNames('ProductItemContainer', { threeColumns: !isMobile })}
                        data-testid="product-item"
                    >
                        <ProductItemInSwap
                            swappableItemData={furnitureData}
                            onSelect={this.onSelect}
                            onSwap={this.onSwap}
                            viewDetails={this.viewDetails}
                            selectedFurnitureData={selectedFurnitureData}
                            onUndoSwap={this.onUndoSwap}
                        />
                    </div>
                )
            }
            default: {
                return (
                    <div className="ProductItemContainer threeColumns" data-testid="product-item">
                        <ConditionalDragWrapper productData={furnitureData} enabled={!isDesignSummaryVisible}>
                            <ProductItem
                                furnitureData={furnitureData}
                                addToRoom={this.addToRoom}
                                viewDetails={this.viewDetails}
                                selectedOnPlacementModeId={selectedOnPlacementModeId}
                                setSelectedOnPlacementModeId={setSelectedOnPlacementModeId}
                            />
                        </ConditionalDragWrapper>
                    </div>
                )
            }
        }
    }
}

ProductItemContainer.contextType = SugarcubeContext
ProductItemContainer.defaultProps = {
    selectedFurnitureData: null,
    selectedId: null,
    selectedSwapFurnitureData: null,
    trackingInfoAddedFrom: null,
    selectedOnPlacementModeId: null,
    setSelectedOnPlacementModeId: null,
    placeProductId: null,
}

ProductItemContainer.propTypes = {
    furnitureData: productDataType.isRequired,
    onSelect: func.isRequired,
    compositionId: string.isRequired,
    addProductToRoom: func.isRequired,
    setMode: func.isRequired,
    selectItem: func.isRequired,
    trackingInfoAddedFrom: oneOf(Object.values(TRACKING_ADDED_FROM)),
    mode: string.isRequired,
    selectedFurnitureData: productDataType,
    onSwap: func.isRequired,
    selectedId: number,
    selectSwapItemForDetails: func.isRequired,
    selectedSwapFurnitureData: productDataType,
    isDesignSummaryVisible: bool.isRequired,
    format: string.isRequired,
    incrementFurnitureAddCount: func.isRequired,
    selectedOnPlacementModeId: string,
    setSelectedOnPlacementModeId: func,
    placeProductId: number,
    receivePlaceProduct: func.isRequired,
    onRemove: func.isRequired,
}

const mapStateToProps = (state) => ({
    compositionId: getSelectedCompositionId(state),
    mode: getDesignSidepanelMode(state),
    selectedFurnitureData: getSelectedFurnitureData(state),
    selectedId: getSelectedRenderItemId(state),
    selectedSwapFurnitureData: getSelectedSwapFurnitureData(state),
    isDesignSummaryVisible: getShowDesignSummary(state),
    compositionData: getSelectedComposition(state),
    placeProductId: getPlaceProductId(state),
})

const mapDispatchToProps = {
    addProductToRoom: clickPlaceRenderItem,
    onSelect: selectFurniture,
    setMode: setDesignSidepanelMode,
    selectItem: selectCompositionRenderItem,
    onSwap: swapRenderItem,
    selectSwapItemForDetails: selectSwapFurnitureForDetails,
    incrementFurnitureAddCount: incrementFurnitureAddCountAction,
    receivePlaceProduct: receivePlaceProductAction,
    onRemove: removeFurnitureFromComposition,
}

export default connect(mapStateToProps, mapDispatchToProps)(ProductItemContainer)
