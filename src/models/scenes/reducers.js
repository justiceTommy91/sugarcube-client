// TODO: double check that scene.width/height should be the rgb w/h

import { combineReducers } from 'redux'
import * as types from 'models/actionTypes'
import { STATE_NOMINAL, STATE_FETCHING, STATE_ERROR } from 'constants/stateTypes'
import { UNSUPPORTED_ROOMTYPES } from 'models/scenes/constants'
import { PreviewError } from 'models/preview/constants'
import { allScenesAreStandard3D } from 'models/scenes/utils'

// byId: a map between ids and item properties
const initialState = {
    fetchState: STATE_NOMINAL,
    selectedSceneId: null,
    byId: {},
    isSceneDataLoaded: false,
    areScenesDataLoaded: false,
    isSaving: false,
    hasSaveError: false,
}

export const fetchState = (state = initialState.fetchState, action) => {
    switch (action.type) {
        case types.REQUEST_SCENES:
        case types.REQUEST_SCENE_SAGA:
            return STATE_FETCHING
        case types.RECEIVE_SCENES:
        case types.RECEIVE_SCENE:
        case types.RECEIVE_COMPILED_COMPOSITION:
            return STATE_NOMINAL
        case types.FAILED_RECEIVE_SCENES:
        case types.FAILED_RECEIVE_SCENE:
            if (action.payload?.errorType === PreviewError.USER_NOT_ALLOWED) {
                return STATE_NOMINAL
            }
            return STATE_ERROR
        default:
            return state
    }
}

const processServerScene = (sceneItem) => {
    const hasFloor = !!(
        sceneItem.manifest?.plane_orientation_0?.planeData || sceneItem.manifest?.plane_polygon_0?.plane_polygons
    )?.some((p) => p.class === 'floor')
    const hasWall = !!(
        sceneItem.manifest?.plane_polygon_0?.plane_polygons || sceneItem.manifest?.plane_orientation_0?.planeData
    )?.some((p) => p.class === 'wall')
    const supportsShadows = hasFloor
    const supportsForegroundOcclusion = !!sceneItem.manifest?.foreground_0

    const supportsDepthOcclusion = !!sceneItem.manifest?.depth_occlusion_0
    const staticStackingSurfacesCount =
        sceneItem.manifest?.stackables_0?.stackables?.planes.horizontal.length ||
        sceneItem.manifest?.plane_polygon_0?.plane_polygons.filter((item) => item.class === 'stackable').length ||
        0

    const supportsOcclusion = supportsForegroundOcclusion || supportsDepthOcclusion
    const thumbUrl = sceneItem.manifest?.thumbnail || sceneItem.thumbnails?.url || null
    const hasWallPaint =
        !!(
            sceneItem.manifest?.residual_0 ||
            sceneItem.manifest?.residual_0_webp ||
            sceneItem.manifest?.shading_0 ||
            sceneItem.manifest?.shading_0_webp
        ) || !!allScenesAreStandard3D(sceneItem)

    let roomType = null
    if (sceneItem.roomType && !UNSUPPORTED_ROOMTYPES.includes(sceneItem.roomType)) {
        roomType = sceneItem.roomType
    }

    return {
        [sceneItem.uuid]: {
            sceneId: sceneItem.uuid,
            jobId: sceneItem.jobId,
            jobState: sceneItem.jobState,
            state: sceneItem.state,
            status: sceneItem.status,
            name: sceneItem.name || '',
            compositionCount: sceneItem.compositionCount || 0,
            depthUrl: sceneItem.depthUrl,
            creationDate: sceneItem.createdAt,
            defaultX: 400,
            defaultY: 150,
            wid: sceneItem.wid,
            thumbUrl,
            lastModifiedDate: sceneItem.lastModifiedTs,
            manifest: sceneItem.manifest,
            gltfManifest: sceneItem.gltfManifest,
            gltfBaseUrl: sceneItem.gltfBaseUrl,
            staticStackingSurfacesCount,
            hasFloor,
            hasWall,
            supportsShadows,
            supportsOcclusion,
            supportsForegroundOcclusion,
            supportsDepthOcclusion,
            sourceType: sceneItem.sourceType,
            isStock: sceneItem.isStock,
            hasWallPaint,
            roomType,
            adminUrl: sceneItem.adminUrl,
            adminCaptureVideoUrl: sceneItem.adminCaptureVideoUrl,
            viewports: sceneItem.viewports,
        },
    }
}

