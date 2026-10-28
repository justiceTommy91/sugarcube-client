import * as types from 'models/actionTypes'
import { getCompositionCtxLossCount } from 'models/sessionStorage/selectors'
import { webglContextTooManyLosses } from 'models/renderer/actions'
import { clearCompositionCtxLossCount } from 'models/sessionStorage/actions'
import { updateDebugSettings } from 'models/admin/actions'
import { getDecidedFlags } from 'models/experiments/selectors'

const rendererMiddleware = (store) => (next) => (action) => {
    const { dispatch } = store
    switch (action.type) {
        case types.WEBGL_CONTEXT_LOST:
            if (getCompositionCtxLossCount(store.getState()) > 2) {
                dispatch(clearCompositionCtxLossCount())
                dispatch(webglContextTooManyLosses())
            }
            return next(action)
        case types.GPU_STATS_READY:
            if (
                action.gpuStats.gpuStatsTier >= 4 ||
                (action.gpuStats.gpuStatsTier === 3 && getDecidedFlags(store.getState()).LowEndLightCustomizations)
            ) {
                // Enable settings that are specific to gpu tier 4+.
                dispatch(
                    updateDebugSettings({
                        enableGTAO: true,
                        useFloorContactShadows: false,
                        keepLocallyGeneratedLights: true,
                    }),
                )
            }
            return next(action)
        default:
            return next(action)
    }
}

export default rendererMiddleware
