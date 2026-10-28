import { createSelector } from 'reselect'
import { STATE_FETCHING } from 'constants/stateTypes'
import {
    NEW_SCENE_ID,
    SCENE_STATE_PROCESSING,
    SCENE_STATE_QUEUED,
    SCENE_STATE_UPLOADED,
    SOURCETYPE_LITE_SCAN,
} from './constants'

/** @type {(state: import('store').RootState) => import('store').RootState['scenes']['byId']} */
export const getById = (state) => state.scenes.byId
/**
 * This selectedSceneId is used when the default ('-1') composition
 * is selected. When any other composition is selected, there
 * is no guarantee that this sceneId will match the one in
 * the composition. Use getSelectedScene() in the composition selector.
 */
export const getSelectedSceneId = (state) => state.scenes.selectedSceneId
export const getFetchState = (state) => state.scenes.fetchState
export const getIsFetching = (state) => getFetchState(state) === STATE_FETCHING
export const getIsSceneDataLoaded = (state) => state.scenes.isSceneDataLoaded
export const getAreScenesDataLoaded = (state) => state.scenes.areScenesDataLoaded
export const getIsSaving = (state) => state.scenes.isSaving
export const getHasSaveError = (state) => state.scenes.hasSaveError

export const getSceneItemsById = createSelector([getById], (items) => items)

export const getSceneItems = createSelector([getSceneItemsById], (itemsById) =>
    Object.values(itemsById)
        .filter((item) => item.sceneId !== NEW_SCENE_ID)
        .sort((a, b) => b.sceneId - a.sceneId),
)

export const getUserSceneItems = createSelector([getSceneItems], (sceneItems) =>
    sceneItems.filter((item) => !item.isStock).sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate)),
)

export const getHasProcessingScenes = (state) =>
    Object.values(state.scenes.byId).some(
        (scene) =>
            scene.state === SCENE_STATE_PROCESSING ||
            scene.state === SCENE_STATE_QUEUED ||
            (scene.state === SCENE_STATE_UPLOADED && scene.sourceType === SOURCETYPE_LITE_SCAN) ||
            scene.jobState === SCENE_STATE_PROCESSING ||
            scene.jobState === SCENE_STATE_QUEUED,
    )

export const getStockSceneItems = createSelector([getSceneItems], (stockSceneItems) =>
    stockSceneItems.filter((item) => item.isStock),
)

export const getNumberUserScenes = createSelector([getUserSceneItems], (userScenes) => userScenes.length)

export const getHasUserScenes = createSelector([getUserSceneItems], (sceneItems) => sceneItems.length > 0)
