import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import SSRIcon from '@ingka/ssr-icon'
import deliveryTruck from '@ingka/ssr-icon/paths/delivery-truck'
import storeIcon from '@ingka/ssr-icon/paths/store'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import { useStoreLocation } from 'hooks/useStoreLocation'

import * as furnitureActions from 'models/furniture/actions'
import * as furnitureSelectors from 'models/furniture/selectors'
import { RenderItemComplete } from 'models/compositions'

require('./ProductAvailability.scss')

export type ProductAvailabilityProps = {
    productId: number
}

export const ProductAvailability = ({ productId }: ProductAvailabilityProps): React.ReactElement => {
    const dispatch = useAppDispatch()
    const requestZipcode = useCallback(() => {
        dispatch(furnitureActions.requestStoreSelectionChange(true))
    }, [])

    const requestStore = useCallback(() => {
        dispatch(furnitureActions.requestStoreSelectionChange(false))
    }, [])

    const {
        availability: { online, store },
    } = useAppSelector((state) => furnitureSelectors.getFurnitureById(state)[productId]) as RenderItemComplete

    const { storeName } = useStoreLocation()
    const { t } = useTranslation('translation')
    return (
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ul className="ProductAvailability" aria-label="Availability options" role="list">
            <li className="statusLine">
                <SSRIcon paths={deliveryTruck} />
                <button className="description" onClick={requestZipcode}>
                    {t('availability.delivery')}
                </button>
                <div className={`indicator ${online}`} />
                <span className="availability">{t(`availability.online.${online}`)}</span>
            </li>

            <li className="statusLine">
                <SSRIcon paths={storeIcon} />
                <button className="description" onClick={requestStore}>
                    {t('availability.purchase')}
                </button>
                <div className={`indicator ${store}`} />
                <span className="availability">
                    {storeName
                        ? t(`availability.store.${store}-store`, { storeName })
                        : t(`availability.store.${store}`)}
                </span>
            </li>
        </ul>
    )
}
