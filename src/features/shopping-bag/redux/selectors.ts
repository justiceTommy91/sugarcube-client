import type { RootState } from 'store'

export const getHasAddedSomethingToBag = (state: RootState) => state.bag.hasAddedSomethingToBag
export const getIsAddingToCart = (state: RootState) => state.bag.isAddingToCart
export const getAddingProductId = (state: RootState) => state.bag.addingProductId
export const getAddedProductId = (state: RootState) => state.bag.addedProductId
export const getIsRoomAdded = (state: RootState) => state.bag.isRoomAdded
export const getIsAddingProduct =
    (productId: number, source?: string, uniqueId?: string | number) => (state: RootState) =>
        state.bag.addingProductId === productId &&
        (source === undefined || state.bag.addingProductSource === source) &&
        (uniqueId === undefined || state.bag.addingItemUniqueId === uniqueId)
export const getIsProductAdded =
    (productId: number, source?: string, uniqueId?: string | number) => (state: RootState) =>
        state.bag.addedProductId === productId &&
        (source === undefined || state.bag.addedProductSource === source) &&
        (uniqueId === undefined || state.bag.addedItemUniqueId === uniqueId)
