import * as types from 'models/actionTypes'

const initialState = {
    quickPreviewIsOpen: false,
    isCurrentDragValid: true,
    isMagicWindowLoading: false,
    initialLoading: false,
    wallDataDimensions: {
        width: 0,
        height: 0,
    },
    settings: {
        showOcclusions: true,
        showShadows: true,
        magicEraserMode: false,
        wallCollisions: true,
    },
    sceneLoaded: {
        hasLoaded: false,
        errorType: null,
    },
    compositionLoaded: {
        hasLoaded: false,
        errorType: null,
    },
    erasedItemsCount: 0,
}

const resetWallDataDimensions = {
    width: 0,
    height: 0,
}

const preview = (state = initialState, action) => {
    switch (action.type) {
        case types.QUICK_PREVIEW_CLOSE:
            return {
                ...state,
                quickPreviewIsOpen: false,
            }
        case types.DRAG_VALIDITY_CHANGE:
            return {
                ...state,
                isCurrentDragValid: action.isValid,
            }
        case types.UPDATE_PREVIEW_SETTINGS:
            return {
                ...state,
                settings: {
                    ...state.settings,
                    ...action.settings,
                },
            }
        case types.SET_MAGIC_WINDOW_LOADING:
            return {
                ...state,
                isMagicWindowLoading: action.isMagicWindowLoading,
            }
        case types.SET_INITIAL_LOADING:
            return {
                ...state,
                initialLoading: action.payload.initialLoading,
            }
        case types.WALLDATA_READY:
            return {
                ...state,
                wallDataDimensions: {
                    width: action.wallDataWidth,
                    height: action.wallDataHeight,
                },
            }
        // Dispatched by compositions middleware
        case types.OPEN_COMPOSITION:
            // isAlreadyOnDesignPage is injected by compositions middleware via isDesignPage();
            // skip resetting wallDataDimensions when re-opening a composition on the design page.
            if (action.payload?.isAlreadyOnDesignPage) {
                return state
            }
            return {
                ...state,
                wallDataDimensions: resetWallDataDimensions,
            }
        case types.OPEN_SCENE_SAGA:
            return {
                ...state,
                wallDataDimensions: resetWallDataDimensions,
            }
        case types.GO_TO_ROOM_EDITOR:
            return {
                ...state,
                wallDataDimensions: resetWallDataDimensions,
            }

        case types.REQUEST_COMPILED_COMPOSITION_SAGA: {
            return {
                ...state,
                wallDataDimensions: resetWallDataDimensions,
                compositionLoaded: initialState.compositionLoaded,
                sceneLoaded: initialState.sceneLoaded,
            }
        }
        case types.REQUEST_SCENE_SAGA: {
            return {
                ...state,
                wallDataDimensions: resetWallDataDimensions,
                sceneLoaded: initialState.sceneLoaded,
            }
        }
        case types.UPDATE_SCENE_LOADED: {
            const { payload } = action
            return {
                ...state,
                sceneLoaded: {
                    hasLoaded: payload.hasLoaded,
                    errorType: payload.errorType,
                },
            }
        }

        case types.UPDATE_COMPOSITION_LOADED: {
            const { payload } = action
            return {
                ...state,
                compositionLoaded: {
                    hasLoaded: payload.hasLoaded,
                    errorType: payload.errorType,
                },
            }
        }
        case types.UPDATE_ERASED_ITEMS_COUNT: {
            return {
                ...state,
                erasedItemsCount: action.payload.erasedItemsCount,
            }
        }
        default:
            return state
    }
}

export default preview
