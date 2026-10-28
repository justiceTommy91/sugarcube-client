import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import { isProdOrCte } from '@models/location/selectors'
import { isPubSubAvailable, publish, PUB_SUB_ADD_CART_SUCCESS } from '@services/pubsub'
import { addItemsToCart } from '@astro-services/cartService'
import { useToast } from './useToast'
import type { FurnitureSearchItem } from '../components/kreativ-lite/hooks/useKreativLiteSearch'

interface ToastAction {
    text: string
    onAction: () => void
}

export function useAddAllToBag(toastAction?: ToastAction) {
    const { t } = useTranslation()
    const { showToast } = useToast()

    const { mutate, isPending } = useMutation({
        mutationFn: (items: FurnitureSearchItem[]) => {
            if (!isProdOrCte()) return Promise.resolve()
            const cartItems = items
                .filter((item): item is FurnitureSearchItem & { localItemNumber: string } => !!item.localItemNumber)
                .map((item) => ({ itemNo: item.localItemNumber, quantity: 1 }))
            if (!cartItems.length) return Promise.resolve()
            return addItemsToCart(cartItems)
        },
        onSuccess: (_, items) => {
            const count = items.filter((item) => item.localItemNumber).length
            showToast({
                text: t('toasts.multiple added to bag_other', { count }),
                ...(toastAction && { actionButtonText: toastAction.text, onAction: toastAction.onAction }),
            })
            if (isPubSubAvailable()) {
                publish(PUB_SUB_ADD_CART_SUCCESS, {
                    items: items
                        .filter((item): item is FurnitureSearchItem & { localItemNumber: string } => !!item.localItemNumber)
                        .map((item) => ({
                            productNumber: item.localItemNumber,
                            quantity: '1',
                            productName: item.name,
                            productType: '',
                            productPrice: Math.round(Number(item.priceNumeral ?? 0)),
                        })),
                })
            }
        },
        onError: (error) => {
            showToast({ text: t('toasts.unable to add_one', { count: 1 }) })
            if (isProdOrCte()) Sentry.captureException(error)
        },
    })

    return { addAllToBag: mutate, isPending }
}
