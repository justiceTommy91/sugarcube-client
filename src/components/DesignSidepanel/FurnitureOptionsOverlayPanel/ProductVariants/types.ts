export type ProductVariant = {
    productId: number
    thumbUrl: string
    valueKey: string
    selected: boolean
    disabled: boolean
}

export type ProductVariantCategory = {
    type: string
    typeName: string
    options: ProductVariant[]
    showThumbnail: boolean
    selectedFurniturePrice: number
}
