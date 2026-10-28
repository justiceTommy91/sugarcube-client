import React from 'react'

import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import { ProductImageGalleryModal } from './ProductImageGalleryModal'

export const ImageGalleryModalFromContext: React.FC = () => {
    const { imageGalleryModal, closeImageGalleryModal } = useDesignSidebarContext()
    if (!imageGalleryModal) return null
    return (
        <ProductImageGalleryModal
            isOpen={imageGalleryModal.isOpen}
            onClose={closeImageGalleryModal}
            images={imageGalleryModal.images}
            initialIndex={imageGalleryModal.initialIndex}
            productDescription={imageGalleryModal.productDescription}
        />
    )
}
