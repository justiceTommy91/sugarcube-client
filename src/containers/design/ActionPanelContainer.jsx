import React from 'react'
import { connect } from 'react-redux'
import { number, shape, func, string, arrayOf, bool } from 'prop-types'

import { TRACKING_ADDED_FROM } from 'models/tracking/constants'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { showGoesWithTab as showGoesWithTabAction } from 'models/ui/actions'
import { getSelectedFurnitureHasGoesWithProducts } from 'models/furniture/selectors'
import { getIsBeautifying } from 'models/beautifier/selectors'

import { ActionPanel } from 'components/design/ActionPanel'
import { useShoppingBag, AddToBagSource } from 'features/shopping-bag'

const ActionPanelContainer = ({
    onDelete,
    onRotateStart,
    onRotate,
    onRotateFinish,
    onDuplicate,
    onMirror,
    onChangeSurface,
    heading,
    localItemNumber,
    toNextSnapRotation,
    showGoesWithTab,
    furnitureId,
    productId,
    isCombinableChild,
    isBeautifying,
    showRotateByDefault,
    selectableChildren,
    isDragging,
}) => {
    const { isKiosk, isUpptacka } = useSugarcubeContext()
    const { addItemToBag } = useShoppingBag()

    if (isBeautifying) {
        return null
    }

    const onAddToCart =
        isKiosk || isUpptacka
            ? null
            : () =>
                  addItemToBag({
                      productId,
                      trackingInfoAddedFrom: TRACKING_ADDED_FROM.CANVAS_ACTION,
                      source: AddToBagSource.ACTION_PANEL,
                      uniqueId: furnitureId,
                  })

    return (
        <ActionPanel
            isDragging={isDragging}
            furnitureId={furnitureId}
            productId={productId}
            onDelete={onDelete}
            onRotateStart={onRotateStart}
            onRotate={onRotate}
            onRotateFinish={onRotateFinish}
            onDuplicate={onDuplicate}
            onMirror={onMirror}
            onChangeSurface={onChangeSurface}
            heading={heading}
            onAddToCart={onAddToCart}
            localItemNumber={localItemNumber}
            toNextSnapRotation={toNextSnapRotation}
            showGoesWithTab={isCombinableChild ? null : showGoesWithTab}
            showRotateByDefault={showRotateByDefault}
            selectableChildren={selectableChildren}
        />
    )
}

ActionPanelContainer.defaultProps = {
    onDelete: null,
    onRotate: null,
    onRotateStart: null,
    onRotateFinish: null,
    onDuplicate: null,
    onMirror: null,
    onChangeSurface: null,
    heading: null,
    toNextSnapRotation: null,
    isCombinableChild: false,
    isBeautifying: false,
    selectableChildren: null,
    isDragging: false,
}

ActionPanelContainer.propTypes = {
    onDelete: func,
    onRotateStart: func,
    onRotate: func,
    onRotateFinish: func,
    onDuplicate: func,
    onMirror: func,
    onChangeSurface: func,
    heading: number,
    localItemNumber: string.isRequired,
    toNextSnapRotation: func,
    showGoesWithTab: func.isRequired,
    productId: number.isRequired,
    furnitureId: number.isRequired,
    isCombinableChild: bool,
    isBeautifying: bool,
    showRotateByDefault: bool.isRequired,
    isDragging: bool,
    selectableChildren: arrayOf(shape({})),
}

const mapStateToProps = (state) => ({
    shouldShowGoesWith: getSelectedFurnitureHasGoesWithProducts(state),
    isBeautifying: getIsBeautifying(state),
})

const mapDispatchToProps = {
    showGoesWithTab: showGoesWithTabAction,
}

export default connect(mapStateToProps, mapDispatchToProps)(ActionPanelContainer)
