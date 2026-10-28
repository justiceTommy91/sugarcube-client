import type { APIProduct } from 'models/furniture/index'
import fetchWrapper from './index'

export interface DimensionRange {
    min: number
    max: number
}

export interface FurnitureSearchParams {
    queryTerm?: string | null
    categoryId?: string | null
    measurementsWidth: DimensionRange
    measurementsDepth: DimensionRange
    measurementsHeight: DimensionRange
    lods?: string | null
}

export interface MeasureReference {
    metric: string
    imperial: string
}

export type FurnitureItem = APIProduct & {
    measureReference: MeasureReference
    genericId?: string | null
}

export interface FurnitureSearchResponse {
    products: FurnitureItem[]
    variants: Record<
        string,
        {
            variantsType: Record<string, { typeName: string; values: { value: string; items: number[] }[] }>
            variantFurnitures: FurnitureItem[]
        }
    >
}

const buildQueryString = (params: FurnitureSearchParams): string => {
    const query = new URLSearchParams()

    if (params.queryTerm) query.set('q', params.queryTerm)
    if (params.categoryId) query.set('category', params.categoryId)

    query.set('measurements_width', `${params.measurementsWidth.min}-${params.measurementsWidth.max}`)
    query.set('measurements_depth', `${params.measurementsDepth.min}-${params.measurementsDepth.max}`)
    query.set('measurements_height', `${params.measurementsHeight.min}-${params.measurementsHeight.max}`)
    // TODO: Remove once wall_placeable items are supported for bbox placement.
    query.set('geometry_type', '3d')
    if (params.lods) query.set('lods', params.lods)
    // Request a large page so we get all matches in one request (default is much smaller).
    query.set('size', '1000')
    return query.toString()
}

export const fetchFurnitureWithDimensions = async (params: FurnitureSearchParams): Promise<FurnitureSearchResponse> =>
    fetchWrapper<FurnitureSearchResponse>(`/find_my_fit/search/?${buildQueryString(params)}`)
