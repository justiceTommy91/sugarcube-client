import generateThumbnailFromPreview from 'utils/generateThumbnailFromPreview'
import * as types from 'models/actionTypes'
import Renderer from 'Renderer'
import { createAction } from '@reduxjs/toolkit'

export const updateDebugSettings = (debugSettings) => ({
    type: types.UPDATE_DEBUG_SETTINGS,
    debugSettings,
})

export const takeScreenshot = () => () =>
    generateThumbnailFromPreview().then((thumb) => {
        const newWindow = window.open()
        newWindow?.document.write(`<img src="${thumb.thumbDataUrl}" style="width: 100%;" />`)
    })

export const setAdmin = (shouldBeAdmin) => ({
    type: types.SET_ADMIN,
    shouldBeAdmin,
})

export const loseWebglContext = () => () => {
    Renderer.getInstance()?.getThreeRenderer()?.forceContextLoss()
}

export const startSwapTestSaga = (targetRenderItemId, selectedProduct, swapItemsData) => ({
    type: types.START_TEST_SWAP_SAGA,
    targetRenderItemId,
    selectedProduct,
    swapItemsData,
})

export const swapTestSagaFinished = (results) => ({
    type: types.TEST_SWAP_SAGA_FINISHED,
    results,
})

export const startLoadTestSaga = () => ({
    type: types.START_TEST_LOAD_SAGA,
})

export const loadTestSagaFinished = (results) => ({
    type: types.TEST_LOAD_SAGA_FINISHED,
    results,
})

export const debugConsoleLog = createAction(types.DEBUG_CONSOLE_LOG, (tag, message) => ({
    payload: {
        tag,
        message,
        timestamp: 0, // filled in middleware
    },
}))

export const toggleDebugFeatures = createAction(types.TOGGLE_DEBUG_FEATURES)
