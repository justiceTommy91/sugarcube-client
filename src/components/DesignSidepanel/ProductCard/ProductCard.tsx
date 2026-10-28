import React from 'react'
import Image from '@ingka/image'

import { useAppSelector } from 'hooks/useAppSelector'
import { useGetPriceString } from 'hooks/useGetPriceString'

import { getFurnitureById } from 'models/furniture/selectors'
import { ProductData } from 'models/furniture'

require('./ProductCard.scss')

export type ProductCardProps = {
    productId: number
    primaryAction?: React.ReactElement
    secondaryAction?: React.ReactElement
    tertiaryAction?: React.ReactElement | null
    onClick?: React.MouseEventHandler<HTMLElement>
    onPointerEnter?: React.MouseEventHandler<HTMLElement>
    onPointerLeave?: React.MouseEventHandler<HTMLElement>
}

export const ProductCard = ({
    productId,
    primaryAction,
    secondaryAction,
    tertiaryAction,
    onClick,
    onPointerEnter,
    onPointerLeave,
}: ProductCardProps): React.ReactElement => {
    const product = useAppSelector((state) => getFurnitureById(state)[productId]) as ProductData
    const { getPriceString } = useGetPriceString()
    const nameId = React.useId()
    const descriptionId = React.useId()
    return (
        <article
            className="ProductCard"
            aria-labelledby={nameId}
            aria-describedby={descriptionId}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            <button className="ProductCard__details" onClick={onClick}>
                <div className="ProductCard__thumbnail">
                    <Image width="133" height="133" src={product.thumbUrl} alt={product.name} />
                </div>

                <div className="ProductCard__info">
                    <h4 id={nameId} className="ProductCard__name">
                        {product.name}
                    </h4>

                    <div id={descriptionId} className="ProductCard__descriptionWrapper">
                        <p className="ProductCard__description">{product.description}</p>

                        <div className="ProductCard__price">{getPriceString(product.price)}</div>
                    </div>
                </div>
            </button>

            {primaryAction && <div className="ProductCard__primaryAction">{primaryAction}</div>}

            {secondaryAction && <div className="ProductCard__secondaryAction">{secondaryAction}</div>}

            {tertiaryAction && <div className="ProductCard__tertiaryAction">{tertiaryAction}</div>}
        </article>
    )
}
