import React, { useEffect, useRef } from 'react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import Image from '@ingka/image'
import Price from '@ingka/price'
import ProductIdentifier from '@ingka/product-identifier'
import Status from '@ingka/status'
import cross from '@ingka/ssr-icon/paths/cross'
import plus from '@ingka/ssr-icon/paths/plus'

import { useAppDispatch, useAppSelector } from 'hooks'
import type { RenderItemComplete } from 'models/compositions'
import * as compositionActions from 'models/compositions/actions'
import * as furnitureSelectors from 'models/furniture/selectors'
import * as upptackaSelectors from 'models/upptacka/selectors'
import { upptackaActions } from 'models/upptacka/slice'
import { TRACK_LOCATION_UPPTACKA_PIP_PANEL } from 'models/tracking/constants'
import { formatCurrency } from 'utils/convertCurrency'
import { statusColor } from 'utils/statusColor'
import { convertProductId } from 'utils/convertProductId'

require('./UpptackaFurnitureDetailsPanel.scss')

export const UpptackaFurnitureDetailsPanel = () => {
    const imagesContainerRef = useRef<HTMLDivElement>(null)
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const isVisible = useAppSelector((state) => upptackaSelectors.getShowUpptackaDetailsView(state))
    const furnitureId = useAppSelector((state) => upptackaSelectors.getUpptackaDetailsFurnitureId(state))
    const product = useAppSelector(
        (state) => furnitureSelectors.getFurnitureById(state)[furnitureId],
    ) as RenderItemComplete
    const { currency, currencyPosition, currencyScriptType, decimal, fraction, integer } = formatCurrency(
        product?.priceNumeral,
    )
    useEffect(() => {
        // Reset scroll to the first image
        if (isVisible && imagesContainerRef.current) {
            imagesContainerRef.current.scrollTo({ left: 0 })
        }
    }, [isVisible])

    // Initial state will have no funitureId and product, but we still want to render the container div so that when we first toggle the panel, it can still animate up rather than 'pop' into the scene
    if (!furnitureId || !product) {
        return <div className="UpptackaFurnitureDetailsPanel" />
    }

    const footerOnClick = () => {
        dispatch(
            compositionActions.addProductToComposition(product.id, { AddedFrom: TRACK_LOCATION_UPPTACKA_PIP_PANEL }),
        )
        dispatch(upptackaActions.hideUpptackaDetailsView())
    }

    return (
        <div className={classNames('UpptackaFurnitureDetailsPanel', { isVisible })}>
            <div className="UpptackaFurnitureDetailsPanel__content">
                <Button
                    className="UpptackaFurnitureDetailsPanel__close"
                    iconOnly
                    ssrIcon={cross}
                    type="tertiary"
                    onClick={() => {
                        dispatch(upptackaActions.hideUpptackaDetailsView())
                    }}
                    text={t('aria.close')}
                />
                <Status
                    className="UpptackaFurnitureDetailsPanel__status"
                    label={t(`availability.store.${product.availability.store}`)}
                    statusColor={statusColor(product.availability.store)}
                    statusDotPosition="leading"
                />
                <h4 className="UpptackaFurnitureDetailsPanel__name">{product.name}</h4>
                <span className="UpptackaFurnitureDetailsPanel__description">{product.description}</span>
                <Price
                    className="UpptackaFurnitureDetailsPanel__price"
                    currencyLabel={currency}
                    currencyPosition={currencyPosition === 'before' ? 'leading' : 'trailing'}
                    currencySpacing="thin"
                    currencyVerticalAlignment={currencyScriptType === 'superscript' ? 'super' : 'base'}
                    decimalSign={decimal}
                    decimalValue={fraction}
                    integerValue={integer}
                    size="large"
                />
                <ProductIdentifier
                    className="UpptackaFurnitureDetailsPanel__identifier"
                    value={convertProductId(product.localItemNumber)}
                    subtle
                />
                <div ref={imagesContainerRef} className="UpptackaFurnitureDetailsPanel__images">
                    {product.imageUrls?.map((imageUrl) => (
                        <Image src={imageUrl} className="UpptackaFurnitureDetailsPanel__image" loading="eager" />
                    ))}
                </div>
            </div>
            <div className="UpptackaFurnitureDetailsPanel__footer">
                <Button
                    type="primary"
                    ssrIcon={plus}
                    text={t('design.add to your room')}
                    fluid
                    onClick={footerOnClick}
                />
            </div>
        </div>
    )
}
