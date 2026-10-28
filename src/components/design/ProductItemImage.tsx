import React, { useState } from 'react'
import classNames from 'classnames'

import SSRIcon from '@ingka/ssr-icon'
import arrowLeftArrowRight from '@ingka/ssr-icon/paths/arrow-left-arrow-right'
import plus from '@ingka/ssr-icon/paths/plus'
import Image from '@ingka/image'

import { useSugarcubeContext } from 'apps/SugarcubeContext'

import ProductIdentifier from '@ingka/product-identifier'

require('./ProductItemImage.scss')

interface ProductItemImageProps {
    thumbUrl: string
    name: string
    articleId: string
    showIcon?: boolean
    isInSwap?: boolean
}

const ProductItemImage = ({ thumbUrl, name, showIcon = false, isInSwap = false, articleId }: ProductItemImageProps) => {
    const [imgIsLoading, setImgIsLoading] = useState(true)

    const { isMobile } = useSugarcubeContext()

    const articleIdFormatted = articleId?.replace(/\D/g, '').replace(/(\d{3})(?=\d)/g, '$1.')

    return (
        <div className="imageContainer">
            {showIcon && (
                <div className={classNames('imgOverlay', 'overlay-on-group-hover', { isInSwap, mobile: isMobile })}>
                    <div className="ctaIcon">
                        {isInSwap ? <SSRIcon paths={arrowLeftArrowRight} /> : <SSRIcon paths={plus} />}
                    </div>
                </div>
            )}

            <Image
                src={`${thumbUrl}?f=u`}
                alt={name}
                className={classNames('thumbImage', { noIcon: !showIcon, imgIsLoading, isInSwap, mobile: isMobile })}
                onLoad={() => setImgIsLoading(false)}
            />

            {articleId && <ProductIdentifier value={articleIdFormatted} subtle />}
        </div>
    )
}

export default ProductItemImage
