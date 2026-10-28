import type { APIProduct } from 'Renderer/geomviewer'

export type Product = APIProduct
export type ProductId = string
export type ItemId = string
export type Catalog = Record<ProductId, Product>
export type ViewId = string

export type ProductInfo = {
  uniqueId: ItemId
}
