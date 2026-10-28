import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { formatReferrerContextForTracking } from 'components/dashboard/contextualCard/utils'
import { REFERRER_STORAGE_KEY } from 'models/sessionStorage/constants'
import getReferrerInfo from 'utils/getReferrerInfo'
import { setTrackingContext } from 'utils/tracker'
import { determineReferrerContext } from './utils'

interface ReferrerState {
    referrerUrl: string | null
    queryTerm: string | null
    categoryId: string | null
    productId: string | null
    queryTermCategoryId: string | null
}

export const initialState: ReferrerState = {
    referrerUrl: null,
    queryTerm: null,
    categoryId: null,
    productId: null,
    queryTermCategoryId: null,
}

// Async thunk for loading from storage
export const loadReferrerFromStorage = createAsyncThunk('referrer/loadReferrerFromStorage', async () => {
    const storedReferrer = window?.sessionStorage.getItem(REFERRER_STORAGE_KEY)
    if (storedReferrer) {
        const referrerContext = getReferrerInfo(storedReferrer)

        const getContext = determineReferrerContext(
            referrerContext.productId,
            referrerContext.categoryId,
            referrerContext.queryTerm,
            null,
        )
        setTrackingContext(formatReferrerContextForTracking(getContext) || '')
        return { referrerUrl: storedReferrer, ...referrerContext, productId: null }
    }
    return { referrerUrl: null, queryTerm: null, categoryId: null, productId: null }
})

// Async thunk for setting referrer with storage side effect
export const setReferrerUrl = createAsyncThunk('referrer/setReferrerUrl', async (referrerUrl: string, { getState }) => {
    const currentState = getState() as { referrer: ReferrerState }
    const existingContext = currentState.referrer

    const newContext = getReferrerInfo(referrerUrl)

    const hasUsefulContext = newContext.queryTerm || newContext.categoryId || newContext.productId

    // If new referrer has no useful context, try to load from storage instead
    if (!hasUsefulContext) {
        const storedReferrer = window?.sessionStorage.getItem(REFERRER_STORAGE_KEY)
        if (storedReferrer) {
            const storedContext = getReferrerInfo(storedReferrer)

            const getContext = determineReferrerContext(
                storedContext.productId,
                storedContext.categoryId,
                storedContext.queryTerm,
                null,
            )
            setTrackingContext(formatReferrerContextForTracking(getContext) || '')

            return {
                referrerUrl: storedReferrer,
                queryTerm: storedContext.queryTerm,
                categoryId: storedContext.categoryId,
                productId: storedContext.productId,
            }
        }
        // If no stored referrer either, return empty state
        return { referrerUrl: null, queryTerm: null, categoryId: null, productId: null }
    }

    // Side effects here (storage) - only store if we're actually using this referrer
    if (referrerUrl) {
        sessionStorage.setItem(REFERRER_STORAGE_KEY, referrerUrl)
    }

    const getContext = determineReferrerContext(newContext.productId, newContext.categoryId, newContext.queryTerm, null)
    setTrackingContext(formatReferrerContextForTracking(getContext) || '')

    // Merge strategy: use new values when available, keep existing ones otherwise
    return {
        referrerUrl, // Always update to latest URL
        queryTerm: newContext.queryTerm || existingContext.queryTerm,
        categoryId: newContext.categoryId || existingContext.categoryId,
        productId: existingContext.productId,
    }
})

export const clearReferrer = createAsyncThunk('referrer/clearReferrer', async () => {
    window?.sessionStorage.removeItem(REFERRER_STORAGE_KEY)
    return { referrerUrl: null, queryTerm: null, categoryId: null, productId: null }
})

export const referrerSlice = createSlice({
    name: 'referrer',
    initialState,
    reducers: {
        setQueryTermCategoryId: (state, action) => {
            state.queryTermCategoryId = action.payload
        },
        setProductId: (state, action) => {
            state.productId = action.payload
        },
        clearQueryTerm: (state) => {
            state.queryTerm = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(setReferrerUrl.fulfilled, (state, action) => {
                const { referrerUrl, queryTerm, categoryId, productId } = action.payload
                state.referrerUrl = referrerUrl
                state.queryTerm = queryTerm
                state.categoryId = categoryId
                state.productId = productId
            })
            .addCase(loadReferrerFromStorage.fulfilled, (state, action) => {
                const { referrerUrl, queryTerm, categoryId, productId } = action.payload
                state.referrerUrl = referrerUrl
                state.queryTerm = queryTerm
                state.categoryId = categoryId
                state.productId = productId
            })
            .addCase(clearReferrer.fulfilled, (state, action) => {
                const { referrerUrl, queryTerm, categoryId, productId } = action.payload
                state.referrerUrl = referrerUrl
                state.queryTerm = queryTerm
                state.categoryId = categoryId
                state.productId = productId
            })
    },
})

export default referrerSlice.reducer

export const { setQueryTermCategoryId, setProductId, clearQueryTerm } = referrerSlice.actions
