import { createSelector } from 'reselect'
import { getCompositionSavedProperties, getSelectedScene } from 'models/compositions/selectors'
import { getCanvasWidth, getUrlContext } from 'models/location/selectors'

import { SOURCETYPE_ROOMBUILDER, SOURCETYPE_SYNTHETIC } from 'models/scenes/constants'
import { getIsAdmin, getIsLoggedIn } from 'models/user/selectors'
import isMobile from 'utils/isMobile'
import { getMaxTextureSize } from 'utils/environment'
import { getMobileUrlFeatures } from 'models/renderer/selectors'
import type { RootState } from 'store'
import type { PreviewSettings } from 'models/preview'

import { getSceneDependentInitialViewerSettings } from 'utils/geomviewer_utils'
import { getDecidedFlags } from 'models/experiments/selectors'
import { allScenesAreStandard3D, supportsMagicEraser } from 'models/scenes/utils'
import { PreviewError } from './constants'

const getPreviewSettingsRaw = (state: RootState) => state.preview.settings

export const quickPreviewIsOpen = (state: RootState) => state.preview.quickPreviewIsOpen
export const getIsCurrentDragValid = (state: RootState) => state.preview.isCurrentDragValid
export const getIsMagicWindowLoading = (state: RootState) => state.preview.isMagicWindowLoading
export const getInitialLoading = (state: RootState) => state.preview.initialLoading
export const getWallDataDimensions = (state: RootState) => state.preview.wallDataDimensions
export const getScenePreviewErrorType = (state: RootState) => state.preview.sceneLoaded.errorType
export const getCompositionPreviewErrorType = (state: RootState) => state.preview.compositionLoaded.errorType
export const getErasedItemsCount = (state: RootState) => state.preview.erasedItemsCount

export const getPreviewSettings = createSelector(
    [
        getPreviewSettingsRaw,
        getIsMagicWindowLoading,
        getSelectedScene,
        getCanvasWidth,
        getMaxTextureSize,
        getMobileUrlFeatures,
        getIsAdmin,
        getDecidedFlags,
        getCompositionSavedProperties,
        getUrlContext,
    ],
    (
        settings,
        isMagicWindowLoading,
        scene,
        canvasWidth,
        maxTextureSize,
        mobileFeatures,
        isAdmin,
        decidedFlags,
        savedProperties,
        urlContext,
    ): PreviewSettings => {
        const { isUpptacka } = urlContext
        const featureFlags = {
            webOwnRoomWallColor: decidedFlags.OwnRoomColor,
            helaWallColor: decidedFlags.HelaWallColor,
            cameraOrbitMode: decidedFlags.CameraOrbitMode || allScenesAreStandard3D(scene) || isUpptacka,
            useWallColorAntialias: decidedFlags.WallColorAntialias,
            autoShowProductDimensions: decidedFlags.AutoShowProductDimensions,
        }
        const isSyntheticScene = scene?.sourceType === SOURCETYPE_SYNTHETIC
        const isRoomBuilderScene = scene?.sourceType === SOURCETYPE_ROOMBUILDER
        const is3dMeshScene = allScenesAreStandard3D(scene)
        const canMagicErase = supportsMagicEraser(scene)
        const hasTexturedWalls = is3dMeshScene && !!scene?.hasTexturedWalls

        const versionsNeedCompLoadPatch = [
            '6eda46ea77a76017eebab80f031507a366f1f8d6', // (May 10, 2024)
            'c54faae0bc368d7efeed7d80c658c86314c1a646', // (May 16, 2024)
            'fbd2ee4623032465b6832ad07453c1eba0c58ddf', // (May 22, 2024)
            '6e47547ecd48afe498dedc1f2a9b7968d2a16d41', // (May 22, 2024)
            '2af59f9972b98af23b9c80b10ad4886c873e5862', // (May 24, 2024)
            'e2457c34e67943371532505825c7ec9c4c75a06d', // (May 28, 2024)
            'db1b930dd0a5a1b8f51ec375c52900850b55c3ef', // (May 28, 2024)
            '2360eb7a9ca8cdedd365341f06132ec89c982e8b', // (June 06, 2024)
            'cd734718670469278f79ef30e5aa11b6adb8510c', // (June 13, 2024)
            'e37022e0a2851fe8883f5090beb89cfe94f0de3e', // (June 20, 2024)
        ]

        const needs3DCompLoadPatch =
            savedProperties && versionsNeedCompLoadPatch.includes(savedProperties.clientVersion as string)

        const baseSettings = {
            canvasWidth,
            isSyntheticScene,
            isRoomBuilderScene,
            is3dMeshScene,
            maxTextureSize,
            canMagicErase,
            hasTexturedWalls,
            onOffOptions: {
                collectFrameMetric: true,
                disableOutline: isMobile(),
                magicEraserMode: settings.magicEraserMode,
                showItemLoaders: !isMagicWindowLoading,
                showOcclusions: settings.showOcclusions,
                showShadows: settings.showShadows,
                wallCollisions: settings.wallCollisions,
                enableDebugControls: isAdmin,
            },
            featureFlags,
            mobileFeatures,
            needs3DCompLoadPatch,
        }
        const sceneSettings = getSceneDependentInitialViewerSettings(scene)

        return {
            ...baseSettings,
            ...sceneSettings,
            onOffOptions: {
                ...baseSettings.onOffOptions,
                ...(sceneSettings.onOffOptions || {}),
            },
        }
    },
)

export const getPreviewErrorType = createSelector(
    [getIsLoggedIn, getScenePreviewErrorType, getCompositionPreviewErrorType],
    (isLoggedIn, sceneErrorState, compositionErrorState) => {
        const isUserNotAllowed = (error: PreviewError | null) => isLoggedIn && error === PreviewError.USER_NOT_ALLOWED
        const isLoginError = (error: PreviewError) => !isLoggedIn && error === PreviewError.USER_NOT_ALLOWED
        const isServerError = (error: PreviewError | null) =>
            error === PreviewError.SERVER_ERROR || error === PreviewError.INVALID_MANIFEST

        return {
            isUserNotAllowedError: isUserNotAllowed(sceneErrorState) || isUserNotAllowed(compositionErrorState),
            isLoginError: isLoginError(sceneErrorState) || isLoginError(compositionErrorState),
            isServerError: isServerError(sceneErrorState) || isServerError(compositionErrorState),
        }
    },
)
