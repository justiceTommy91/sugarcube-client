import type { IkeaToken } from 'models/tokens'

export const isValidAuthToken = (authToken: IkeaToken): boolean =>
    authToken.expirationTime < Date.now()
