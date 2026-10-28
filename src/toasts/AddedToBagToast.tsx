import React from 'react'
import { useTranslation, Trans } from 'react-i18next'

import { useAppSelector } from 'hooks'
import { getProductsFromLocalItemNumbers } from 'models/compositions/selectors'
import ControlledToast from './ControlledToast'

require('./AddedToBagToast.scss')

export type AddedToBagToastProps = {
    onDismiss: () => void
    name?: string
    count?: number
    failed?: boolean
    invalidItems?: string[]
}

const AddedToBagToast: React.FunctionComponent<AddedToBagToastProps> = ({
    onDismiss,
    name,
    count = 1,
    failed = false,
    invalidItems = [],
}) => {
    const { t } = useTranslation('translation')
    const invalidProducts = useAppSelector((state) => getProductsFromLocalItemNumbers(state, invalidItems))
    let message
    let announcement // Plain text version for screen readers
    
    if (!failed && invalidItems.length > 0) {
        const invalidProductNames = invalidProducts.map((product) => product.name).join(', ')
        message = (
            <Trans
                i18nKey="toasts.multiple added to bag except invalid items"
                values={{ invalidItems: invalidProductNames }}
                shouldUnescape
            />
        )
        announcement = t('toasts.multiple added to bag except invalid items', { invalidItems: invalidProductNames })
    } else if (failed) {
        if (count > 1) {
            message = t('toasts.unable to add', { count })
            announcement = t('toasts.unable to add', { count })
        } else {
            message = t('toasts.unable to add', { count: 1 })
            announcement = t('toasts.unable to add', { count: 1 })
        }
    } else if (name) {
        // use Trans to unescape strings
        message = (
            <Trans
                i18nKey="toasts.named added to bag"
                values={{ name }}
                defaults={t('toasts.multiple added to bag', { count: 1 })}
                shouldUnescape
            />
        )
        announcement = t('toasts.named added to bag', { name })
    } else if (count > 1) {
        message = t('toasts.multiple added to bag', { count })
        announcement = t('toasts.multiple added to bag', { count })
    } else {
        message = t('toasts.multiple added to bag', { count: 1 })
        announcement = t('toasts.multiple added to bag', { count: 1 })
    }

    return <ControlledToast className="AddedToBagToast" text={message} announcement={announcement} onDismiss={onDismiss} />
}

export default AddedToBagToast
