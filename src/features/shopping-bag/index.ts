import { useAppDispatch, useAppSelector } from 'hooks'
import type { ProductData } from 'models/furniture'
import { getProductTrackingInfo } from 'models/tracking/utils'
import { getFurnitureById } from 'models/furniture/selectors'
import { useStore } from 'react-redux'
import { RootState } from 'store'

import { getSelectedCompositionShoppableProductData } from 'models/compositions/selectors'
import type { TrackingAddedFrom } from 'models/tracking/constants'
import { getInvalidLocalItemNumbers } from 'models/ui/selectors'

import { addToBag, addRoomToBag as addRoomToBagAction, openBag as openBagAction } from './redux/actions'
import {
    getHasAddedSomethingToBag,
    getIsAddingToCart,
    getIsAddingProduct,
    getIsProductAdded,
    getIsRoomAdded,
} from './redux/selectors'
import { AddToBagSource } from './constants'

export { AddToBagSource }

export function useShoppingBag() {
    const dispatch = useAppDispatch()
    const store = useStore<RootState>()
    const hasAddedSomethingToBag = useAppSelector(getHasAddedSomethingToBag)
    const isAddingToCart = useAppSelector(getIsAddingToCart)
    const isRoomAdded = useAppSelector(getIsRoomAdded)

    async function addItemToBag({
        productId,
        trackingInfoAddedFrom,
        source,
        hideToast,
        uniqueId,
    }: {
        productId: ProductData['id']
        trackingInfoAddedFrom?: TrackingAddedFrom | undefined
        source?: AddToBagSource
        hideToast?: boolean
        uniqueId?: string | number
    }) {
        const productData = getFurnitureById(store.getState())[productId]
        if (productData == null) {
            throw new Error(`unable to find product with id ${productId} in redux store`)
        }
        const { id } = productData

        const productTrackingInfo = getProductTrackingInfo(productData)
        const addedFromTrackingInfo = trackingInfoAddedFrom ? { AddedFrom: trackingInfoAddedFrom } : {}
        const trackingInfo = {
            ...productTrackingInfo,
            ...addedFromTrackingInfo,
        }

        dispatch(addToBag(id, trackingInfo, source, hideToast, uniqueId))
    }

    async function dispatchAddRoomToBagAction(
        products: ProductData[],
        trackingInfoAddedFrom: TrackingAddedFrom | undefined,
        blockRedirect: boolean,
        hideToast: boolean,
    ) {
        const productIds = products.map((item) => item.localItemNumber)
        const region = products.length ? products[0].region : null
        const trackingInfo = { ProductsAdded: products.length, AddedFrom: trackingInfoAddedFrom }

        dispatch(addRoomToBagAction(productIds, region, trackingInfo, blockRedirect, hideToast))
    }

    const roomItems = useAppSelector(getSelectedCompositionShoppableProductData) as ProductData[]
    const invalidLocalItemNumbers = useAppSelector(getInvalidLocalItemNumbers)

    async function addRoomToBag({
        trackingInfoAddedFrom,
        blockRedirect = false,
        hideToast = false,
    }: {
        trackingInfoAddedFrom?: TrackingAddedFrom | undefined
        blockRedirect?: boolean
        hideToast?: boolean
    }) {
        dispatchAddRoomToBagAction(roomItems, trackingInfoAddedFrom, blockRedirect, hideToast)
    }

    async function addMultipleItemsToBag({
        products,
        trackingInfoAddedFrom,
        blockRedirect = false,
        hideToast = false,
    }: {
        products: ProductData[]
        trackingInfoAddedFrom: TrackingAddedFrom | undefined
        blockRedirect?: boolean
        hideToast?: boolean
    }) {
        dispatchAddRoomToBagAction(products, trackingInfoAddedFrom, blockRedirect, hideToast)
    }

    async function openBag() {
        dispatch(openBagAction())
    }

    function isAddingProductToBag(productId: number, source?: AddToBagSource, uniqueId?: string | number) {
        return getIsAddingProduct(productId, source, uniqueId)(store.getState())
    }

    function isProductAdded(productId: number, source?: AddToBagSource, uniqueId?: string | number) {
        return getIsProductAdded(productId, source, uniqueId)(store.getState())
    }

    return {
        addItemToBag,
        hasAddedSomethingToBag,
        isAddingToCart,
        isAddingProductToBag,
        isProductAdded,
        isRoomAdded,
        roomItems,
        addRoomToBag,
        openBag,
        addMultipleItemsToBag,
        invalidLocalItemNumbers,
    }
}
