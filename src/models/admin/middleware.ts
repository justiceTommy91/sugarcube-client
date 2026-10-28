import type { Middleware } from 'redux'

import type { RootState } from 'store'

import * as types from 'models/actionTypes'

const adminMiddleware: Middleware<null, RootState> = () => (next) => (action) => {
    switch (action.type) {
        case types.DEBUG_CONSOLE_LOG: {
            return next({
                ...action,
                payload: {
                    ...action.payload,
                    timestamp: Date.now(),
                },
            })
        }
        default:
            break
    }
    return next(action)
}

export default adminMiddleware
