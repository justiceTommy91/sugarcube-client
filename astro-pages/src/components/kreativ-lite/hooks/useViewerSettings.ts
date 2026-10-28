import { useMemo } from 'react'
import { defaultViewerSettings, defaultDebugSettings } from '@gatsby/Renderer/ui/settings'
import { SOURCETYPE_CAPTURED, SOURCETYPE_ROOMBUILDER } from '@gatsby/models/scenes/constants'
import { allScenesAreStandard3D } from '@gatsby/models/scenes/utils'
import {
    getSceneDependentInitialViewerSettings,
    getSceneDependentInitialDebugSettings,
} from '@gatsby/utils/geomviewer_utils'
import type { SceneInfo } from '@gatsby/Renderer/geomviewer/geom_types'

/**
 * Derives the viewer settings object from scene data and current app state.
 * Re-computes only when scene, magicEraserMode, or canMagicErase change.
 */
export function useViewerSettings(scene: SceneInfo | null, magicEraserMode: boolean, canMagicErase: boolean) {
    const viewerSettings = useMemo(() => {
        if (!scene) return defaultViewerSettings
        const is3dMesh = allScenesAreStandard3D(scene)
        const sceneSettings = getSceneDependentInitialViewerSettings(scene)
        return {
            ...defaultViewerSettings,
            ...sceneSettings,
            isSyntheticScene: scene.sourceType !== SOURCETYPE_CAPTURED,
            isRoomBuilderScene: scene.sourceType === SOURCETYPE_ROOMBUILDER,
            is3dMeshScene: is3dMesh,
            canMagicErase,
            onOffOptions: {
                ...defaultViewerSettings.onOffOptions,
                ...(sceneSettings.onOffOptions || {}),
                magicEraserMode,
            },
            featureFlags: {
                ...defaultViewerSettings.featureFlags,
                cameraOrbitMode: is3dMesh,
            },
        }
    }, [scene, magicEraserMode, canMagicErase])

    // "debugSettings" is a legacy name from the Gatsby app, where these settings
    // originated as admin-only controls exposed through the Debug Tab panel.
    // Despite the name, they configure production renderer behavior: tone mapping,
    // auto-exposure, lighting intensities, and shadows. The viewer API
    // (startViewer / changeDebugSettings) still uses this name throughout.
    const debugSettings = useMemo(() => {
        if (!scene) return defaultDebugSettings
        return {
            ...defaultDebugSettings,
            ...getSceneDependentInitialDebugSettings(viewerSettings, scene),
        }
    }, [scene, viewerSettings])

    return { viewerSettings, debugSettings }
}
