/* eslint-disable i18next/no-literal-string */
import React from 'react'

import { useAppSelector } from 'hooks/useAppSelector'

import type { RenderItemComplete } from 'models/compositions'
import * as compositionSelectors from 'models/compositions/selectors'

import { idle, type Idle, type AsyncResult } from 'utils/async'
import type { ValueOf } from 'utils/object'

export const ProductType = {
    ART_ITEM: 'ART_ITEM',
    FURNITURE_ITEM: 'FURNITURE_ITEM',
} as const
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ProductType = ValueOf<typeof ProductType>

/**
 * Product represents a distinct product from the IKEA catalog.
 */
export type Product = {
    /**
     * Globally unique identifier for the product.
     */
    id: number
    /**
     * Locally unique identifier for the product within a geographical region, e.g. "50305739" (usually rendered with
     * dot separators, e.g. "503.057.39").
     */
    localItemNumber: string
    /**
     * Family name of the product, e.g. "Kallax".
     */
    name: string
    /**
     * Detailed description of the product, generated from typeName and validDesign, e.g. 'Table, birch veneer'.
     */
    description: string
    /**
     * Whether the product supports mirrored confirgurations, e.g. left- or right-handed loveseat positions for a
     * couch.
     */
    canBeMirrored: boolean
    /**
     * What type of product, e.g. ART_ITEM or FURNITURE_ITEM.
     */
    productType: ProductType
}

/**
 * Furniture represents a {@link Product} which has been placed within a composition.
 */
export type Furniture = {
    /** Unique identifier for a particular instance of a product placed within a composition. */
    id: number
    product: Product
}

export const useCompositionFurniture = (furnitureId: number | Idle): AsyncResult<Furniture> => {
    const renderItem = useAppSelector((state) => {
        const renderItems = compositionSelectors.getSelectedCompositionProductData(state) as RenderItemComplete[]
        return renderItems?.find((p) => p.uniqueId === furnitureId)
    })

    const furniture = React.useMemo<Furniture | null>(() => {
        if (renderItem == null) {
            return null
        }
        const product: Product = {
            id: renderItem.id,
            localItemNumber: renderItem.localItemNumber,
            name: renderItem.name,
            description: renderItem.description ?? '',
            canBeMirrored: Boolean(renderItem.mirrorType),
            productType: renderItem.renderType,
        }
        return {
            id: renderItem.uniqueId,
            product,
        }
    }, [renderItem])

    if (furnitureId === idle) {
        return {
            status: 'idle',
            result: null,
            error: null,
        }
    }

    if (furniture == null) {
        return {
            status: 'error',
            result: null,
            error: new Error(`unable to find furniture w/ id ${furnitureId}`),
        }
    }

    return {
        status: 'success',
        result: furniture,
        error: null,
    }
}
