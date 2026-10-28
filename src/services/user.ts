import type { AxiosResponse } from 'axios'
import type { IkeaTokensContainer } from 'models/tokens'
import fetch from 'services'
import { mapUserInfoDTO, type UserInfo, type UserInfoDTO } from './userInfo'

export { mapUserInfoDTO, type LoginType, type UserInfo, type UserInfoDTO } from './userInfo'

export const getUser = async (): Promise<AxiosResponse<UserInfo>> => {
    const response = await fetch<UserInfoDTO>(`/users/account/`)
    return {
        ...response,
        data: mapUserInfoDTO(response.data),
    }
}

export type UserCredentials = {
    email: string
    password: string
}

export const signupUser = (userData: UserCredentials) =>
    fetch(`/auth/signup/email`, {
        method: 'POST',
        data: userData,
    })

export const loginUser = (userData: UserCredentials) =>
    fetch(`/auth/signin/email/`, {
        method: 'POST',
        data: userData,
    })

export const removeNewUser = () => () =>
    fetch(`/users/`, {
        method: 'PUT',
        data: { isFirstTime: false },
    })

export const getIkeaTokens = async (): Promise<IkeaTokensContainer> =>
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
            reject()
        }
    })
