import { createSelector } from 'reselect'

const getUser = (state) => state.user

export const getIsLoggedIn = (state) => state.user.isLoggedIn
export const getHasValidAuthToken = (state) => state.user.hasValidAuthToken
export const getUserId = (state) => state.user.wid
export const getUserEmail = (state) => state.user.email
export const getIsNewUser = (state) => state.user.isNewUser
export const getIsAdmin = (state) => state.user.isAdmin
export const getCanBeAdmin = (state) => state.user.canBeAdmin
export const getFirstName = (state) => state.user.firstName
export const getLastName = (state) => state.user.LastName
export const getSubCatalogs = (state) => state.user.subCatalogs
export const getIsUserDataLoaded = (state) => state.user.isUserDataLoaded

export const getName = createSelector([getFirstName, getLastName], (fn, ln) => (fn && ln ? `${fn} ${ln}` : ''))

export const getCurrentUser = createSelector([getUser, getName], (user, name) => ({
    ...user,
    name,
}))

export const getCanEnableDebugFeatures = createSelector([getUser], (user) => !!user.featureFlags.debugMenu)

export const getAreDebugFeaturesEnabled = createSelector([getUser], (user) => user.areDebugFeaturesEnabled)
