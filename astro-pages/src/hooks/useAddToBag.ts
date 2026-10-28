import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'

import { isProdOrCte } from '@models/location/selectors'
import { isPubSubAvailable, publish, PUB_SUB_ADD_CART_SUCCESS } from '@services/pubsub'
import { addItemsToCart } from '@astro-services/cartService'
import { useToast } from './useToast'

interface AddToBagProduct {
    localItemNumber: string
    name: string
    typeName?: string
    priceNumeral: number | string
}

interface AddToBagArgs {
    product: AddToBagProduct
}

interface ToastAction {
    text: string
    onAction: () => void
}

export function useAddToBag(toastAction?: ToastAction) {
    const { t } = useTranslation()
    const { showToast } = useToast()

    const { mutate, isPending, variables } = useMutation({
        mutationFn: ({ product }: AddToBagArgs) => {
            if (!isProdOrCte()) {
                return Promise.resolve()
            }
            return addItemsToCart([{ itemNo: product.localItemNumber, quantity: 1 }])
        },
        onSuccess: (_, { product }) => {
            showToast({
                text: t('toasts.added to bag', { name: product.name }),
                ...(toastAction && { actionButtonText: toastAction.text, onAction: toastAction.onAction }),
            })
            if (isPubSubAvailable()) {
                publish(PUB_SUB_ADD_CART_SUCCESS, {
                    items: [
                        {
                            productNumber: product.localItemNumber,
                            quantity: '1',
                            productName: product.name,
                            productType: product.typeName ?? '',
                            productPrice: Math.round(Number(product.priceNumeral)),
                        },
                    ],
                })
            }
        },
        onError: (error) => {
            showToast({ text: t('toasts.unable to add_one', { count: 1 }) })
            if (isProdOrCte()) {
                Sentry.captureException(error)
            }
        },
    })

    return { addToBag: mutate, pendingItemNumber: isPending ? variables?.product.localItemNumber ?? null : null }
}
