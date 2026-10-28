import React from 'react'
import type { ProductData } from 'models/furniture'
import DropZoneWrapper from './DropZoneWrapper'
import { useProductDragAndDrop } from '../useProductDragAndDrop'

type ConditionalDropZoneWrapperProps = {
    children: JSX.Element
    onDrop?: (productData: ProductData, source: string) => void
    dropMessage: string
}

const ConditionalDropZoneWrapper = ({ children, onDrop, dropMessage }: ConditionalDropZoneWrapperProps) => {
    const isDragDropEnabled = useProductDragAndDrop()

    if (isDragDropEnabled) {
        return (
            <DropZoneWrapper onDrop={onDrop} dropMessage={dropMessage}>
                {children}
            </DropZoneWrapper>
        )
    }

    return children
}

export default ConditionalDropZoneWrapper
