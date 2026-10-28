import { createSelector } from 'reselect'

import { getUrlParams, getWindow } from 'models/location/selectors'
import { isAppleDevice, getiOSVersion } from 'utils/isMobile'
import { hasProp } from 'utils/object'

export const getContextInfo = (state) => state.renderer.contextInfo
export const getHasRendered = (state) => state.renderer.hasRendered
export const getctxWasLost = (state) => state.renderer.ctxWasLost
/**
 * @returns {import('./constants').LowPerformanceCause | undefined}
 */
export const getLowPerformanceCause = (state) => {
    if (state.renderer.isLowPerformanceDevice) {
        return 'low-performance-device'
    }
    if (state.renderer.tooManyContextLosses) {
        return 'too-many-context-losses'
    }
    if (state.renderer.isLowOnGraphicsMemory) {
        return 'low-graphics-memory'
    }
    return undefined
}
export const getHasSceneLoadFailure = (state) => state.renderer.hasSceneLoadFailure
export const getTooManyContextLosses = (state) => state.renderer.tooManyContextLosses
export const getCanvasKey = (state) => state.renderer.canvasKey
export const getViewports = (state) => state.renderer.viewports
export const getIsPlacementMode = (state) => state.renderer.isPlacementMode
export const getIsStackableDraggingMode = (state) => state.renderer.isStackableDraggingMode
export const getIsDragDestinationValid = (state) => state.renderer.isDragDestinationValid
export const getIsCameraInOrbitMode = (state) =>
    state.renderer.cameraOrbitState === 'enabled' || state.renderer.cameraOrbitState === 'moving'
export const getIsCameraInOrbitModeMoving = (state) => state.renderer.cameraOrbitState === 'moving'

export const getGPUStats = (state) => state.renderer.gpuStats

const getDefaultMobileFeatures = () => {
    const w = getWindow()
    const metric = w.screen ? window.screen.width * window.screen.height * window.devicePixelRatio : 0
    const breakPoint = 950000 // empirical value based on testing with different devices
    const lowSpec = {
        mobileNoAA: true,
        mobileNoWallColor: false,
        mobileSequentialLoading: false,
        mobileEnableFXAA: true,
    }
    const highSpec = {
        mobileNoAA: false,
        mobileNoWallColor: false,
        mobileSequentialLoading: false,
        mobileEnableFXAA: false,
    }
    return isAppleDevice() && metric < breakPoint ? lowSpec : highSpec
}

export const getMobileUrlFeatures = createSelector([getUrlParams], (urlParams) => {
    const defaults = getDefaultMobileFeatures()

    // there an unidentified rendering bug reproducing in iOS 15.4, happening only when postprocessing is disabled,
    // probably something with the way WebGLRenderer is set up and/or how rendering/buffer clearing is done.
    // Doesn't happen on iOS 15.3 and >=15.5. Enabling FXAA here with enable PostProcessing.
    if (isAppleDevice()) {
        const iOSVersion = getiOSVersion()
        if (Array.isArray(iOSVersion) && iOSVersion[0] === 15 && iOSVersion[1] === 4) {
            defaults.mobileNoAA = true
            defaults.mobileEnableFXAA = true
        }
    }

    return {
        noAA: hasProp(urlParams, 'mobileNoAA') || defaults.mobileNoAA,
        noWallColor: hasProp(urlParams, 'mobileNoWallColor') || defaults.mobileNoWallColor,
        sequentialLoading: hasProp(urlParams, 'mobileSequentialLoading') || defaults.mobileSequentialLoading,
        enableFXAA: hasProp(urlParams, 'mobileEnableFXAA') || defaults.mobileEnableFXAA,
    }
})
