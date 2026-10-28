import { getApiPrefix } from '@lib/location-selectors'
import fetchWrapper from './index'

export type IkeaToken = {
    expirationTime: number
    value: string
}

export type IkeaTokensContainer = {
    auth?: IkeaToken
    guest?: IkeaToken
}

// expirationTime is in seconds, Date.now() is in ms
export const isValidAuthToken = (token: IkeaToken): boolean => token.expirationTime * 1000 > Date.now()

export const getIkeaTokens = (): Promise<IkeaTokensContainer> =>
    new Promise((resolve, reject) => {
        if (window.ikea?.authentication) {
            window.ikea.authentication.getTokens((error, tokens) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(tokens)
                }
            })
        } else {
            reject(new Error('window.ikea.authentication not available'))
        }
    })

type TokenType = 'UNKNOWN' | 'GUEST' | 'INDIVIDUAL' | 'BUSINESS'
type LoginType = 'IKEA' | 'Email'
type UserType = 'guest' | 'individual' | 'business' | 'anonymous'

type UserInfoDTO = {
    wid: number
    metricsId: string
    email: string
    isStaff: boolean
    isLoggedIn: boolean
    loginType: LoginType[]
    tokenType: TokenType
}

export type UserInfo = {
    wid: number
    metricsId: string
    email: string
    isStaff: boolean
    isLoggedIn: boolean
    loginType: LoginType[]
    userType: UserType
}

const userTypeFromTokenType = (tokenType: TokenType): UserType => {
    switch (tokenType) {
        case 'GUEST':
            return 'guest'
        case 'INDIVIDUAL':
            return 'individual'
        case 'BUSINESS':
            return 'business'
        default:
            return 'anonymous'
    }
}

export const getUser = async (): Promise<UserInfo> => {
    const data = await fetchWrapper<UserInfoDTO>('/users/account/')
    const userType = userTypeFromTokenType(data.tokenType)
    return {
        wid: data.wid,
        metricsId: data.metricsId,
        email: data.email,
        isStaff: data.isStaff,
        isLoggedIn: userType !== 'guest' && data.isLoggedIn,
        loginType: data.loginType,
        userType,
    }
}

export type UserCredentials = {
    email: string
    password: string
}

export const loginUser = (credentials: UserCredentials): Promise<unknown> =>
    fetchWrapper(
        '/auth/signin/email/',
        {
            method: 'POST',
            body: JSON.stringify(credentials),
        },
        { ignoreToken: true },
    )

// Calls the logout endpoint best-effort with redirect: 'manual' so the server's
// redirect response is ignored — the caller controls where to navigate afterward.
export const logoutUser = async (): Promise<void> => {
    try {
        await fetch(`${getApiPrefix()}/auth/logout`, {
            credentials: 'include',
            redirect: 'manual',
        })
    } catch {
        // best-effort — proceed to login regardless
    }
}
