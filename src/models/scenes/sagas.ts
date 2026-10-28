import axios from 'axios'
import * as Sentry from '@sentry/react'
import { takeEvery, call, takeLatest, select, put, take, race, delay } from 'redux-saga/effects'
import { SagaIterator } from 'redux-saga'

import { GLTf } from 'Renderer/gltf/gltf'
import {
    RECEIVE_DELETE_SCENE,
    SELECT_SCENE,
    RECEIVE_USER,
    FAILED_RECEIVE_USER,
    SKIP_FETCH_USER,
    RECEIVE_SCENE,
    FAILED_RECEIVE_SCENE,
    REQUEST_SCENE_SAGA,
    OPEN_SCENE_SAGA,
    RECEIVE_SAVE_SCENE,
    RECEIVE_IKEA_TOKENS,
} from 'models/actionTypes'
import toastsService, { DeletedType, SceneTypeLabel, ToastType } from 'services/toasts'
import { getById as getScenesById } from 'models/scenes/selectors'
import { getForceLegacyManifest, getSubCatalog } from 'models/location/selectors'
import { getIsUserDataLoaded, getHasValidAuthToken } from 'models/user/selectors'
import { requestUser } from 'models/user/actions'
import { sceneLoaded } from 'models/preview/actions'
import { getSceneDependentInitialDebugSettings } from 'utils/geomviewer_utils'
import { getDebugSettings } from 'models/admin/selectors'
import { getPreviewSettings } from 'models/preview/selectors'
import { updateDebugSettings } from 'models/admin/actions'
import { openComposition } from 'models/compositions/actions'
import { DebugSettings } from 'models/admin'
import { PreviewSettings } from 'models/preview'
import * as scenesApi from 'services/scenes'
import * as envmapsApi from 'services/envmapUpload'
import { cacheSceneAsset, consumeCachedSceneAsset } from 'services/idbService'
import {
    requestScene,
    receiveScene,
    failedReceiveScene,
    openScene,
    selectScene,
    storeScene,
    createRoomPlannerScene,
    requestSaveScene,
    receiveSaveScene,
    failedSaveScene,
} from 'models/scenes/actions'
import { NEW_COMPOSITION_ID } from 'models/compositions/constants'
import OpenCompositionTrackingType from 'models/tracking'
import { PreviewError } from 'models/preview/constants'
import type { APIScene, Scene } from '.'
import { checkManifest, patchSceneUsingCachedAsset, sceneHasGeneratedEnvmap } from './utils'
import { NEW_SCENE_ID, SOURCETYPE_ROOMBUILDER, BEDROOM, ASSETS_CACHE_ENVMAP_KEY } from './constants'

export function* deletedSceneSaga() {
    const deleteType: DeletedType = yield select((state) => state.ui.deleteType)
    const sceneTypeLabel: SceneTypeLabel = yield select((state) => state.ui.sceneTypeLabel)

    yield call(toastsService.showToast, {
        toastType: ToastType.COMPOSITIONS_DELETED,
        deletedType: deleteType,
        sceneTypeLabel,
    })
}

type SelectSceneAction = {
    type: typeof SELECT_SCENE
    payload: {
        id: string
    }
}

export function* selectSceneSaga(action: SelectSceneAction) {
    const {
        payload: { id: selectedSceneId },
    } = action

    let hasValidAuthToken: boolean = yield select(getHasValidAuthToken)
    let isUserDataLoaded: boolean = yield select(getIsUserDataLoaded)
    let userDataNotLoaded = !hasValidAuthToken && !isUserDataLoaded

    if (userDataNotLoaded) {
        // Wait for tokens to be received before proceeding — fixes the race condition
        // where selectScene is dispatched before RECEIVE_IKEA_TOKENS has been processed.
        // Mirrors the same fix in selectCompositionSaga.
        yield race({
            tokenReceived: take(RECEIVE_IKEA_TOKENS),
            timeout: delay(5000),
        })

        // Re-check after tokens arrive (or timeout)
        hasValidAuthToken = yield select(getHasValidAuthToken)
        isUserDataLoaded = yield select(getIsUserDataLoaded)
        userDataNotLoaded = !hasValidAuthToken && !isUserDataLoaded
    }

    if (userDataNotLoaded) {
        yield put(requestUser())
        yield take([RECEIVE_USER, FAILED_RECEIVE_USER, SKIP_FETCH_USER])
    }

    // Only load scene data if we have a valid auth token (or are done trying to load user data/auth).
    // This prevents a race condition where we receive the auth token while the scene is loading.

    const scenesById: Record<string, Scene> = yield select(getScenesById)

    const selectedSceneData = scenesById[selectedSceneId] || null
    const forceLegacyManifest: boolean = yield select(getForceLegacyManifest)

    if (!selectedSceneData) {
        yield put(requestScene(selectedSceneId, forceLegacyManifest))
    } else {
        // scene data already there, so set preview scene loaded state
        yield put(sceneLoaded({ hasLoaded: true, errorType: null }))

        // Update debug settings based on the scene
        const debugSettings: DebugSettings = yield select(getDebugSettings)
        const previewSettings: PreviewSettings = yield select(getPreviewSettings)
        yield put(
            updateDebugSettings({
                ...debugSettings,
                ...getSceneDependentInitialDebugSettings(previewSettings, selectedSceneData),
            }),
        )
    }

    // Pre-uuid compatability block {
    const isLegacySceneId = !Number.isNaN(Number(selectedSceneId)) // Legacy int id
    // //  If we're using the legacy id
    if (isLegacySceneId) {
        const {
            payload: { scene },
        } = yield take(RECEIVE_SCENE)
        // Redirect to the UUID (default composition, scene)
        if (scene.sceneId.toString() === selectedSceneId && scene.uuid) {
            yield put(openScene(scene.uuid))
        }
    }
    // } end compatability block
}

