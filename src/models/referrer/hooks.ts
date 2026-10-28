import { useEffect, useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from 'hooks'
import { ContextualCard } from 'models/referrer/types'
import { getSearchResultPage, getCategoryProductListPage } from 'services/searchCompletions'
import { requestPlaceProduct } from 'models/furniture/actions'
import { ProductData } from 'models/furniture'
import { getRoomTypes, getRoomTypeByCategoryId } from 'models/roomTypes/selectors'
import { setQueryTermCategoryId } from './slice'

export interface HeaderContent {
    title: string
    subtitle?: string
    images?: string[]
    loading: boolean
}

export const useHeaderContentFromContextualCard = (context: ContextualCard): HeaderContent => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation('dashboard')
    const [images, setImages] = useState<string[] | undefined>(undefined)
    const [productName, setProductName] = useState<string | undefined>(undefined)
    const [productCategory, setProductCategory] = useState<string | undefined>(undefined)
    const [loading, setLoading] = useState(false)

    const furnitureById = useAppSelector((state) => state.furniture.byId)
    const roomTypes = useAppSelector(getRoomTypes)

    // Check if category exists in room types (only relevant for category context)
    const categoryId = context?.type === 'category' ? context.value : ''
    const matchingRoomType = useAppSelector((state) => getRoomTypeByCategoryId(state, categoryId))

    const hasDispatchedPlaceProduct = useRef(false)

    // Find the product by localItemNumber, memoized to prevent unnecessary re-renders
    const existingProduct = useMemo(() => {
        if (context?.type !== 'product') return undefined
        return Object.values(furnitureById).find((item) => (item as ProductData).localItemNumber === context.value) as
            | ProductData
            | undefined
    }, [furnitureById, context?.type, context?.value])

    useEffect(() => {
        hasDispatchedPlaceProduct.current = false
    }, [context?.type, context?.value])

    useEffect(() => {
        setLoading(true)
        const fetchImages = async () => {
            if (context?.type === 'product') {
                if (existingProduct) {
                    setProductName(existingProduct.name)
                    setProductCategory(existingProduct.categories?.[0])
                    setImages([existingProduct.thumbUrl])
                    if (!hasDispatchedPlaceProduct.current) {
                        hasDispatchedPlaceProduct.current = true
                        dispatch(requestPlaceProduct(existingProduct.localItemNumber))
                    }
                    setLoading(false)
                } else {
                    setImages(undefined)
                    setProductName(undefined)
                    setProductCategory(undefined)
                    setLoading(false)
                }
            }

            if (context?.type === 'category') {
                // Wait for room types to load before validating the category
                if (roomTypes.length === 0) {
                    setLoading(true)
                    return
                }

                // Room types loaded - check if category exists
                if (!matchingRoomType) {
                    // Category not in room types - don't show contextual card
                    setImages(undefined)
                    setProductCategory(undefined)
                    setLoading(false)
                    return
                }

                // Proceed with existing category logic
                getCategoryProductListPage(context.value)
                    .then((response) => {
                        const data = response.data
                        const category = data.productListPage.category.name
                        if (category) {
                            setProductCategory(category)
                        } else {
                            setProductCategory(undefined)
                        }

                        const productsWithImages = data.productListPage.productWindow
                            ?.filter((item) => item?.mainImageUrl)
                            .slice(0, 2)

                        if (productsWithImages?.length) {
                            const imageUrls = productsWithImages.map((item) => item.mainImageUrl)
                            setImages(imageUrls)
                        } else {
                            setImages(undefined)
                        }
                    })
                    .catch(() => {
                        setImages(undefined)
                    })
                    .finally(() => {
                        setLoading(false)
                    })
            }

            if (context?.type === 'queryTerm') {
                getSearchResultPage(context.value)
                    .then((response) => {
                        const product = response.data.searchResultPage.products?.main?.items?.filter(
                            (item) => item.product?.mainImageUrl,
                        )[0].product

                        if (product?.categoryPath?.[0]) {
                            // Updating context referrer category ID so we can update scene ROOMTYPE
                            dispatch(setQueryTermCategoryId(product?.categoryPath?.[0]?.key))
                        }

                        if (product.mainImageUrl) {
                            setProductName(context.value)
                            setImages([product.mainImageUrl])
                        } else {
                            setImages(undefined)
                        }
                    })
                    .catch(() => {
                        setImages(undefined)
                    })
                    .finally(() => {
                        setLoading(false)
                    })
            }
        }

        fetchImages()

        // Cleanup function to prevent race conditions
        return () => setLoading(false)
    }, [context?.type, context?.value, existingProduct, roomTypes, matchingRoomType])

    return useMemo(() => {
        const STATIC_HEADER = {
            title: t('dashboard.contextual.ways to start'),
            images: undefined,
            loading: false,
        }

        if (!context) {
            return STATIC_HEADER
        }

        switch (context.type) {
            case 'product': {
                if (!images && !loading) {
                    return STATIC_HEADER
                }

                return {
                    title:
                        loading || !productName
                            ? t('dashboard.contextual.get started below to try it in a room')
                            : t('dashboard.contextual.get started below to try product in a room', {
                                  productName,
                              }),
                    subtitle:
                        loading || !productCategory
                            ? t('dashboard.contextual.it looks like you were exploring products')
                            : t('dashboard.contextual.it looks like you were exploring', {
                                  productCategory: productCategory?.toLocaleLowerCase(),
                              }),
                    images,
                    loading,
                }
            }

            case 'category': {
                if (!images || !productCategory) {
                    return STATIC_HEADER
                }
                return {
                    title: t('dashboard.contextual.get started below to compare your options'),
                    subtitle: t('dashboard.contextual.it looks like you were exploring', {
                        productCategory: productCategory?.toLocaleLowerCase(),
                    }),
                    images,
                    loading,
                }
            }

            case 'queryTerm': {
                if (!images) {
                    return STATIC_HEADER
                }
                return {
                    title: t('dashboard.contextual.get started below to explore this in a room'),
                    subtitle: t('dashboard.contextual.it looks like you were searching', {
                        query: context.value,
                    }),
                    images,
                    loading,
                }
            }

            default:
                return STATIC_HEADER
        }
    }, [context, images, productName, loading, productCategory])
}
