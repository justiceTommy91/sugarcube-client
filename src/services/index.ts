import axios, { AxiosPromise, AxiosRequestConfig, AxiosRequestHeaders } from 'axios'
import axiosRetry from 'axios-retry'
import { getApiPrefix, usesDevAuth } from 'models/location/selectors'
import { error as trackError } from 'utils/tracker'
import * as Sentry from '@sentry/react'
import { getAuthToken, setAuthToken } from 'services/authToken'
import { HANDLE_MATERIALIZED_USER_SAGA } from 'models/actionTypes'
import { mapUserInfoDTO, type UserInfoDTO } from 'services/userInfo'

// axios defaults to `X-XSRF-TOKEN` for the xsrf token value: https://axios-http.com/docs/req_config
// We want this value to be `X-CSRFTOKEN` instead of the default value.
axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN'
axios.defaults.xsrfCookieName = 'csrftoken'

// Axios-retry package: Number of retries is 3 by default.
// Add exponential back-off retry delay between requests.
// Add mixpanel tracking for retries.
axiosRetry(axios, {
    retryDelay: axiosRetry.exponentialDelay,
    onRetry: (retryCount, error, requestConfig) => {
        const { url } = requestConfig
        const trackingInfo = {
            RetryCount: retryCount,
            ErrorMessage: error.message ?? error.toString(),
            RequestUrl: url,
        }
        trackError('ApiRetry', trackingInfo)
        Sentry.captureException(error)
    },
})

// Lazily-injected store reference, set by injectStore() in store.ts after store creation.
// Using injection avoids a circular dependency: services/index ← store ← models ← services/index.
type StoreShape = {
    getState: () => { user?: { wid?: number } }
    dispatch: (action: unknown) => void
}
let injectedStore: StoreShape | null = null

export const injectStore = (storeRef: StoreShape) => {
    injectedStore = storeRef
}

// Backend contract: a request that changes a Deferred User into a Materialized
// User returns X-Geomagical-Materialized-User with the Materialized User DTO.
// Successful backend requests without that explicit header do not imply user
// materialization and must not re-fetch /users/account/ as a fallback.
//
// injectStore is a one-off pattern used only here. It exists because
// importing requestUser from models/user/actions creates a circular dep:
// services/index → models/user/actions → services/user → services/index.
// Importing the action TYPE constant from models/actionTypes is safe — that
// module has no service imports.
const MATERIALIZED_USER_HEADER = 'x-geomagical-materialized-user'

const reportInvalidMaterializedUserHeader = (
    response: { config?: AxiosRequestConfig },
    errorCategory: 'MalformedJson' | 'InvalidWid',
    headerLength: number,
    cause?: unknown,
) => {
    const requestUrl = response.config?.url
    const requestMethod = response.config?.method?.toUpperCase()
    const trackingInfo = {
        RequestUrl: requestUrl,
        RequestMethod: requestMethod,
        ErrorCategory: errorCategory,
        HeaderLength: headerLength,
    }

    trackError('InvalidMaterializedUserHeader', trackingInfo)
    Sentry.captureException(new Error('Invalid Materialized User header', { cause }), {
        contexts: {
            materializedUserHeader: {
                requestUrl,
                requestMethod,
                errorCategory,
                headerLength,
            },
        },
    })
}

axios.interceptors.response.use((response) => {
    const hasMaterializedUserHeader = Object.prototype.hasOwnProperty.call(
        response.headers ?? {},
        MATERIALIZED_USER_HEADER,
    )
    const materializedUserHeader = response.headers?.[MATERIALIZED_USER_HEADER]
    if (hasMaterializedUserHeader && injectedStore) {
        const wid = injectedStore.getState().user?.wid
        if (typeof wid === 'number' && wid < 0) {
            if (typeof materializedUserHeader !== 'string') {
                reportInvalidMaterializedUserHeader(response, 'MalformedJson', 0)
                return response
            }
            let materializedUserDTO: unknown
            try {
                materializedUserDTO = JSON.parse(materializedUserHeader)
            } catch (error) {
                reportInvalidMaterializedUserHeader(response, 'MalformedJson', materializedUserHeader.length, error)
                return response
            }
            const parsedUserDTO = materializedUserDTO as Partial<UserInfoDTO> | null
            if (parsedUserDTO && typeof parsedUserDTO.wid === 'number' && parsedUserDTO.wid > 0) {
                injectedStore.dispatch({
                    type: HANDLE_MATERIALIZED_USER_SAGA,
                    payload: { user: mapUserInfoDTO(parsedUserDTO as UserInfoDTO) },
                })
                return response
            }
            reportInvalidMaterializedUserHeader(response, 'InvalidWid', materializedUserHeader.length)
            return response
        }
    }

    return response
})

export const isAuthenticated = () => Boolean(getAuthToken())

export const authenticate = (token: string, type: 'auth' | 'guest') => {
    setAuthToken(token, type)
}

type FetchSettings = {
    baseUrl?: string
    allowGuest?: boolean
    shardApi?: boolean
    ignoreToken?: boolean
}

export const fetchWrapper = <Result>(
    url: string,
    { headers: headerOverrides, ...config }: Partial<AxiosRequestConfig> = {},
    settings?: FetchSettings,
): AxiosPromise<Result> => {
    const baseUrl = settings?.baseUrl ?? getApiPrefix(settings?.shardApi)
    const completeUrl = `${baseUrl}${url}`

    const headers: AxiosRequestHeaders = {
        Accept: 'application/json',
        'Content-type': 'application/json',
    }
    const authToken = getAuthToken()
    if (authToken != null && !settings?.ignoreToken) {
        headers.Authorization = `Bearer ${authToken.token}`
    }
    if (authToken?.type === 'guest' && !settings?.allowGuest) {
        delete headers.Authorization
    }

    return axios({
        withCredentials: usesDevAuth(),
        url: completeUrl,
        headers: {
            ...headers,
            ...headerOverrides,
        },
        ...config,
    })
}

export default fetchWrapper
