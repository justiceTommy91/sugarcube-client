import * as types from 'models/actionTypes'
import { isValidAuthToken } from './utils'

export const initialState = {
    isLoggedIn: false,
    hasValidAuthToken: false,
    wid: -1,
    userType: 'anonymous',
    metricsId: '',
    email: null,
    firstName: null,
    lastName: null,
    isAdmin: false,
    canBeAdmin: false,
    signupLoginStatus: null,
    isNewUser: false,
    loginType: [],
    subCatalogs: null,
    canChangePassword: false,
    isUserDataLoaded: false,
    featureFlags: {},
    areDebugFeaturesEnabled: false,
}

const user = (state = initialState, action) => {
    switch (action.type) {
        case types.RECEIVE_IKEA_TOKENS: {
            const newHasValidAuthToken = action.payload.tokens.auth && isValidAuthToken(action.payload.tokens.auth)
            // If we're already logged in (have user data), don't set hasValidAuthToken to false
            // This prevents UI flicker when reauthenticating with only guest tokens
            if (!newHasValidAuthToken && state.isUserDataLoaded && state.hasValidAuthToken) {
                return state
            }
            // Only update state if the value actually changes to prevent unnecessary re-renders
            if (state.hasValidAuthToken === newHasValidAuthToken) {
                return state
            }
            return {
                ...state,
                hasValidAuthToken: newHasValidAuthToken,
            }
        }
        case types.RECEIVE_USER: {
            const isAdmin = action.userData.isStaff

            const featureFlags = {
                ...(action.userData.featureFlags ?? {}),
                debugMenu: !!action.userData.featureFlags?.debugMenu || isAdmin,
            }

            return {
                ...state,
                isLoggedIn: action.userData.isLoggedIn,
                hasValidAuthToken: true,
                isAdmin,
                canBeAdmin: isAdmin,
                wid: action.userData.wid || initialState.wid,
                userType: action.userData.userType || 'anonymous',
                metricsId: action.userData.metricsId || initialState.metricsId,
                email: action.userData.email || initialState.email,
                firstName: action.userData.firstName || initialState.firstName,
                lastName: action.userData.lastName || initialState.lastName,
                isNewUser: action.userData.isFirstTime || initialState.isNewUser,
                loginType: action.userData.loginType || initialState.loginType,
                subCatalogs: action.userData.subCatalogs || initialState.subCatalogs,
                canChangePassword: action.userData.loginType.includes('Email'),
                featureFlags,
                areDebugFeaturesEnabled: featureFlags.debugMenu,
                isUserDataLoaded: true,
            }
        }
        case types.SET_ADMIN:
            return {
                ...state,
                isAdmin: action.shouldBeAdmin,
            }
        case types.FAILED_RECEIVE_USER:
            return {
                ...state,
                isLoggedIn: false,
                hasValidAuthToken: false,
                error: action.error,
                isUserDataLoaded: true,
            }
        case types.SKIP_FETCH_USER:
            return {
                ...state,
                isUserDataLoaded: true,
            }
        case types.RECEIVE_USER_LOGIN:
        case types.RECEIVE_USER_SIGNUP:
            return {
                ...state,
                signupLoginStatus: action.response.status,
            }
        case types.TOGGLE_DEBUG_FEATURES:
            return {
                ...state,
                areDebugFeaturesEnabled: !state.areDebugFeaturesEnabled,
            }
        default:
            return state
    }
}

export default user