export const byId = (state = initialState.byId, action) => {
    switch (action.type) {
        case types.RECEIVE_SCENES:
            return Object.assign({}, state, ...action.scenes.map(processServerScene))
        case types.RECEIVE_SCENE:
            return {
                ...state,
                ...processServerScene(action.payload.scene),
            }
        case types.RECEIVE_COMPILED_COMPOSITION:
            return {
                ...state,
                ...processServerScene(action.payload.scene),
            }
        case types.STORE_SCENE:
            return {
                ...state,
                [action.payload.scene.sceneId]: action.payload.scene,
            }
        case types.UPDATE_SCENE_MANIFEST:
            return {
                ...state,
                [action.id]: {
                    ...state[action.id],
                    manifest: {
                        ...state[action.id].manifest,
                        [action.key]: action.value,
                    },
                },
            }
        case types.REQUEST_DELETE_SCENE: {
            const nextState = { ...state }
            delete nextState[action.id]
            return nextState
        }
        case types.LOAD_SCENE_FROM_LOCAL_STORAGE: {
            if (action.payload) {
                return {
                    ...state,
                    [action.payload.sceneId]: action.payload,
                }
            }
            return state
        }
        default:
            return state
    }
}

export const selectedSceneId = (state = initialState.selectedSceneId, action) => {
    let firstDemoSceneId
    switch (action.type) {
        case types.SELECT_SCENE:
            return action.payload.id
        case types.RECEIVE_SCENES:
            // TODO Move to middleware
            if (action.scenes.length > 0 && !Number.isNaN(Number(state))) {
                // Legacy int id
                for (let i = 0; i < action.scenes.length; i += 1) {
                    if (action.scenes[i].uuid === state) {
                        return state
                    }
                    if (!firstDemoSceneId && action.scenes[i].isStock) {
                        firstDemoSceneId = action.scenes[i].uuid
                    }
                }
                if (firstDemoSceneId) {
                    return firstDemoSceneId
                }
                return action.scenes[0].uuid
            }
            return state
        case types.RECEIVE_DELETE_SCENE: {
            return initialState.selectedSceneId
        }
        default:
            return state
    }
}

const isSceneDataLoaded = (state = initialState.isSceneDataLoaded, action) => {
    switch (action.type) {
        case types.RECEIVE_SCENE:
        case types.FAILED_RECEIVE_SCENE:
            return true
        default:
            return state
    }
}

const areScenesDataLoaded = (state = initialState.areScenesDataLoaded, action) => {
    switch (action.type) {
        case types.REQUEST_SCENES:
            return false
        case types.REQUEST_SCENES_SILENT:
            return state // Keep current state during silent polling
        case types.FAILED_RECEIVE_SCENES:
        case types.RECEIVE_SCENES:
            return true
        default:
            return state
    }
}

export const isSaving = (state = initialState.isSaving, action) => {
    switch (action.type) {
        case types.REQUEST_SAVE_SCENE:
            return true
        case types.RECEIVE_SAVE_SCENE:
        case types.FAILED_SAVE_SCENE:
            return false
        default:
            return state
    }
}

export const hasSaveError = (state = initialState.hasSaveError, action) => {
    switch (action.type) {
        case types.REQUEST_SAVE_SCENE:
        case types.RECEIVE_SAVE_SCENE:
            return false
        case types.FAILED_SAVE_SCENE:
            return true
        default:
            return state
    }
}

export default combineReducers({
    fetchState,
    byId,
    selectedSceneId,
    isSceneDataLoaded,
    areScenesDataLoaded,
    isSaving,
    hasSaveError,
})
