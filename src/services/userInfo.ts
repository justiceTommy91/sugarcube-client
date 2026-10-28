const userTypeFromTokenType = (tokenType: TokenType): UserType => {
    switch (tokenType) {
        case 'GUEST': {
            return 'guest'
        }
        case 'INDIVIDUAL': {
            return 'individual'
        }
        case 'BUSINESS': {
            return 'business'
        }
        default: {
            return 'anonymous'
        }
    }
}

type TokenType = 'UNKNOWN' | 'GUEST' | 'INDIVIDUAL' | 'BUSINESS'

export type UserInfoDTO = {
    wid: number
    metricsId: string
    email: string
    isStaff: boolean
    isLoggedIn: boolean
    loginType: LoginType[]
    tokenType: TokenType
    canUseBeautifier?: boolean
    beautifierUses?: number
}

export type LoginType = 'IKEA' | 'Email'

export type UserInfo = Omit<UserInfoDTO, 'tokenType'> & {
    userType: UserType
    canUseBeautifier: boolean
    beautifierUses: number
}

export const mapUserInfoDTO = (data: UserInfoDTO): UserInfo => ({
    wid: data.wid,
    metricsId: data.metricsId,
    email: data.email,
    isStaff: data.isStaff,
    isLoggedIn: data.tokenType !== 'GUEST' && data.isLoggedIn,
    loginType: data.loginType,
    userType: userTypeFromTokenType(data.tokenType),
    canUseBeautifier: data.canUseBeautifier ?? false,
    beautifierUses: data.beautifierUses ?? 0,
})
