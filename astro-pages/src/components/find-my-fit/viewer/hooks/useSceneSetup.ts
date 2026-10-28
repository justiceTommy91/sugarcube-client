import { useMemo } from 'react'
import { defaultViewerSettings, defaultDebugSettings } from '@gatsby/Renderer/ui/settings'
import { SOURCETYPE_CAPTURED, SOURCETYPE_ROOMBUILDER } from '@gatsby/models/scenes/constants'
import { allScenesAreStandard3D } from '@gatsby/models/scenes/utils'
import {
    getSceneDependentInitialViewerSettings,
    getSceneDependentInitialDebugSettings,
} from '@gatsby/utils/geomviewer_utils'
import { useScene } from '@astro-hooks/useScene'
import type { DebugSettings, ViewerSettings } from '@gatsby/Renderer/geomviewer'
import type { SceneInfo } from '@gatsby/Renderer/geomviewer/geom_types'

// Base debug settings for the find-my-fit viewer. Call sites that need to toggle
// a single flag should spread this first so scene-dependent flags and the viewer's
// fixed overrides (forceFXAA, disablePins) are preserved.
export function buildFindMyFitDebugSettings(viewerSettings: ViewerSettings, scene: SceneInfo): DebugSettings {
    return {
        ...defaultDebugSettings,
        ...getSceneDependentInitialDebugSettings(viewerSettings, scene),
        forceFXAA: true,
        disablePins: true,
    }
}

export function useSceneSetup(sceneId: string, allowGuest?: boolean) {
    const { scene: sceneData, loading, error } = useScene(sceneId, allowGuest)

    const scene = sceneData ?? null

    const viewerSettings = useMemo(() => {
        if (!scene) return defaultViewerSettings
        const is3dMesh = allScenesAreStandard3D(scene)
        const sceneViewerSettings = getSceneDependentInitialViewerSettings(scene)
        return {
            ...defaultViewerSettings,
            ...sceneViewerSettings,
            isSyntheticScene: scene.sourceType !== SOURCETYPE_CAPTURED,
            isRoomBuilderScene: scene.sourceType === SOURCETYPE_ROOMBUILDER,
            is3dMeshScene: is3dMesh,
            onOffOptions: {
                ...defaultViewerSettings.onOffOptions,
                ...(sceneViewerSettings.onOffOptions || {}),
                disableMobileCanvasSizing: true,
                enableDitheredOpacity: true,
            },
            featureFlags: {
                ...defaultViewerSettings.featureFlags,
                cameraOrbitMode: is3dMesh,
            },
            canMagicErase: true,
        }
    }, [scene])

    const debugSettings = useMemo(() => {
        if (!scene) return defaultDebugSettings
        return buildFindMyFitDebugSettings(viewerSettings, scene)
    }, [scene, viewerSettings])

    return { scene, viewerSettings, debugSettings, loading, error }
}
