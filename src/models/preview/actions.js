import { createAction } from '@reduxjs/toolkit'
import * as types from 'models/actionTypes'

export const quickPreviewClose = () => ({
    type: types.QUICK_PREVIEW_CLOSE,
})

export const dragValidityChange = (isValid) => ({
    type: types.DRAG_VALIDITY_CHANGE,
    isValid,
})

export const updatePreviewSettings = (settings) => ({
    type: types.UPDATE_PREVIEW_SETTINGS,
    settings,
})

export const showPlaceableSurfaces = (surfaces) => ({
    type: types.SHOW_PLACEABLE_SURFACES,
    surfaces,
})

export const setIsMagicWindowLoading = (isMagicWindowLoading) => ({
    type: types.SET_MAGIC_WINDOW_LOADING,
    isMagicWindowLoading,
})

export const setInitialLoading = createAction(types.SET_INITIAL_LOADING, (initialLoading, compositionId) => ({
    payload: {
        initialLoading,
        compositionId,
    },
}))

export const wallDataReady = (wallDataWidth, wallDataHeight) => ({
    type: types.WALLDATA_READY,
    wallDataWidth,
    wallDataHeight,
})

export const viewSelected = createAction(types.VIEW_SELECTED, (viewName, viewId) => ({
    payload: {
        viewName,
        viewId,
    },
}))

export const viewLoaded = createAction(types.VIEW_LOADED, (viewName, cameraInfo) => ({
    payload: {
        viewName,
        cameraInfo,
    },
}))

// This action is in the preview model even though pins are stored
// in the composition because pins will be moved out of compositions
// in the near future
export const updateAllPins = createAction(types.UPDATE_ALL_PINS, ({ hidePin }) => ({
    payload: {
        hidePin,
    },
}))

export const sceneLoaded = createAction(types.UPDATE_SCENE_LOADED, ({ hasLoaded, errorType }) => ({
    payload: {
        hasLoaded,
        errorType,
    },
}))

export const compositionLoaded = createAction(types.UPDATE_COMPOSITION_LOADED, ({ hasLoaded, errorType }) => ({
    payload: {
        hasLoaded,
        errorType,
    },
}))

export const updateErasedItemsCount = createAction(types.UPDATE_ERASED_ITEMS_COUNT, (count) => ({
    payload: {
        erasedItemsCount: count,
    },
}))
