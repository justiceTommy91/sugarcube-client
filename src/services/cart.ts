import fetch from 'services'
import { CartItem } from 'features/shopping-bag/redux'
import { getCartApiPrefix, getLanguageCode } from 'models/location/selectors'

export const addItemsToCart = (items: CartItem[]) => {
    const headers = {
        'X-Consumer-Name': 'Kreativ',
        'Accept-Language': getLanguageCode(),
        Accept: 'application/json',
        'Content-type': 'application/json',
    }

    return fetch(
        'items',
        {
            method: 'POST',
            data: { items },
            headers,
        },
        {
            baseUrl: getCartApiPrefix(),
            allowGuest: true,
        },
    )
}
