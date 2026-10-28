import { getApiPrefix } from '@lib/location-selectors'
import { getAuthToken, setAuthToken } from 'services/authToken'

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

const fetchWrapper = async <Result>(
    url: string,
    config: RequestInit = {},
    settings?: FetchSettings,
): Promise<Result> => {
    const baseUrl = settings?.baseUrl ?? getApiPrefix(settings?.shardApi)
    const completeUrl = `${baseUrl}${url}`

    const headers: Record<string, string> = {
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

    const response = await fetch(completeUrl, {
        credentials: 'include',
        ...config,
        headers: {
            ...headers,
            ...config.headers,
        },
    })

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

export default fetchWrapper
