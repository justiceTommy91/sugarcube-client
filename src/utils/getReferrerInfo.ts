/**
 * Extracts the `q` query parameter, category ID, and product ID from a referrer URL stored in sessionStorage.
 *
 * @param referrerUrl The referrer URL.
 * @returns An object containing `queryTerm`, `categoryId`, and `productId`, or null values if not found.
 */
const getReferrerInfo = (referrerUrl: string) => {
    if (!referrerUrl) {
        return { queryTerm: null, categoryId: null, productId: null }
    }
    const url = new URL(referrerUrl)

    // Handle only IKEA domains
    if (!url.hostname.includes('ikea')) {
        return { queryTerm: null, categoryId: null, productId: null }
    }

    // 1. Extract `q` query param
    const queryTerm = url.searchParams.get('q')
    const queryTermDecoded = queryTerm ? decodeURIComponent(queryTerm) : null

    // 2. Extract category ID from `/cat/xyz-<id>/` path
    const categoryMatch = url.pathname.match(/\/cat\/[^/]*-([^/]+)\/?/)
    const categoryId = categoryMatch ? categoryMatch[1] : null

    // 3. Extract product ID from URL params
    const productId = url.searchParams.get('productId') || null

    return { queryTerm: queryTermDecoded, categoryId, productId }
}

export default getReferrerInfo
