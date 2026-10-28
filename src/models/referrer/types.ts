export interface ReferrerState {
    referrerUrl: string | null
    queryTerm: string | null
    categoryId: string | null
    productId: string | null
}

export type ContextType = 'product' | 'category' | 'queryTerm'

export interface ProductContext {
    type: 'product'
    value: string
}

export interface CategoryContext {
    type: 'category'
    value: string
}

export interface QueryTermContext {
    type: 'queryTerm'
    value: string
}

export type ReferrerContext = ProductContext | CategoryContext | QueryTermContext | null

export type ContextualCard =
    | {
          type: 'product'
          value: string
          productName?: string
          productCategory?: string
      }
    | {
          type: 'category'
          value: string
          categoryName?: string
      }
    | {
          type: 'queryTerm'
          value: string
      }
    | {
          type: 'default'
          value?: string
      }
    | null

export type ContextualCategory = {
    isSubcategory: boolean
    roomType: string | null
    categoryId?: string
}
