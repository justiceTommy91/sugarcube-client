/* eslint-disable i18next/no-literal-string */
import React from 'react'
import type { ProductData } from 'models/furniture'
import DragWrapper from './DragWrapper'
import { useProductDragAndDrop } from '../useProductDragAndDrop'

type ConditionalDragWrapperProps = {
    children: React.ReactElement
    productData: ProductData
    /**
     * Controls whether drag functionality is enabled for this specific component instance.
     * 
     * This provides instance-level control on top of the global ProductItemDragAndDrop feature flag.
     * Both must be true for drag to work:
     * - Feature flag: Global on/off switch for the entire drag-and-drop feature
     * - enabled prop: Per-component control for specific use cases
     * 
     * Use cases for setting enabled={false}:
     * - Loading states: enabled={!isLoading}
     * - Availability: enabled={!isOutOfStock}
     * - User preferences: enabled={userPreferences.dragEnabled}
     * - UI modes: enabled={!isEditMode}
     * - Accessibility: enabled={!prefersReducedMotion}
     * 
     * @default true
     */
    enabled?: boolean
}

const ConditionalDragWrapper = ({ children, productData, enabled = true }: ConditionalDragWrapperProps): React.ReactElement => {
    const isDragDropEnabled = useProductDragAndDrop()

    // Combine all conditions: external enabled flag and drag-drop feature flag
    const shouldEnableDrag = enabled && isDragDropEnabled

    // If any condition fails, return children unwrapped
    if (!shouldEnableDrag) {
        return children
    }

    // Use seamless drag when enabled
    return (
        <DragWrapper productData={productData} source="sidepanel">
            {children}
        </DragWrapper>
    )
}

export default ConditionalDragWrapper
