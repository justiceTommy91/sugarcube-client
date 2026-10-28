import React from 'react'
import classNames from 'classnames'
import { bool, string, func } from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { useGetPriceString } from 'hooks/useGetPriceString'
import './ProductItemDetail.scss'

const ProductItemDetail = ({ name, isNew, isLarge, description, price, isInSwap, wide, viewDetails }) => {
    const { t } = useTranslation()
    const { isKiosk } = useSugarcubeContext()
    const { getPriceString } = useGetPriceString()
    const viewDetailsAriaLabel = `${t('aria.product details')} ${name} ${description}`
    return (
        <div className={classNames('ProductItemDetail', { isSmall: !isLarge, isInSwap, wide })}>
            <div className="detailsText">
                {isNew && <div className="isNew">{t('design.new')}</div>}
                {wide ? (
                    <div className="nameAndPrice">
                        {viewDetails ? (
                            <button
                                className={classNames('name', { isLarge })}
                                onClick={viewDetails}
                                aria-label={viewDetailsAriaLabel}
                            >
                                {name}
                            </button>
                        ) : (
                            <h2 className={classNames('name', { isLarge, isStaticText: true })}>{name}</h2>
                        )}
                        {price && !isKiosk && <div className="price">{getPriceString(price)}</div>}
                    </div>
                ) : (
                    <h2>
                        <button className={classNames('name', { isLarge })} onClick={viewDetails}>
                            {name}
                        </button>
                    </h2>
                )}

                {description && (
                    <div className={classNames('description', { isSmall: !isLarge, wide })}>
                        {description}
                        <div className="fullDescription">{description}</div>
                    </div>
                )}
                {!wide && price && !isKiosk && <div className="price">{getPriceString(price)}</div>}
            </div>
        </div>
    )
}

ProductItemDetail.defaultProps = {
    isLarge: false,
    isNew: false,
    price: '',
    description: '',
    isInSwap: false,
    wide: false,
    viewDetails: null,
}

ProductItemDetail.propTypes = {
    name: string.isRequired,
    isNew: bool,
    isLarge: bool,
    price: string,
    description: string,
    isInSwap: bool,
    wide: bool,
    viewDetails: func,
}
export default ProductItemDetail
