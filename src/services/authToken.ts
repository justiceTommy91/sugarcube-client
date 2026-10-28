export type AuthTokenType = 'auth' | 'guest'

export type AuthToken = {
    type: AuthTokenType
    token: string
}

let authToken: AuthToken | null = null

export const getAuthToken = (): AuthToken | null => authToken

export const setAuthToken = (token: string, type: AuthTokenType): void => {
    authToken = { type, token }
}

export const clearAuthToken = (): void => {
    authToken = null
}
