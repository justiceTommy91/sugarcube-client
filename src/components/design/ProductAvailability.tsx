import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import { useSugarcubeContext } from 'apps/SugarcubeContext'
import type { ProductData } from 'models/furniture'
import { requestStoreSelectionChange } from 'models/furniture/actions'
import SSRIcon from '@ingka/ssr-icon'
import deliveryTruck from '@ingka/ssr-icon/paths/delivery-truck'
import clickAndCollect from '@ingka/ssr-icon/paths/click-and-collect'
import storeIcon from '@ingka/ssr-icon/paths/store'

import { useAppDispatch, useStoreLocation } from 'hooks'
import { CAN_PICK_UP, NO_PICK_UP, PickupIndicator } from 'models/furniture/constants'

require('./ProductAvailability.scss')

interface ProductAvailabilityProps {
    productData: ProductData
    wide?: boolean
}

const ProductAvailability = ({ productData, wide }: ProductAvailabilityProps) => {
    const { t } = useTranslation('translation')
    const { isMobile } = useSugarcubeContext()
    const dispatch = useAppDispatch()

    const location = useStoreLocation()

    const requestZipcode = useCallback(() => {
        dispatch(requestStoreSelectionChange(true))
    }, [])

    const requestStore = useCallback(() => {
        dispatch(requestStoreSelectionChange(false))
    }, [])

    const {
        availability: { online, pickup, store },
    } = productData

    if (isMobile) {
        return null
    }

    if (!wide && !(online || pickup || store)) {
        return null
    }

    let pickupIndicator: PickupIndicator | null = null

    if (pickup !== null && pickup) {
        pickupIndicator = CAN_PICK_UP
    } else if (pickup !== null && !pickup) {
        pickupIndicator = NO_PICK_UP
    }

    const { zipcode, storeName } = location

    const onlineAvailability = t(`availability.online.${online}`)
    const onlineAvailabilityWithZip = zipcode ? t(`availability.online.${online}-zip`, { zipcode }) : onlineAvailability

    const pickupAvailability = storeName
        ? t(`availability.pickup.${pickupIndicator}-store`, { storeName })
        : t(`availability.pickup.${pickupIndicator}`)
    const storeAvailability = storeName
        ? t(`availability.store.${store}-store`, { storeName })
        : t(`availability.store.${store}`)

    const availabilityOptions = [
        {
            id: 'delivery',
            label: t('availability.delivery'),
            status: onlineAvailability,
            statusFull: onlineAvailabilityWithZip,
            icon: deliveryTruck,
            onClick: requestZipcode,
            indicator: online,
            showStatus: true,
            condition: wide || online !== null,
        },
        {
            id: 'pickup',
            label: t('availability.pick up'),
            status: pickupAvailability,
            statusFull: pickupAvailability,
            icon: clickAndCollect,
            onClick: requestStore,
            indicator: pickupIndicator,
            showStatus: false,
            condition: wide || pickup !== null,
        },
        {
            id: 'store',
            label: t('availability.purchase'),
            status: storeAvailability,
            statusFull: storeAvailability,
            icon: storeIcon,
            onClick: requestStore,
            indicator: store,
            showStatus: true,
            condition: wide || store !== null,
        },
    ].filter((option) => option.condition)

    // Use role="group" instead of <nav> because these buttons open side panels
    // for location details rather than navigating to new pages. This avoids
    // creating false navigation landmarks for screen readers.
    return (
        <div role="group" aria-label={t('availability.options')}>
            {/* Keep the list structure inside the group to provide position context
                 and count information to screen readers (e.g., "1 of 3") */}
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ul className={classNames('ProductAvailability', { wide })} role="list">
                {availabilityOptions.map((option, index) => (
                    <li key={option.id} className={classNames('statusLine', { pickup: option.id === 'pickup' })}>
                        <SSRIcon paths={option.icon} />
                        <button className="description" onClick={option.onClick}>
                            {/* Position announcements help screen readers understand list context */}
                            <span className="sr-only">{`${index + 1} of ${availabilityOptions.length}: `}</span>
                            {option.label}
                        </button>
                        <div className={`indicator ${option.indicator}`} />
                        {option.showStatus && <span className="availability">{option.status}</span>}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default ProductAvailability
