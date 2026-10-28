/* eslint-disable i18next/no-literal-string */
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

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

require('./ProductAvailabilityFull.scss')

export type ProductAvailabilityFullProps = {
    productId: number
}

/**
 * Product availability actions component using WCAG-compliant button group pattern.
 *
 * This component presents three action buttons that allow users to check/configure
 * availability information for delivery, pickup, and in-store options. Originally
 * designed as a list, this was refactored to use a button group pattern which is
 * more semantically correct since these are interactive actions, not static list items.
 *
 * Accessibility features:
 * - Button group pattern (role="group") for related actions
 * - Descriptive aria-labels including current status
 * - Visual status indicators marked as decorative (aria-hidden)
 * - Screen reader announcements for all availability states
 * - Proper keyboard navigation and focus management
 *
 * @see Story 1.3 - Implement proper semantic grouping for action buttons
 */
export const ProductAvailabilityFull = ({ productId }: ProductAvailabilityFullProps): React.ReactElement => {
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

    // Button group pattern: semantically correct for related action buttons
    return (
        <div className="ProductAvailabilityFull" role="group" aria-label="Check availability options">
            {/* Delivery availability action */}
            <Tooltip
                place="bottom"
                describedById={ttId}
                title={`${onlineAvailabilityWithZip}. ${clickChange}`}
                boundaryContainerID="DesignSidepanelOverlayPanel"
            >
                <button
                    className="statusLine"
                    onClick={requestZipcode}
                    aria-label={`${t('availability.delivery')}: ${onlineAvailability}`}
                >
                    <SSRIcon paths={deliveryTruck} aria-hidden="true" />
                    <span className="label">{t('availability.delivery')}</span>
                    <div className={`indicator ${online}`} aria-hidden="true" />
                    <span className="availability">{onlineAvailability}</span>
                </button>
            </Tooltip>

            {/* Pickup availability action */}
            <Tooltip
                place="bottom"
                describedById={ttId}
                title={`${pickupAvailability}. ${clickChange}`}
                boundaryContainerID="DesignSidepanelOverlayPanel"
            >
                <button
                    className="statusLine pickup"
                    onClick={requestStore}
                    aria-label={`${t('availability.pick up')}: ${pickupAvailability}`}
                >
                    <SSRIcon paths={clickAndCollect} aria-hidden="true" />
                    <span className="label">{t('availability.pick up')}</span>
                    <div className={`indicator ${pickupIndicator}`} aria-hidden="true" />
                    {/* Screen reader only text for pickup status (no visible text) */}
                    <span className="sr-only">{pickupAvailability}</span>
                </button>
            </Tooltip>

            {/* In-store availability action */}
            <Tooltip
                place="bottom"
                describedById={ttId}
                title={`${storeAvailability}. ${clickChange}`}
                boundaryContainerID="DesignSidepanelOverlayPanel"
            >
                <button
                    className="statusLine"
                    onClick={requestStore}
                    aria-label={`${t('availability.purchase')}: ${storeAvailability}`}
                >
                    <SSRIcon paths={storeIcon} aria-hidden="true" />
                    <span className="label">{t('availability.purchase')}</span>
                    <div className={`indicator ${store}`} aria-hidden="true" />
                    <span className="availability">{storeAvailability}</span>
                </button>
            </Tooltip>
        </div>
    )
}
