/* eslint-disable i18next/no-literal-string */
import { ContextualCard, ReferrerContext } from 'models/referrer/types'

export interface HeaderContent {
    title: string
    subtitle?: string
    images?: string[]
}

export const getHeaderContent = (context: ContextualCard): HeaderContent => {
    if (!context) {
        return {
            title: 'Ways to start',
            images: undefined,
        }
    }

    switch (context.type) {
        case 'product': {
            const { productName = 'this product', productCategory = '' } = context
            return {
                title: `Get started below to try ${productName} in a room`,
                subtitle: productCategory ? `It looks like you were exploring ${productCategory}` : undefined,
                // work for GROW-362
                images: [],
            }
        }

        case 'category': {
            const { categoryName = 'this category' } = context
            return {
                title: 'Get started below to compare your options',
                subtitle: `It looks like you were exploring ${categoryName}`,
                // work for GROW-363
                images: [],
            }
        }

        case 'queryTerm': {
            return {
                title: 'Get started below to explore this in a room',
                subtitle: `It looks like you were searching for ${context.value}`,
                // work for GROW-367
                images: [],
            }
        }

        default:
            return {
                title: 'Ways to start',
                images: undefined,
            }
    }
}

export const formatReferrerContextForTracking = (context: ReferrerContext): string | null => {
    if (!context) {
        return null
    }

    switch (context.type) {
        case 'category':
            return `Category:${context.value}`
        case 'queryTerm':
            return `Query:${context.value}`
        case 'product':
            return `Product:${context.value}`
        default:
            return null
    }
}
