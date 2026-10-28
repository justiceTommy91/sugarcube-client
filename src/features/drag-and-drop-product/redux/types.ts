import type { ProductData } from 'models/furniture'

// Drag and Drop Action Types
export const DRAG_PRODUCT_START = 'DRAG_PRODUCT_START'
export const DRAG_PRODUCT_END = 'DRAG_PRODUCT_END'
export const DROP_PRODUCT = 'DROP_PRODUCT'
export const SET_DROPZONE_ACTIVE = 'SET_DROPZONE_ACTIVE'

// Drag and Drop State
export interface DragDropState {
    isDragging: boolean
    draggedProduct: ProductData | null
    dragSource: string | null
    isDropZoneActive: boolean
}

// Action Payload Types
export interface DragProductStartPayload {
    productData: ProductData
    source: string
}

export interface DropProductPayload {
    productData: ProductData
    location: string
    trackingInfo: {
        source: string
        actionType: string
        addedFrom: string
    }
}

// Action Types
export interface DragProductStartAction {
    type: typeof DRAG_PRODUCT_START
    payload: DragProductStartPayload
}

export interface DragProductEndAction {
    type: typeof DRAG_PRODUCT_END
}

export interface DropProductAction {
    type: typeof DROP_PRODUCT
    payload: DropProductPayload
}

export interface SetDropZoneActiveAction {
    type: typeof SET_DROPZONE_ACTIVE
    payload: boolean
}

export type DragDropActionTypes =
    | DragProductStartAction
    | DragProductEndAction
    | DropProductAction
    | SetDropZoneActiveAction

// Drag Data Transfer Types
export interface DragTransferData {
    type: 'product'
    productData: ProductData
    source: string
}
