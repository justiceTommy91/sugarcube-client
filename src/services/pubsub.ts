import { ProductData } from 'models/furniture'

const CART_CLIENT = 'CART_CLIENT'
const PUB_SUB_SOURCE = 'KREATIV'
export const PUB_SUB_ADD_CART = `${CART_CLIENT}/ADD_TO_CART`
export const PUB_SUB_ADD_CART_SUCCESS = `${CART_CLIENT}/ADD_TO_CART_SUCCESS`
export const PUB_SUB_ADD_CART_FAILURE = `${CART_CLIENT}/ADD_TO_CART_FAIL`

type CartItem = {
    productNumber: string
    quantity: string
    productName: string
    productType: string
    productPrice: number
}

type CartPubSubData = {
    items: CartItem[]
}

export type PubSubData = CartPubSubData

export const getPubSubCartItem = (furnitureItem: ProductData) => {
    const { name, localItemNumber, typeName, priceNumeral } = furnitureItem
    return {
        productNumber: localItemNumber,
        quantity: '1',
        productName: name,
        productType: typeName || '',
        productPrice: Math.round(priceNumeral),
    }
}

export const publish = (event: string, pubSubData: PubSubData) => {
    const { items } = pubSubData
    const data = {
        items,
        source: PUB_SUB_SOURCE,
    }
    window.ikea?.pubsub?.publish?.(event, data)
}

export const subscribe = <T>(event: string) =>
    new Promise<T>((resolve) => {
        window.ikea?.pubsub?.subscribe?.(event, (d: unknown) => resolve(d as T))
    })

export const isPubSubAvailable = () =>
    typeof window.ikea?.pubsub?.publish === 'function' && typeof window.ikea?.pubsub?.subscribe === 'function'
