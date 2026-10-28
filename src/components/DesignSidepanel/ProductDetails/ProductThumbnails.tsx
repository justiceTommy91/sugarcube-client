/* eslint-disable consistent-return */
import React from 'react'
import { useTranslation } from 'react-i18next'

import Button from '@ingka/button'
import chevronLeftSmall from '@ingka/ssr-icon/paths/chevron-left-small'
import chevronRightSmall from '@ingka/ssr-icon/paths/chevron-right-small'
import Image from '@ingka/image'

import { useAppSelector } from 'hooks/useAppSelector'
import { useAriaTabCarousel } from 'hooks/aria/useAriaTabCarousel'

import { type FurnitureRenderItemComplete } from 'models/compositions'
import { getFurnitureById } from 'models/furniture/selectors'

import classNames from 'classnames'
import { useDesignSidebarContext } from 'components/design/DesignSidepanelContext'
import './ProductThumbnails.scss'

export type ProductThumbnailsProps = {
    productId: number
}

export const ProductThumbnails: React.FunctionComponent<ProductThumbnailsProps> = ({ productId }) => {
    const product = useAppSelector((state) => getFurnitureById(state)[productId]) as FurnitureRenderItemComplete
    const productDescription = `${product.name} ${product.description}`

    const { t } = useTranslation()

    const { openImageGalleryModal } = useDesignSidebarContext()

    const slidePickersRef = React.useRef<HTMLDivElement | null>(null)
    const [isTransitioning, setIsTransitioning] = React.useState(false)
    React.useEffect(() => {
        const slidePickersWrapper = slidePickersRef.current
        if (slidePickersWrapper == null) {
            return
        }

        // Wait until the mouse moves to signal that transition has ended.
        let transitionEnded = true
        const onMouseMove = () => {
            if (transitionEnded) {
                setIsTransitioning(false)
            }
        }
        const onTransitionStart = () => {
            transitionEnded = false
            setIsTransitioning(true)
            document.addEventListener('mousemove', onMouseMove, { once: true })
        }
        slidePickersWrapper.addEventListener('transitionstart', onTransitionStart)
        const onTransitionEnd = () => {
            transitionEnded = true
        }
        slidePickersWrapper.addEventListener('transitionend', onTransitionEnd)

        return () => {
            document.removeEventListener('mousemove', onMouseMove)
            slidePickersWrapper.removeEventListener('transitionend', onTransitionEnd)
            slidePickersWrapper.removeEventListener('transitionstart', onTransitionStart)
        }
    }, [])

    const thumbnails = product.imageUrls ?? []
    const nThumbnails = thumbnails.length
    const carousel = useAriaTabCarousel({
        nSlides: nThumbnails,
        'aria-label': t('aria.product images', { product: productDescription }),
    })
    const productImage = product.imageUrls?.[carousel.selectedSlide] || ''
    const hasMoreThanOneImage = thumbnails.length > 1
    return (
        <section
            {...carousel.carouselProps()}
            className={classNames('ProductThumbnails', { ProductThumbnails_isTransitioning: isTransitioning })}
        >
            <div {...carousel.slidesContainerProps()} className="ProductThumbnails__controls">
                {hasMoreThanOneImage && (
                    <Button
                        {...carousel.prevButtonProps()}
                        className="ProductThumbnails__prevButton"
                        ssrIcon={chevronLeftSmall}
                        type="tertiary"
                        iconOnly
                        size="xsmall"
                        text={t('aria.previous')}
                    />
                )}
                <button
                    className="ProductThumbnails__mainImageButton"
                    onClick={() =>
                        openImageGalleryModal({
                            images: thumbnails,
                            initialIndex: carousel.selectedSlide,
                            productDescription,
                        })
                    }
                    aria-haspopup="dialog"
                >
                    <div {...carousel.slideProps(carousel.selectedSlide)}>
                        <Image
                            width={180}
                            height={180}
                            src={productImage}
                            alt={t('aria.product image', { product: `${product.name} ${carousel.selectedSlide + 1}` })}
                        />
                    </div>
                </button>
                {hasMoreThanOneImage && (
                    <Button
                        {...carousel.nextButtonProps()}
                        className="ProductThumbnails__nextButton"
                        ssrIcon={chevronRightSmall}
                        type="tertiary"
                        iconOnly
                        size="xsmall"
                        text={t('aria.next')}
                    />
                )}
            </div>

            <div className="ProductThumbnails__thumbnailPickersWrapper">
                {hasMoreThanOneImage && (
                    <div
                        {...carousel.slidePickersContainerProps({ ref: slidePickersRef })}
                        className="ProductThumbnails__thumbnailPickers"
                        style={{ transform: `translateX(-${(carousel.selectedSlide / nThumbnails) * 100}%)` }}
                    >
                        {thumbnails.map((src, i) => (
                            <button key={src} {...carousel.slidePickerButtonProps(i)}>
                                <Image
                                    className="ProductThumbnails__thumbnailPickerImage"
                                    width={52}
                                    height={52}
                                    src={src}
                                    alt={t('aria.product image', { product: `${product.name} ${i + 1}` })}
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
