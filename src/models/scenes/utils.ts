import {
    RoomViewType,
    ROOM_VIEW_TYPE_SINGLE,
    ROOM_VIEW_TYPE_MULTI,
    RoomSourceDetail,
    ROOM_SOURCE_DETAILS,
    ROOM_SOURCE_STOCK,
    ROOM_SOURCE_USERCAPTURED,
    RoomSource,
    SOURCE_TYPE_LABEL_CAPTURED,
    SOURCE_TYPE_LABEL_SYNTHETIC,
    SOURCE_TYPE_LABEL_ROOM_BUILDER,
    SOURCE_TYPE_LABEL_VIRTUAL_STAGING,
    SOURCE_TYPE_LABEL_LITE_SCAN,
    SOURCE_TYPE_LABEL_FMF_LITE,
    SOURCE_TYPE_LABEL_UNKNOWN,
} from 'models/tracking/constants'
import { SceneTypeLabel } from '../../services/toasts'
import {
    ASSETS_CACHE_ENVMAP_KEY,
    SCENE_TYPES,
    SOURCETYPE_CAPTURED,
    SOURCETYPE_FMF_LITE,
    SOURCETYPE_LITE_SCAN,
    SOURCETYPE_ROOMBUILDER,
    SOURCETYPE_SYNTHETIC,
    SOURCETYPE_VIRTUAL_STAGING,
    type SceneType,
} from './constants'
import type { Scene } from '.'

type SceneWithGltfManifest = Pick<Scene, 'gltfManifest'>
type SceneWithSourceType = Pick<Scene, 'sourceType'>

export const getSceneType = (scene: SceneWithGltfManifest, sceneIndex: number): SceneType | undefined => {
    switch (scene.gltfManifest?.extras?.geomagical?.geomagicalScenes[sceneIndex]?.sceneType) {
        case SCENE_TYPES.PHOTO_AR:
            return SCENE_TYPES.PHOTO_AR
        case SCENE_TYPES.STANDARD_3D:
            return SCENE_TYPES.STANDARD_3D
        default:
            return undefined
    }
}

// Check if we are using a whole-room scene
export const allScenesAreStandard3D = (scene?: SceneWithGltfManifest): boolean => {
    const geomagicalScenes = scene?.gltfManifest?.extras?.geomagical?.geomagicalScenes
    return geomagicalScenes?.every((s) => s.sceneType === SCENE_TYPES.STANDARD_3D) ?? false
}

export const allScenesArePhotoAR = (scene?: SceneWithGltfManifest): boolean => {
    const geomagicalScenes = scene?.gltfManifest?.extras?.geomagical?.geomagicalScenes
    return geomagicalScenes?.every((s) => s.sceneType === SCENE_TYPES.PHOTO_AR) ?? false
}

export const checkManifest = (scene: Scene) =>
    allScenesAreStandard3D(scene) ||
    (scene.manifest &&
        scene.manifest.pano_0 &&
        scene.manifest.plane_orientation_0 &&
        scene.manifest.normals_segmentation_0)

export const patchSceneUsingCachedAsset = (scene: Scene, key: string, value: string) => {
    if (key === ASSETS_CACHE_ENVMAP_KEY) {
        const environmentMapCustomImage = scene?.gltfManifest?.extras?.geomagical
            ?.geomagicalScenes?.[0]?.environmentMapCustomImage
        if (environmentMapCustomImage) environmentMapCustomImage.uri = value
    }
}

// Panoptika scenes have multiple viewports, otherwise check if hela scene
export const isMultiviewScene = (scene: Scene): boolean => scene.viewports.length > 1 || allScenesAreStandard3D(scene)

export const isRoomBuilderScene = (scene: SceneWithSourceType): boolean => scene.sourceType === SOURCETYPE_ROOMBUILDER

export const getSceneTypeLabel = (sourceType: number | undefined): SceneTypeLabel | undefined => {
    if (sourceType === undefined) return undefined
    if (sourceType === SOURCETYPE_CAPTURED) return SceneTypeLabel.SCAN
    if (sourceType === SOURCETYPE_LITE_SCAN) return SceneTypeLabel.IMAGE
    return SceneTypeLabel.ROOM
}

export const supportsMagicEraser = (
    scene: (SceneWithSourceType & SceneWithGltfManifest) | null | undefined,
): boolean => {
    if (!scene) return false
    return [SOURCETYPE_CAPTURED, SOURCETYPE_LITE_SCAN].includes(scene.sourceType) && !allScenesAreStandard3D(scene)
}

export const getRoomViewTypeFromScene = (scene: Scene): RoomViewType =>
    isMultiviewScene(scene) ? ROOM_VIEW_TYPE_MULTI : ROOM_VIEW_TYPE_SINGLE

export const getRoomSourceFromScene = (scene: Scene): RoomSource => {
    if (isRoomBuilderScene(scene)) {
        return ROOM_SOURCE_STOCK
    }

    return scene.isStock ? ROOM_SOURCE_STOCK : ROOM_SOURCE_USERCAPTURED
}

export const getRoomSourceDetailFromScene = (scene: Scene): RoomSourceDetail => {
    if (isRoomBuilderScene(scene)) {
        return ROOM_SOURCE_DETAILS.ROOM_BUILDER
    }

    switch (scene.sourceType) {
        case SOURCETYPE_CAPTURED:
            return isMultiviewScene(scene)
                ? ROOM_SOURCE_DETAILS.MULTIVIEW_CAPTURE
                : ROOM_SOURCE_DETAILS.SINGLEVIEW_CAPTURE
        case SOURCETYPE_SYNTHETIC:
            return isMultiviewScene(scene)
                ? ROOM_SOURCE_DETAILS.MULTIVIEW_SHOWROOM
                : ROOM_SOURCE_DETAILS.SINGLEVIEW_SHOWROOM
        default:
            return ROOM_SOURCE_DETAILS.UNKNOWN
    }
}

export const sceneHasGeneratedEnvmap = (scene: SceneWithGltfManifest): boolean => {
    const customMap = scene.gltfManifest?.extras?.geomagical.geomagicalScenes[0].environmentMapCustomImage
    return !!customMap && !customMap.uri.includes('gray')
}

/**
 * Maps numeric sourceType to descriptive string for Mixpanel tracking
 * @param scene - Scene object with sourceType property
 * @returns Descriptive source type string for tracking
 */
export const getSourceTypeLabel = (scene: SceneWithSourceType): string => {
    switch (scene.sourceType) {
        case SOURCETYPE_CAPTURED:
            return SOURCE_TYPE_LABEL_CAPTURED
        case SOURCETYPE_SYNTHETIC:
            return SOURCE_TYPE_LABEL_SYNTHETIC
        case SOURCETYPE_ROOMBUILDER:
            return SOURCE_TYPE_LABEL_ROOM_BUILDER
        case SOURCETYPE_VIRTUAL_STAGING:
            return SOURCE_TYPE_LABEL_VIRTUAL_STAGING
        case SOURCETYPE_LITE_SCAN:
            return SOURCE_TYPE_LABEL_LITE_SCAN
        case SOURCETYPE_FMF_LITE:
            return SOURCE_TYPE_LABEL_FMF_LITE
        default:
            return SOURCE_TYPE_LABEL_UNKNOWN
    }
}
