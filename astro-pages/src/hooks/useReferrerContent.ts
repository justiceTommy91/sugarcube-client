import { useState, useEffect } from 'react'
import { useReferrer } from '@astro-hooks/useReferrer'
import { isClient } from 'utils/environment'
import { determineReferrerContext } from '@models/referrer/utils'
import { formatReferrerContextForTracking } from '@components/dashboard/contextualCard/utils'
import { getCategoryProductListPage, getSearchResultPage } from 'services/searchCompletions'

export interface ReferrerContent {
    images: string[] | null // null = loading; empty = use fallback
    subject: string // defaults to 'storage' until resolved
    loading: boolean
    referrerContext: string | null
    referrerContextLoading: boolean
}

const DEFAULT_SUBJECT = 'storage'

export const useReferrerContent = (): ReferrerContent => {
    const [images, setImages] = useState<string[] | null>(null)
    const [subject, setSubject] = useState(DEFAULT_SUBJECT)
    const [loading, setLoading] = useState(isClient)

    const { queryTerm, categoryId, isLoading: referrerContextLoading } = useReferrer()
    const context = determineReferrerContext(null, categoryId, queryTerm, null)

    useEffect(() => {
        if (!context || (context.type !== 'category' && context.type !== 'queryTerm')) {
            setImages(null)
            setLoading(false)
            return
        }

        setLoading(true)

        if (context.type === 'category') {
            getCategoryProductListPage(context.value)
                .then((response) => {
                    const data = response.data
                    const categoryName = data.productListPage.category.name
                    if (categoryName) setSubject(categoryName)

                    const productImages = data.productListPage.productWindow
                        ?.filter((item) => item?.mainImageUrl)
                        .slice(0, 2)
                        .map((item) => item.mainImageUrl)

                    setImages(productImages?.length ? productImages : null)
                })
                .catch(() => setImages(null))
                .finally(() => setLoading(false))
        }

        if (context.type === 'queryTerm') {
            getSearchResultPage(context.value)
                .then((response) => {
                    const items = response.data.searchResultPage.products?.main?.items?.filter(
                        (item) => item.product?.mainImageUrl,
                    ).slice(0, 2)

                    if (items?.length) {
                        setSubject(context.value)
                        setImages(items.map((item) => item.product.mainImageUrl))
                    } else {
                        setImages(null)
                    }
                })
                .catch(() => setImages(null))
                .finally(() => setLoading(false))
        }
    }, [context?.type, context?.value])

    return { images, subject, loading, referrerContext: formatReferrerContextForTracking(context), referrerContextLoading }
}
