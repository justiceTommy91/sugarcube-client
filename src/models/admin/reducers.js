import { combineReducers } from 'redux'
import * as types from 'models/actionTypes'
import { defaultViewerDebugSettings } from '../../Renderer/geomviewer/geom_viewer_settings'

const initialState = {
    gtURLs: [],
    gtZipIsLoading: false,
    debugSettings: defaultViewerDebugSettings,
    debugConsoleMessages: [],
}

const gtURLs = (state = initialState.gtURLs, action) => {
    switch (action.type) {
        case types.RECEIVE_GT:
            return action.gtURLs
        default:
            return state
    }
}

const gtZipIsLoading = (state = initialState.gtZipIsLoading, action) => {
    switch (action.type) {
        case types.REQUEST_DOWNLOAD:
            return true
        case types.RECEIVE_DOWNLOAD:
            return false
        default:
            return state
    }
}

const debugSettings = (state = initialState.debugSettings, action) => {
    switch (action.type) {
        case types.UPDATE_DEBUG_SETTINGS:
            return {
                ...state,
                ...action.debugSettings,
            }
        default:
            return state
    }
}

const debugConsoleMessages = (state = initialState.debugConsoleMessages, action) => {
    switch (action.type) {
        case types.DEBUG_CONSOLE_LOG:
            return [
                {
                    ...action.payload,
                    id: state.length,
                },
                ...state,
            ]
        default:
            return state
    }
}

export default combineReducers({
    gtURLs,
    gtZipIsLoading,
    debugSettings,
    debugConsoleMessages,
})