type SceneReceiveAction = {
    type: typeof RECEIVE_SCENE
    payload: {
        scene: Scene
    }
}

export function* sceneLoadedSaga(action: SceneReceiveAction) {
    const {
        payload: { scene },
    } = action
    yield put(sceneLoaded({ hasLoaded: true, errorType: null }))
    if (scene) {
        const debugSettings: DebugSettings = yield select(getDebugSettings)
        const previewSettings: PreviewSettings = yield select(getPreviewSettings)
        yield put(
            updateDebugSettings({
                ...debugSettings,
                ...getSceneDependentInitialDebugSettings(previewSettings, scene),
            }),
        )
    }
}

type RequestSceneAction = {
    type: typeof REQUEST_SCENE_SAGA
    payload: {
        id: string | number
        forceLegacyManifest: boolean
    }
}

export function* fetchSceneSaga(action: RequestSceneAction): SagaIterator {
    const {
        payload: { id, forceLegacyManifest },
    } = action
    try {
        const { data } = yield call(scenesApi.getScene, id, forceLegacyManifest)
        const validatedManifest = checkManifest(data)

        // Patch the scene data with the cached assets if any.
        const cachedEquirectangular = yield call(consumeCachedSceneAsset, ASSETS_CACHE_ENVMAP_KEY)
        if (cachedEquirectangular && cachedEquirectangular.uuid === id && !sceneHasGeneratedEnvmap(data)) {
            const assetUri = URL.createObjectURL(cachedEquirectangular.asset)
            patchSceneUsingCachedAsset(data, ASSETS_CACHE_ENVMAP_KEY, assetUri)
        }

        if (validatedManifest) {
            yield put(receiveScene(data))
        } else {
            yield put(failedReceiveScene(PreviewError.INVALID_MANIFEST))
        }
    } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
            const responseStatus = e?.response?.status
            if (responseStatus && responseStatus >= 400 && responseStatus < 500) {
                yield put(failedReceiveScene(PreviewError.USER_NOT_ALLOWED))
            } else {
                yield put(failedReceiveScene(PreviewError.SERVER_ERROR))
            }
        } else {
            yield put(failedReceiveScene(PreviewError.SERVER_ERROR))
        }
    }
}

type FailedReceiveSceneAction = {
    type: typeof FAILED_RECEIVE_SCENE
    payload: {
        errorType: PreviewError
    }
}

export function* failedSceneLoadedSaga(action: FailedReceiveSceneAction) {
    yield put(sceneLoaded({ hasLoaded: true, errorType: action.payload.errorType }))
}

type OpenSceneAction = {
    type: typeof OPEN_SCENE_SAGA
    payload: {
        id: string
        trackingInfo?: OpenCompositionTrackingType
        extra?: Record<string, string | null | undefined>
    }
}

export function* openSceneSaga(action: OpenSceneAction) {
    const {
        payload: { id, trackingInfo, extra },
    } = action
    yield put(selectScene(id))
    yield put(openComposition(NEW_COMPOSITION_ID, trackingInfo, extra))
}

type CreateRoomPlannerSceneAction = {
    type: typeof createRoomPlannerScene.type
    payload: {
        name: string
        gltf: GLTf
        envmap: Blob | null
    }
}

