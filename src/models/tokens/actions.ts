import { createAction } from '@reduxjs/toolkit'
import * as types from 'models/actionTypes'
import { IkeaTokensContainer } from '.'

export const requestIkeaTokens = createAction(types.REQUEST_IKEA_TOKENS)

export const receiveIkeaTokens = createAction(types.RECEIVE_IKEA_TOKENS, (tokens: IkeaTokensContainer) => ({
    payload: {
        tokens,
    },
}))
