import type { ProductData } from 'models/furniture'
import {
    DRAG_PRODUCT_START,
    DRAG_PRODUCT_END,
    DROP_PRODUCT,
    SET_DROPZONE_ACTIVE,
    type DragProductStartAction,
    type DragProductEndAction,
    type DropProductAction,
    type SetDropZoneActiveAction,
} from './types'

export const dragProductStart = (productData: ProductData, source: string): DragProductStartAction => ({
    type: DRAG_PRODUCT_START,
    payload: {
        productData,
        source,
    },
})

export const dragProductEnd = (): DragProductEndAction => ({
    type: DRAG_PRODUCT_END,
})

export const dropProduct = (
    productData: ProductData,
    location: string,
    trackingInfo: {
        source: string
        actionType: string
        addedFrom: string
    },
): DropProductAction => ({
    type: DROP_PRODUCT,
    payload: {
        productData,
        location,
        trackingInfo,
    },
})

export const setDropZoneActive = (isActive: boolean): SetDropZoneActiveAction => ({
    type: SET_DROPZONE_ACTIVE,
    payload: isActive,
})