export function* createRoomPlannerSceneSaga({ payload: { name, gltf, envmap } }: CreateRoomPlannerSceneAction) {
    const roomType = BEDROOM
    yield put(requestSaveScene(name, roomType, gltf))
    const envmapUUID: string | null = yield call(envmapsApi.uploadEnvmap, envmap)
    try {
        const { data } = yield call(scenesApi.createRoomBuilderScene, name, roomType, gltf, envmapUUID)

        // The createRoomBuilderScene call returns the uploaded gltfManifest as is, ignoring the patched
        // envmap URI that was just uploaded, so as a workaround it also returns the envmap URI.
        // So we patch the returned envmap URI into the uploaded scene's gltf manifest.
        // If not available; the envmap will be cached locally to be consumed after the navigation.
        const gltfCustomEnvmap = data.gltfManifest?.extras?.geomagical?.geomagicalScenes[0]?.environmentMapCustomImage
        if (data.environmentMapCustomImage && gltfCustomEnvmap) {
            gltfCustomEnvmap.uri = data.environmentMapCustomImage
        } else if (envmap) {
            yield call(cacheSceneAsset, ASSETS_CACHE_ENVMAP_KEY, { uuid: data.uuid, asset: envmap })
        }

        yield put(receiveSaveScene(data, true))
    } catch (error) {
        yield call(Sentry.captureException, error)
        yield put(failedSaveScene(error))

        // Graceful degradation in case of scene save api getting an error:
        // We will redirect the user to the /room/#1/-1 url and allow them to design.
        // When they save the composition, the scene will get saved.

        const localScene: Scene = {
            name,
            sceneId: NEW_SCENE_ID,
            isStock: false,
            compositionCount: 0,
            creationDate: '',
            defaultX: 0,
            defaultY: 0,
            hasFloor: true,
            hasWall: true,
            hasWallPaint: false, // TODO Should be true?
            jobId: '',
            jobState: null,
            state: 'Success',
            status: 200,
            lastModifiedDate: '',
            createdAt: '',
            roomType: BEDROOM,
            supportsDepthOcclusion: false, // TODO These 4 supports* are unused, will remove later
            supportsForegroundOcclusion: false,
            supportsOcclusion: false,
            supportsShadows: false,
            thumbUrl: '', // TODO What should we use here?
            wid: -1, // TODO Does anything need to change to support -1 here?
            sourceType: SOURCETYPE_ROOMBUILDER,
            adminUrl: null,
            adminCaptureVideoUrl: null,
            viewports: [], // TODO How do we define viewports?
            staticStackingSurfacesCount: 0,
            manifest: null,
            gltfBaseUrl: '',
            gltfManifest: gltf,
        }

        const extra: Record<string, string> = {}
        const subCatalog: string | null = yield select(getSubCatalog)
        if (subCatalog) {
            extra.subCatalog = subCatalog
        }

        yield put(storeScene(localScene))
        yield put(openScene(localScene.sceneId, undefined, extra))
    }
}

type SaveSceneAction = {
    type: typeof RECEIVE_SAVE_SCENE
    payload: {
        scene: APIScene
        autoOpen: boolean
    }
}

export function* openSavedSceneSaga({ payload: { scene, autoOpen } }: SaveSceneAction) {
    yield put(receiveScene(scene))

    const extra: Record<string, string> = {}
    const subCatalog: string | null = yield select(getSubCatalog)
    if (subCatalog) {
        extra.subCatalog = subCatalog
    }
    if (autoOpen) {
        yield put(openScene(scene.uuid, undefined, extra))
    }
}

// Watcher functions
function* watchDeletedScene() {
    yield takeEvery(RECEIVE_DELETE_SCENE, deletedSceneSaga)
}

function* watchSelectScene() {
    yield takeLatest(SELECT_SCENE, selectSceneSaga)
}

function* watchReceiveScene() {
    yield takeLatest(RECEIVE_SCENE, sceneLoadedSaga)
}

function* watchFailedReceiveScene() {
    yield takeLatest(FAILED_RECEIVE_SCENE, failedSceneLoadedSaga)
}

function* watchRequestScene() {
    yield takeLatest(REQUEST_SCENE_SAGA, fetchSceneSaga)
}

function* watchOpenScene() {
    yield takeLatest(OPEN_SCENE_SAGA, openSceneSaga)
}

function* watchCreateRoomPlannerScene() {
    yield takeEvery(createRoomPlannerScene.type, createRoomPlannerSceneSaga)
}

function* watchSaveScene() {
    yield takeEvery(RECEIVE_SAVE_SCENE, openSavedSceneSaga)
}

export const scenesSagas = [
    watchDeletedScene(),
    watchSelectScene(),
    watchReceiveScene(),
    watchFailedReceiveScene(),
    watchRequestScene(),
    watchOpenScene(),
    watchCreateRoomPlannerScene(),
    watchSaveScene(),
]
