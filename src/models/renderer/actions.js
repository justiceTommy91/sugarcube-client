import * as types from 'models/actionTypes'

export const newRenderer = () => ({
    type: types.NEW_RENDERER,
})

export const destroyRenderer = () => ({
    type: types.DESTROY_RENDERER,
})

export const rendererReady = (contextInfo) => ({
    type: types.RENDERER_READY,
    contextInfo,
})

export const firstRender = () => ({
    type: types.FIRST_RENDER,
})

export const webglContextLost = () => ({
    type: types.WEBGL_CONTEXT_LOST,
})

export const webglContextNotCreated = () => ({
    type: types.WEBGL_CONTEXT_NOT_CREATED,
})

export const webglContextRestored = () => ({
    type: types.WEBGL_CONTEXT_RESTORED,
})

export const webglContextTooManyLosses = () => ({
    type: types.WEBGL_CONTEXT_TOO_MANY_LOSSES,
})

export const initializationFailure = (info) => ({
    type: types.INITIALIZATION_FAILURE,
    info,
})

export const lowPerformanceDetected = (info) => ({
    type: types.LOW_PERFORMANCE_DETECTED,
    info,
})

export const setViewports = (viewports) => ({
    type: types.SET_VIEWPORTS,
    viewports,
})

export const placementModeStarted = () => ({ type: types.PLACEMENT_MODE_STARTED })

export const placementModeFinished = () => ({ type: types.PLACEMENT_MODE_FINISHED })

export const stackableDraggingModeStarted = () => ({ type: types.STACKABLE_DRAGGING_MODE_STARTED })

export const stackableDraggingModeEnded = () => ({ type: types.STACKABLE_DRAGGING_MODE_FINISHED })

export const stackableDraggingPositionValid = (isDragDestinationValid) => ({
    type: types.STACKABLE_DRAGGING_POSITION_VALID,
    isDragDestinationValid,
})

export const orbitModeBegin = () => ({
    type: types.ORBIT_MODE_BEGIN,
})

export const orbitModeEnd = () => ({
    type: types.ORBIT_MODE_END,
})

export const orbitModeMoveStart = () => ({
    type: types.ORBIT_MODE_MOVE_START,
})

export const orbitModeMoveStop = () => ({
    type: types.ORBIT_MODE_MOVE_STOP,
})

export const gpuStatsReady = (gpuStats) => ({
    type: types.GPU_STATS_READY,
    gpuStats,
})
