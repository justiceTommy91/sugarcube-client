import { useQuery, useQueryClient } from '@tanstack/react-query'
import getReferrerInfo from '@gatsby/utils/getReferrerInfo'
import { REFERRER_STORAGE_KEY } from '@models/sessionStorage/constants'
import { PARAM_REF_CATEGORY_ID, PARAM_REF_QUERY } from '@models/location/constants'
import { isClient } from 'utils/environment'
import type { ReferrerState } from 'models/referrer/types'

const REFERRER_QUERY_KEY = ['referrer']

const initialState: ReferrerState = {
    referrerUrl: null,
    queryTerm: null,
    categoryId: null,
    productId: null,
}

// Mirrors the merge logic from the Redux setReferrerUrl thunk:
// use document.referrer if it has useful context, otherwise fall back to sessionStorage.
function resolveReferrer(): ReferrerState {
    if (!isClient) return initialState
    const newContext = getReferrerInfo(document.referrer)
    const hasUsefulContext = newContext.queryTerm || newContext.categoryId || newContext.productId

    let state: ReferrerState
    if (!hasUsefulContext) {
        const stored = sessionStorage.getItem(REFERRER_STORAGE_KEY)
        state = stored ? { referrerUrl: stored, ...getReferrerInfo(stored) } : initialState
    } else {
        sessionStorage.setItem(REFERRER_STORAGE_KEY, document.referrer)
        state = { referrerUrl: document.referrer, ...newContext }
    }

    const params = new URLSearchParams(window.location.search)
    const refCatId = params.get(PARAM_REF_CATEGORY_ID)
    const refQuery = params.get(PARAM_REF_QUERY)
    if (refCatId || refQuery) {
        return {
            ...state,
            categoryId: refCatId ?? state.categoryId,
            queryTerm: refQuery ?? state.queryTerm,
        }
    }

    return state
}

export const useReferrer = (): ReferrerState & { isLoading: boolean } => {
    const { data, isLoading } = useQuery<ReferrerState>({
        queryKey: REFERRER_QUERY_KEY,
        queryFn: resolveReferrer,
        staleTime: Infinity,
    })
    return { ...(data ?? initialState), isLoading }
}

// Returns a query string fragment (e.g. "&ref_cat_id=10451") for any ref override params
// present in the current URL, so they can be forwarded to the viewer on navigation.
export const getRefParamFragment = (): string => {
    const params = new URLSearchParams(window.location.search)
    const forwarded = new URLSearchParams()
    const refCatId = params.get(PARAM_REF_CATEGORY_ID)
    const refQuery = params.get(PARAM_REF_QUERY)
    if (refCatId) forwarded.set(PARAM_REF_CATEGORY_ID, refCatId)
    if (refQuery) forwarded.set(PARAM_REF_QUERY, refQuery)
    const str = forwarded.toString()
    return str ? `&${str}` : ''
}

// Used by FlagsManager to manually set a referrer URL for testing.
export const useSetReferrer = () => {
    const queryClient = useQueryClient()
    return (referrerUrl: string) => {
        sessionStorage.removeItem(REFERRER_STORAGE_KEY)
        const context = getReferrerInfo(referrerUrl)
        const hasUsefulContext = context.queryTerm || context.categoryId || context.productId
        if (hasUsefulContext) {
            sessionStorage.setItem(REFERRER_STORAGE_KEY, referrerUrl)
        }
        const newState: ReferrerState = {
            referrerUrl: hasUsefulContext ? referrerUrl : null,
            ...context,
        }
        queryClient.setQueryData(REFERRER_QUERY_KEY, newState)
    }
}
