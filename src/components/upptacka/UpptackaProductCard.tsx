import React from 'react'
import Price from '@ingka/price'
import Status from '@ingka/status'
import SSRIcon from '@ingka/ssr-icon'
import informationCircle from '@ingka/ssr-icon/paths/information-circle'
import Image from '@ingka/image'

import { useAppDispatch, useAppSelector } from 'hooks'

import type { RenderItemComplete } from 'models/compositions'
import * as furnitureSelectors from 'models/furniture/selectors'
import { upptackaActions } from 'models/upptacka/slice'
import { formatCurrency } from 'utils/convertCurrency'
import { useTranslation } from 'react-i18next'
import { statusColor } from 'utils/statusColor'
import { trackGoogleAnalytics } from 'utils/tracker'
import {
    GA_ACTION_OPEN_UPPTACKA_PRODUCT_DETAILS,
    GA_CATEGORY_DYH_SUGARCUBE,
    ACTION_OPEN_UPPTACKA_PRODUCT_DETAILS,
} from 'models/tracking/constants'
import { useTracker } from 'apps/TrackingBoundary'

require('./UpptackaProductCard.scss')

type UpptackaProductCardProps = {
    productId: number
    onClick: React.MouseEventHandler<HTMLElement>
}

export const UpptackaProductCard = ({ productId, onClick }: UpptackaProductCardProps): React.ReactElement => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const track = useTracker()
    const product = useAppSelector(
        (state) => furnitureSelectors.getFurnitureById(state)[productId],
    ) as RenderItemComplete
    const { currency, currencyPosition, currencyScriptType, decimal, fraction, integer } = formatCurrency(
        product.priceNumeral,
    )
    const detailsButtonOnClick = () => {
        trackGoogleAnalytics({
            action: GA_ACTION_OPEN_UPPTACKA_PRODUCT_DETAILS,
            category: GA_CATEGORY_DYH_SUGARCUBE,
            label: product.localItemNumber,
        })
        track.click({
            target: 'upptacka.productDetailsButton',
            intendedAction: ACTION_OPEN_UPPTACKA_PRODUCT_DETAILS,
            attributes: {
                productId: product.localItemNumber,
            },
        })
        dispatch(upptackaActions.showUpptackaDetailsView(productId))
    }

    return (
        <article className="UpptackaProductCard">
            <button onClick={onClick} className="UpptackaProductCard__button">
                <Image
                    className="UpptackaProductCard__thumbnail"
                    width="184"
                    height="184"
                    loading="lazy"
                    src={`${product.thumbUrl}?f=u`}
                    alt={product.name}
                />
                <div className="UpptackaProductCard__name">{product.name}</div>
                <div className="UpptackaProductCard__description">{product.description}</div>
                <div className="UpptackaProductCard__price">
                    <Price
                        currencyLabel={currency}
                        currencyPosition={currencyPosition === 'before' ? 'leading' : 'trailing'}
                        currencySpacing="thin"
                        currencyVerticalAlignment={currencyScriptType === 'superscript' ? 'super' : 'base'}
                        decimalSign={decimal}
                        decimalValue={fraction}
                        integerValue={integer}
                        size="large"
                    />
                </div>
                <span className="UpptackaProductCard__divider" />
                <Status
                    className="UpptackaProductCard__status"
                    label={t(`availability.store.${product.availability.store}`)}
                    statusColor={statusColor(product.availability.store)}
                    statusDotPosition="leading"
                />
            </button>
            <button
                className="UpptackaProductCard__details-button"
                onClick={detailsButtonOnClick}
                aria-label={t('upptacka.product details button')}
            >
                <SSRIcon paths={informationCircle} />
            </button>
        </article>
    )
}
