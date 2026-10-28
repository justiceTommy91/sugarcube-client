import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ModalHeader, Theatre } from '@ingka/modal'
import Carousel from '@ingka/carousel'
import Image from '@ingka/image'

import { AccessibleModal } from 'components/AccessibleModal'

import './ProductImageGalleryModal.scss'

export interface ProductImageGalleryModalProps {
    isOpen: boolean
    onClose: () => void
    images: string[]
    initialIndex: number
    productDescription: string
}

export const ProductImageGalleryModal: React.FC<ProductImageGalleryModalProps> = ({
    isOpen,
    onClose,
    images,
    initialIndex,
    productDescription,
}) => {
    const { t } = useTranslation()
    const [slideIndex, setSlideIndex] = useState(initialIndex)

    // Sync slideIndex when modal opens with a new initialIndex
    useEffect(() => {
        if (isOpen) {
            setSlideIndex(initialIndex)
        }
    }, [isOpen, initialIndex])

    const onPrev = () => {
        setSlideIndex((prev) => Math.max(0, prev - 1))
    }

    const onNext = () => {
        setSlideIndex((prev) => Math.min(images.length - 1, prev + 1))
    }

    return (
        <AccessibleModal
            className="ProductImageGalleryModal"
            isOpen={isOpen}
            onClose={onClose}
            wrapContent={false}
            // eslint-disable-next-line i18next/no-literal-string
            initialFocusSelector="#carousel__product-image-gallery"
        >
            <Theatre header={<ModalHeader floating />} open={isOpen}>
                <div className="ProductImageGalleryModal__content">
                    <Carousel
                        id="product-image-gallery"
                        isSlideShow
                        slideIndex={slideIndex}
                        controlBtnType="primary"
                        onBtnLeftClick={onPrev}
                        onBtnRightClick={onNext}
                        ariaLabelLeftBtn={t('aria.previous')}
                        ariaLabelRightBtn={t('aria.next')}
                        tabIndex={-1}
                    >
                        {images.map((src, i) => (
                            <div key={src} className="ProductImageGalleryModal__slide">
                                <Image
                                    className="ProductImageGalleryModal__image"
                                    src={src}
                                    alt={t('aria.product image', {
                                        product: `${productDescription} ${i + 1}`,
                                    })}
                                />
                            </div>
                        ))}
                    </Carousel>
                </div>
            </Theatre>
        </AccessibleModal>
    )
}
