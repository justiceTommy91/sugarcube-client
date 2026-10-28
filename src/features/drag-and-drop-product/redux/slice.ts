/* eslint-disable i18next/no-literal-string, no-param-reassign */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { ProductData } from 'models/furniture'
import { FURNITURE_ITEM } from 'constants/renderItemTypes'
import { getProductTrackingInfo } from 'models/tracking/utils'
import { TRACKING_ADDED_FROM } from 'models/tracking/constants'
import { clickPlaceRenderItem } from 'models/compositions/actions'
import { getSelectedCompositionId } from 'models/compositions/selectors'
import { incrementFurnitureAddCount } from 'models/sessionStorage/actions'
import type { RootState } from 'store'
import type { DragDropState } from './types'

const initialState: DragDropState = {
    isDragging: false,
    draggedProduct: null,
    dragSource: null,
    isDropZoneActive: false,
}

export const dragDropSlice = createSlice({
    name: 'dragDrop',
    initialState,
    reducers: {
        dragProductStart: (state, action: PayloadAction<{ productData: ProductData; source: string }>) => {
            state.isDragging = true
            state.draggedProduct = action.payload.productData
            state.dragSource = action.payload.source
        },
        dragProductEnd: (state) => {
            state.isDragging = false
            state.draggedProduct = null
            state.dragSource = null
        },
        setDropZoneActive: (state, action: PayloadAction<boolean>) => {
            state.isDropZoneActive = action.payload
        },
        dropProduct: (state) => {
            // Reset drag state after drop
            state.isDragging = false
            state.draggedProduct = null
            state.dragSource = null
            state.isDropZoneActive = false
        },
    },
})

export const { dragProductStart, dragProductEnd, setDropZoneActive, dropProduct } = dragDropSlice.actions

// Thunk action to place a product via drag-and-drop
export const placeProductViaDragDrop = createAsyncThunk<
    void,
    {
        productData: ProductData
        source: string
        actionType: 'Drag & Drop' | 'Touch Drag & Drop'
    },
    { state: RootState }
>('dragDrop/placeProductViaDragDrop', async ({ productData, actionType }, { dispatch, getState }) => {
    const state = getState()
    const compositionId = getSelectedCompositionId(state)

    if (!compositionId) {
        return
    }

    // Create render data based on product type
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
        // For Art - needs base properties plus art-specific ones
        renderData = {
            heading: 0,
            stacks: false,
            hidden: false,
            placeables: null,
            matteId: 1,
            frameId: 1,
            sizeId: 1,
            colorId: 1,
            customHeight: null,
        }
    }

    const productTrackingInfo = getProductTrackingInfo(productData)

    // Increment the furniture add count for tracking
    dispatch(incrementFurnitureAddCount())

    // Dispatch the clickPlaceRenderItem action (same as clicking to add)
    dispatch(
        clickPlaceRenderItem(
            compositionId,
            id,
            {
                renderType,
                ...renderData,
            },
            {
                ...productTrackingInfo,
                d_id_click_item: Math.floor(Math.random() * 10000000000),
                AddedFrom: TRACKING_ADDED_FROM.DRAG_DROP,
                ActionType: actionType,
            },
        ),
    )

    // Reset drag state after successful placement
    dispatch(dropProduct())
})

export default dragDropSlice.reducer
