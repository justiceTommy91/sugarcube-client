import * as RenderItemTypes from 'constants/renderItemTypes'
import type { ProductData } from 'models/furniture'
import { isWallPlaceableOnly, isWallOrFloor, isWallAndFloor, isSnapRotatable } from 'utils/placeables'
import { localizedCurrency } from 'utils/convertCurrency'
import { PlacingBehavior } from 'Renderer/geomviewer'
import * as productTypes from './constants'

export interface ProductTrackingInfo {
    ProductTitle: string
    ProductId: number
    ProductType: string
    ProductMeta: string | null
    LocalItemNumber: string
    OnlineAvailability: string | null
    InStoreAvailability: string | null
    PickupAvailability: boolean | null
    CanStack: boolean
    HasStackableLandingZones: boolean
    placingBehavior: string
    isMirrorable: boolean
    isSnapRotatable: boolean
    Value: number
    Currency: string
}

export type ProductList = {
    ProductsAdded: number
    AddedFrom?: productTypes.TrackingAddedFrom | undefined
}

function getProdType(product: ProductData): productTypes.ProductType {
    if (product.renderType === RenderItemTypes.ART_ITEM) {
        return productTypes.PRODUCT_TYPE_WALLART
    }
    if (product.combinablesSocketSet) {
        return productTypes.PRODUCT_TYPE_CUSTOMIZABLE_SALES_DRESSING
    }
    if (product?.metadata?.combinables?.selfMeta?.category === 'bed_frame') {
        return productTypes.PRODUCT_TYPE_SALES_DRESSED_BEDS
    }
    if (product?.metadata?.combinables?.selfMeta?.category === 'accent_pillow') {
        return productTypes.PRODUCT_TYPE_ACCENT_PILLOW
    }
    if (product?.metadata?.combinables?.selfMeta?.category === 'duvet_set_pillow') {
        return productTypes.PRODUCT_TYPE_DUVET_SET
    }
    return isWallPlaceableOnly(product.placeables)
        ? productTypes.PRODUCT_TYPE_WALLFURNITURE
        : productTypes.PRODUCT_TYPE_FURNITURE
}

function getProdMeta(product: ProductData) {
    return product?.metadata?.combinables?.selfMeta?.variant || null
}

function getProdPlacingBehavior(product: ProductData): string {
    switch (product.renderType) {
        case RenderItemTypes.ART_ITEM:
            return PlacingBehavior.WALL_ART
        case RenderItemTypes.FURNITURE_ITEM:
            if (isWallPlaceableOnly(product.placeables)) {
                return PlacingBehavior.ON_WALL
            }
            if (isWallOrFloor(product.placeables)) {
                return PlacingBehavior.WALL_OR_FLOOR
            }
            if (isWallAndFloor(product.placeables)) {
                return PlacingBehavior.WALL_AND_FLOOR
            }
            return PlacingBehavior.ON_FLOOR
        default:
            return PlacingBehavior.NONE // bed matress does not have render type and placing behavior
    }
}

export const getProductTrackingInfo = (product: ProductData): ProductTrackingInfo => {
    const { name, id, localItemNumber, availability, stacks, stackables, priceNumeral } = product
    const prodType = getProdType(product)
    const prodMeta = getProdMeta(product)
    const placingBehavior = getProdPlacingBehavior(product)

    const trackingInfo: ProductTrackingInfo = {
        ProductTitle: name,
        ProductId: id,
        ProductType: prodType,
        LocalItemNumber: localItemNumber,
        OnlineAvailability: availability?.online,
        InStoreAvailability: availability?.store,
        PickupAvailability: availability?.pickup,
        CanStack: !!stacks,
        ProductMeta: prodMeta,
        HasStackableLandingZones: stackables && stackables.length !== 0,
        placingBehavior,
        isMirrorable: !!product.mirrorType,
        isSnapRotatable: isSnapRotatable(product.placeables),
        Value: priceNumeral,
        Currency: localizedCurrency(),
    }

    return trackingInfo
}

export type GPUStatsTrackingInfo = {
    gpuStatsTier: number
    gpuStatsIsMobile: boolean | undefined
    gpuStatsGPU: string | undefined
    gpuStatsLoadTime: number
    gpuStatsCached: boolean
    gpuStatsType: string
    gpuStatsFps: number | undefined
}
