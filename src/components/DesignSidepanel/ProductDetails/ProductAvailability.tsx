import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import SSRIcon from '@ingka/ssr-icon'
import deliveryTruck from '@ingka/ssr-icon/paths/delivery-truck'
import clickAndCollect from '@ingka/ssr-icon/paths/click-and-collect'
import storeIcon from '@ingka/ssr-icon/paths/store'

import Tooltip from 'components/Tooltip'

import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import { useStoreLocation } from 'hooks/useStoreLocation'

import type { FurnitureRenderItemComplete } from 'models/compositions'
import { requestStoreSelectionChange } from 'models/furniture/actions'
import { CAN_PICK_UP, NO_PICK_UP, PickupIndicator } from 'models/furniture/constants'
import { getFurnitureById } from 'models/furniture/selectors'

require('./ProductAvailability.scss')

export type ProductAvailabilityProps = {
    productId: number
}

export const ProductAvailability = ({ productId }: ProductAvailabilityProps): React.ReactElement => {
    const { t } = useTranslation('translation')
    const dispatch = useAppDispatch()

    const location = useStoreLocation()

    const requestZipcode = useCallback(() => {
        dispatch(requestStoreSelectionChange(true))
    }, [])

    const requestStore = useCallback(() => {
        dispatch(requestStoreSelectionChange(false))
    }, [])

    const {
        availability: { pickup, online, store },
    } = useAppSelector((state) => getFurnitureById(state)[productId]) as FurnitureRenderItemComplete
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

    const clickChange = t('availability.click to change')

    const ttId = `availabilityToolTip${productId}`

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
        },
    ]

    // Use role="group" instead of <nav> because these buttons open side panels
    // for location details rather than navigating to new pages. This avoids
    // creating false navigation landmarks for screen readers.
    return (
        <div role="group" aria-label="Availability options">
            {/* Keep the list structure inside the group to provide position context
                 and count information to screen readers (e.g., "1 of 3") */}
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ul className="ProductAvailability" role="list">
                {availabilityOptions.map((option, index) => (
                    <Tooltip
                        place="bottom"
                        describedById={ttId}
                        title={`${option.statusFull}. ${clickChange}`}
                        boundaryContainerID="DesignSidepanelOverlayPanel"
                    >
                        <li
                            key={option.id}
                            className={classNames('statusLine', { pickup: option.id === 'pickup' })}
                            data-tip={`${option.statusFull}. ${clickChange}`}
                            data-for={ttId}
                        >
                            <button className="description" onClick={option.onClick}>
                                {/* Position announcements help screen readers understand list context */}
                                <span className="sr-only">{`${index + 1} of ${availabilityOptions.length}: `}</span>
                                <SSRIcon paths={option.icon} aria-hidden="true" />
                                <span>{option.label}</span>
                                <div className={`indicator ${option.indicator}`} aria-hidden="true" />
                                {option.showStatus && <span className="availability">{option.status}</span>}
                                {!option.showStatus && <span className="sr-only">{option.status}</span>}
                            </button>
                        </li>
                    </Tooltip>
                ))}
            </ul>
        </div>
    )
}
