import * as types from 'models/actionTypes'

const initialState = {
    renderer: null,
    contextInfo: null,
    hasRendered: false,
    tooManyContextLosses: false,
    isLowOnGraphicsMemory: false,
    isLowPerformanceDevice: false, // set once a renderer is created and keeps its value after the renderer is destroyed.
    hasSceneLoadFailure: false,
    canvasKey: '1', // Canvas with lost context can't create a new one; key is used to let react create a new canvas node.
    ctxWasLost: false,
    viewports: [],
    isPlacementMode: false,
    isStackableDraggingMode: false,
    isDragDestinationValid: true,
    cameraOrbitState: 'disabled',
    gpuStats: null,
}

const renderer = (state = initialState, action) => {
    switch (action.type) {
        case types.NEW_RENDERER:
            return {
                ...state,
                renderer: true,
                contextInfo: null,
                hasRendered: false,
                viewports: [],
            }
        case types.DESTROY_RENDERER:
            return {
                ...state,
                renderer: null,
                contextInfo: null,
                hasRendered: false,
                canvasKey: (+state.canvasKey + 1).toString(),
                viewports: [],
            }
        case types.RENDERER_READY: {
            const isLowPerformanceDevice = !!(action.contextInfo && action.contextInfo.software)
            return {
                ...state,
                contextInfo: action.contextInfo,
                isLowPerformanceDevice,
            }
        }
        case types.FIRST_RENDER:
            return {
                ...state,
                ctxWasLost: false,
                hasRendered: true,
            }
        case types.WEBGL_CONTEXT_LOST:
            return {
                ...state,
                ctxWasLost: true,
            }
        case types.WEBGL_CONTEXT_TOO_MANY_LOSSES:
            return {
                ...state,
                tooManyContextLosses: true,
            }
        case types.INITIALIZATION_FAILURE:
            return {
                ...state,
                isLowOnGraphicsMemory: !!action.info.notEnoughWGlResources,
                hasSceneLoadFailure: !!action.info.hasSceneLoadFailure,
            }
        case types.SET_VIEWPORTS:
            return {
                ...state,
                viewports: action.viewports,
            }
        case types.PLACEMENT_MODE_STARTED:
            return {
                ...state,
                isPlacementMode: true,
            }
        case types.PLACEMENT_MODE_FINISHED:
            return {
                ...state,
                isPlacementMode: false,
            }
        case types.STACKABLE_DRAGGING_MODE_STARTED:
            return {
                ...state,
                isStackableDraggingMode: true,
            }
        case types.STACKABLE_DRAGGING_MODE_FINISHED:
            return {
                ...state,
                isStackableDraggingMode: false,
            }
        case types.STACKABLE_DRAGGING_POSITION_VALID:
            return {
                ...state,
                isDragDestinationValid: action.isDragDestinationValid,
            }
        case types.ORBIT_MODE_BEGIN:
            return {
                ...state,
                cameraOrbitState: 'enabled',
            }
        case types.ORBIT_MODE_END:
            return {
                ...state,
                cameraOrbitState: 'disabled',
            }
        case types.ORBIT_MODE_MOVE_START:
            return {
                ...state,
                cameraOrbitState: 'moving',
            }
        case types.ORBIT_MODE_MOVE_STOP: {
            const nextState = state.cameraOrbitState === 'moving' ? 'enabled' : state.cameraOrbitState
            return {
                ...state,
                cameraOrbitState: nextState,
            }
        }
        case types.GPU_STATS_READY: {
            return {
                ...state,
                gpuStats: action.gpuStats,
            }
        }
        default:
            return state
    }
}

export default renderer
