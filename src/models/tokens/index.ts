export type IkeaToken = {
    expirationTime: number
    value: string
}

export type IkeaTokensContainer = {
    auth?: IkeaToken
    guest?: IkeaToken
}
