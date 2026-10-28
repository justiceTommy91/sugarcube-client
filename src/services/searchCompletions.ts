import axios, { AxiosRequestConfig } from 'axios'
import { getRegion } from 'models/location/selectors'

interface Completion {
    completion: {
        text: string
    }
}
interface Category {
    category: {
        name: string
        key: string
    }
}

type SearchCompletionResponseItem = Completion | Category

interface Response {
    searchBox: {
        universal: SearchCompletionResponseItem[]
    }
}

const SIK_SEARCH_BASE_URL = 'https://sik.search.blue.cdtapps.com'
export const getSearchCompletions = (searchTerm: string) => {
    const region = getRegion()
    const url = `${SIK_SEARCH_BASE_URL}/${region}/search-box?range=GEOMAGICAL&q=${searchTerm}`
    const config: AxiosRequestConfig = {
        headers: {
            Accept: `application/json`,
            'Content-type': `application/json`,
        },
        method: `get`,
        url,
    }
    return axios.request<Response>(config)
}

interface SearchResultResponse {
    searchResultPage: {
        products: {
            main: {
                items: {
                    product: {
                        mainImageUrl: string
                        categoryPath?: {
                            name: string
                            key: string
                        }[]
                    }
                }[]
            }
        }
    }
}

interface CategoryProductsResultResponse {
    productListPage: {
        category: {
            name: string
            key: string
            url: string
            imageUrl: string
        }
        productWindow: {
            name: string
            typeName: string
            itemMeasureReferenceText: string
            mainImageUrl: string
            pipUrl: string
            filterClass: string
        }[]
    }
}

export const getSearchResultPage = (queryTerm: string) => {
    const region = getRegion()
    const url = `${SIK_SEARCH_BASE_URL}/${region}/search-result-page?&q=${queryTerm}&range=GEOMAGICAL&c=geo&experimental=true&allow-gpr-deduplication=false`
    const config: AxiosRequestConfig = {
        headers: {
            Accept: `application/json`,
            'Content-type': `application/json`,
        },
        method: `get`,
        url,
    }
    return axios.request<SearchResultResponse>(config)
}

export const getCategoryProductListPage = (categoryKey: string) => {
    const region = getRegion()
    const url = `${SIK_SEARCH_BASE_URL}/${region}/product-list-page?category=${categoryKey}&range=GEOMAGICAL&c=geo&experimental=true&allow-gpr-deduplication=false`
    const config: AxiosRequestConfig = {
        headers: {
            Accept: `application/json`,
            'Content-type': `application/json`,
        },
        method: `get`,
        url,
    }
    return axios.request<CategoryProductsResultResponse>(config)
}

export default getSearchCompletions
