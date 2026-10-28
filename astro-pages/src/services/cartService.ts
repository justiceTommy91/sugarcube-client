import { getRegion } from '@lib/url-utils'

import fetchWrapper from './index'

interface CartItem {
    itemNo: string
    quantity: number
}

const getCartApiPrefix = () => {
    const countryCode = getRegion().split('/')[0]
    const cartApiBase = process.env.GATSBY_CART_API
    return `${cartApiBase}/${countryCode}/`
}

const getLanguageCode = () => getRegion().split('/')[1]

export const addItemsToCart = (items: CartItem[]): Promise<void> =>
    fetchWrapper(
        'items',
        {
            method: 'POST',
            headers: {
                'X-Consumer-Name': 'Kreativ',
                'Accept-Language': getLanguageCode(),
            },
            body: JSON.stringify({ items }),
        },
        {
            baseUrl: getCartApiPrefix(),
            allowGuest: true,
        },
    )
