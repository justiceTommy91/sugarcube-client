import * as types from 'models/actionTypes'
import * as userApi from 'services/user'

export const requestUser = () => ({
    type: types.REQUEST_USER_SAGA,
})

// Notify that user has been fetched
export const receiveUser = (userData) => ({
    type: types.RECEIVE_USER,
    userData,
})

export const failedToReceiveUser = (error) => ({
    type: types.FAILED_RECEIVE_USER,
    error,
})

export const skipFetchUser = () => ({
    type: types.SKIP_FETCH_USER,
})

export const resolveKreativLiteGuestReturn = (sceneId) => ({
    type: types.RESOLVE_KREATIV_LITE_GUEST_RETURN,
    payload: { sceneId },
})

export const requestKreativLiteMergeRetry = () => ({
    type: types.REQUEST_KREATIV_LITE_MERGE_RETRY_SAGA,
})

const signingupUser = () => ({
    type: types.SIGNINGUP_USER,
})

const receiveUserSignup = (response) => ({
    type: types.RECEIVE_USER_SIGNUP,
    response,
})

const logginginUser = () => ({
    type: types.LOGGINGIN_USER,
})

const receiveUserLogin = (response) => ({
    type: types.RECEIVE_USER_LOGIN,
    response,
})

export const loginNeeded = (trackingInfo = {}) => ({
    type: types.LOGIN_NEEDED,
    trackingInfo,
})

export const signupUser = (userData) => (dispatch) => {
    dispatch(signingupUser())

    return userApi
        .signupUser(userData)
        .then(({ data }) => dispatch(receiveUserSignup(data)))
        .catch(({ response }) => dispatch(receiveUserSignup(response)))
}

export const loginUser = (userData) => (dispatch) => {
    dispatch(logginginUser())

    return userApi
        .loginUser(userData)
        .then(({ data }) => dispatch(receiveUserLogin(data)))
        .catch(({ response }) => dispatch(receiveUserLogin(response)))
}

export const logoutUser = () => ({
    type: types.LOGOUT_USER,
})

export const requestLoginPage = (isSignup, context) => ({
    type: types.REQUEST_LOGIN_PAGE,
    isSignup,
    context,
})
