export type Category = {
    key: string
    label: string
    subCategories: Array<{ key: string; label: string }>
}

export type GenericSearchFacetOption = {
    key: string
    label: string
    count: number
}

export type SearchFacet<Opt = GenericSearchFacetOption> = {
    parameter: string
    label: string
    options: Opt[]
    type?: string
    count?: number
}

export type ColorSearchFacetOption = {
    key: string
    label: string
    count: number
    color: string
}

export type SearchFacets = {
    price?: SearchFacet
    color?: SearchFacet<ColorSearchFacetOption>
    size?: SearchFacet
    type?: SearchFacet
    material?: SearchFacet
    category?: SearchFacet
    series?: SearchFacet
    features?: SearchFacet
    customerRating?: SearchFacet
    // Allow any other filters that might come from the API
    [key: string]: SearchFacet<GenericSearchFacetOption> | undefined
}
