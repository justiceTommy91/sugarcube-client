import * as Sentry from '@sentry/react'
import { createAction } from '@reduxjs/toolkit'
import * as tracker from 'utils/tracker'
import * as types from 'models/actionTypes'
import * as scenesApi from 'services/scenes'
import { checkManifest } from 'models/scenes/utils'
import {
    SCENE_STATE_PROCESSING,
    SCENE_STATE_QUEUED,
    SCENE_STATE_UPLOADED,
    SCENE_STATE_FAILED,
    SCENE_STATE_ERROR,
} from 'models/scenes/constants'

const requestScenes = () => ({
    type: types.REQUEST_SCENES,
})

const requestScenesSilent = () => ({
    type: types.REQUEST_SCENES_SILENT,
})

// Notify that scenes has been fetched
const receiveScenes = (scenes) => ({
    type: types.RECEIVE_SCENES,
    scenes,
})

const failedReceiveScenes = () => ({
    type: types.FAILED_RECEIVE_SCENES,
})

export const requestScene = createAction(types.REQUEST_SCENE_SAGA, (id, forceLegacyManifest = false) => ({
    payload: {
        id,
        forceLegacyManifest,
    },
}))

export const receiveScene = createAction(types.RECEIVE_SCENE, (scene) => ({
    payload: {
        scene,
    },
}))

export const failedReceiveScene = createAction(types.FAILED_RECEIVE_SCENE, (errorType) => ({
    payload: {
        errorType,
    },
}))

export const selectScene = createAction(types.SELECT_SCENE, (id) => ({
    payload: { id },
}))

export const openScene = createAction(types.OPEN_SCENE_SAGA, (id, trackingInfo = {}, extra = {}) => ({
    payload: {
        id,
        trackingInfo,
        extra,
    },
}))

// Fetch and dispatch with results
export const fetchScenes =
    (isRetry = false, silent = false) =>
    (dispatch) => {
        dispatch(silent ? requestScenesSilent() : requestScenes())

        return scenesApi
            .getScenes(false /* not legacy */, true /* include all states */)
            .then(({ data }) => {
                // Keep processing and failed scenes, but filter truly broken ones
                const scenes = data.filter((s) => {
                    // Always keep processing scenes - check both state and jobState
                    if (
                        s.state === SCENE_STATE_PROCESSING ||
                        s.state === SCENE_STATE_QUEUED ||
                        s.state === SCENE_STATE_UPLOADED ||
                        s.jobState === SCENE_STATE_PROCESSING ||
                        s.jobState === SCENE_STATE_QUEUED
                    ) {
                        return true
                    }
                    // Always keep failed scenes (user can delete them)
                    if (
                        s.state === SCENE_STATE_FAILED ||
                        s.state === SCENE_STATE_ERROR ||
                        s.jobState === SCENE_STATE_FAILED ||
                        s.jobState === SCENE_STATE_ERROR
                    ) {
                        return true
                    }
                    // For completed scenes, check manifest validity
                    return checkManifest(s)
                })
                dispatch(receiveScenes(scenes))
            })
            .catch((error) => {
                if (!isRetry) {
                    dispatch(fetchScenes(true, silent))
                } else {
                    Sentry.addBreadcrumb({
                        category: 'loading',
                        level: 'error',
                        message: 'failed to receive scenes',
                    })
                    Sentry.captureException(error)
                    tracker.error('LoadingRooms')

                    dispatch(failedReceiveScenes())
                }
            })
    }

export const updateSceneManifest = (id, key, value) => ({
    type: types.UPDATE_SCENE_MANIFEST,
    id,
    key,
    value,
})

const requestDeleteScene = (id) => ({
    type: types.REQUEST_DELETE_SCENE,
    id,
})

const receiveDeleteScene = () => ({
    type: types.RECEIVE_DELETE_SCENE,
})

export const deleteScene = (id) => (dispatch) => {
    dispatch(requestDeleteScene(id))

    return scenesApi.deleteScene(id).then(() => dispatch(receiveDeleteScene()))
}

export const createRoomPlannerScene = createAction(types.CREATE_ROOM_PLANNER_SCENE, (name, gltf, envmap = null) => ({
    payload: { name, gltf, envmap },
}))

export const storeScene = createAction(types.STORE_SCENE, (scene) => ({
    payload: {
        scene,
    },
}))

export const requestSaveScene = createAction(types.REQUEST_SAVE_SCENE, (name, roomType, gltf) => ({
    payload: {
        name,
        roomType,
        gltf,
    },
}))

export const receiveSaveScene = createAction(types.RECEIVE_SAVE_SCENE, (scene, autoOpen) => ({
    payload: {
        scene,
        autoOpen,
    },
}))

export const failedSaveScene = createAction(types.FAILED_SAVE_SCENE, (error) => ({
    payload: {
        error,
    },
}))
