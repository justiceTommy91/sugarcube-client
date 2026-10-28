import { takeEvery, all, call, put, select } from 'redux-saga/effects'
import * as Sentry from '@sentry/react'
import { navigate } from 'gatsby'

import * as plannerApi from 'services/planner'
import {
    getIsRoomBuilderEditor,
    getSelectedTemplateUuid,
    getSelectedMaterialUuid,
    getMaterials as getReadyMaterials,
    getDoors as getReadyDoors,
    getWindows as getReadyWindows,
    getAssets as getReadyAssets,
    getTemplates as getReadyTemplates,
} from 'models/planner/selectors'
import type { TemplateAssetInfo } from 'Planner/api_types'
import * as envmapsApi from 'services/envmapUpload'
import {
    requestSaveScene,
    receiveSaveScene,
    failedSaveScene,
    openScene,
    storeScene,
    selectScene,
} from 'models/scenes/actions'
import { saveEditedRoom, storeEditedRoomLocally, cancelRoomEditing } from 'models/planner/actions'
import { loadCompositionFromLocalStorage } from 'models/localStorage/actions'
import { requestSaveComposition, receiveSaveComposition, openComposition } from 'models/compositions/actions'
import { getSelectedCompositionData, getSelectedScene } from 'models/compositions/selectors'
import { getRoomBuilderEditorInfo } from 'models/ui/selectors'
import { getIsLoggedIn } from 'models/user/selectors'

import { NEW_SCENE_ID, SOURCETYPE_ROOMBUILDER, BEDROOM, ASSETS_CACHE_ENVMAP_KEY } from 'models/scenes/constants'
import * as scenesApi from 'services/scenes'
import * as compositionsApi from 'services/compositions'
import { GLTf } from 'Renderer/gltf/gltf'
import type { CompositionSaveData, CompositionSaveTrackingInfo } from 'models/compositions'
import { NEW_COMPOSITION_ID } from 'models/compositions/constants'
import { TRACK_LOCATION_NOT_SET } from 'models/tracking/constants'
import { STORED_COMPOSITION_LABEL } from 'models/localStorage/constants'
import type { RoomBuilderEditorState } from 'services/uiState'
import type { Scene } from 'models/scenes'
import { cacheSceneAsset } from 'services/idbService'

import {
    resolvedData,
    failedResolveData,
    receiveTemplates,
    failedReceiveTemplates,
    receiveMaterials,
    failedReceiveMaterials,
    receiveDoors,
    failedReceiveDoors,
    receiveWindows,
    failedReceiveWindows,
    setSelectedTemplateUuid,
    setSelectedMaterialUuid,
    receiveAssets,
    failedReceiveAssets,
} from './slice'
import {
    JsonTemplate,
    TemplateState,
    MaterialDescription,
    DoorAndWindowDescription,
    MaterialsState,
    DoorsState,
    WindowsState,
    Asset,
    AssetState,
    JsonTemplateResolvedAssets,
} from './index'

export function* getTemplates() {
    try {
        const { data } = yield call(plannerApi.getRoomTemplates)
        if (data && data.length) {
            const templates = data.reduce(
                (acc: TemplateState, curr: JsonTemplate) => ({
                    ...acc,
                    [curr.uuid]: curr,
                }),
                {},
            )
            yield put(receiveTemplates(templates))
        } else {
            yield put(failedReceiveTemplates())
        }
    } catch (error) {
        yield put(failedReceiveTemplates())
    }
}

export function* getMaterials() {
    try {
        const {
            data: { roomAssets },
        } = yield call(plannerApi.getMaterials)
        if (roomAssets?.length) {
            const materials = roomAssets.reduce(
                (acc: MaterialsState, curr: MaterialDescription) => ({
                    ...acc,
                    [curr.uuid]: curr,
                }),
                {},
            )
            yield put(receiveMaterials(materials))
            const selectedMaterialUuid: string = yield select(getSelectedMaterialUuid)
            // if no material is selected, select the first one
            if (!selectedMaterialUuid) {
                yield put(setSelectedMaterialUuid(roomAssets[0].uuid))
            }
        } else {
            yield put(failedReceiveMaterials())
        }
    } catch (error) {
        yield put(failedReceiveMaterials())
    }
}

export function* getDoors() {
    try {
        const {
            data: { roomAssets },
        } = yield call(plannerApi.getDoors)
        if (roomAssets?.length) {
            const doors = roomAssets.reduce(
                (acc: DoorsState, curr: DoorAndWindowDescription) => ({
                    ...acc,
                    [curr.uuid]: curr,
                }),
                {},
            )
            yield put(receiveDoors(doors))
        } else {
            yield put(failedReceiveDoors())
        }
    } catch (error) {
        yield put(failedReceiveDoors())
    }
}

export function* getWindows() {
    try {
        const {
            data: { roomAssets },
        } = yield call(plannerApi.getWindows)
        if (roomAssets?.length) {
            const windows = roomAssets.reduce(
                (acc: WindowsState, curr: DoorAndWindowDescription) => ({
                    ...acc,
                    [curr.uuid]: curr,
                }),
                {},
            )
            yield put(receiveWindows(windows))
        } else {
            yield put(failedReceiveWindows())
        }
    } catch (error) {
        yield put(failedReceiveWindows())
    }
}

export function* getAssets() {
    try {
        const { data } = yield call(plannerApi.getRoomAssets)
        if (data?.length) {
            const assets = data.reduce(
                (acc: AssetState, curr: Asset) => ({
                    ...acc,
                    [curr.uuid]: curr,
                }),
                {},
            )
            yield put(receiveAssets(assets))
        } else {
            yield put(failedReceiveAssets())
        }
    } catch (error) {
        yield put(failedReceiveAssets())
    }
}

function resolveTemplateAssets(template: JsonTemplate, materials: MaterialDescription[], assets: Asset[]) {
    const result: TemplateAssetInfo[] = []
    template.data.assets.forEach((templateAsset) => {
        const resolvedAsset =
            materials.find((m) => m.uuid === templateAsset.uuid) || assets.find((m) => m.uuid === templateAsset.uuid)
        if (resolvedAsset?.data) {
            result.push({
                ...templateAsset,
                asset: {
                    data: resolvedAsset.data,
                    baseUrl: resolvedAsset.baseUrl,
                },
            })
        }
    })
    return result
}

export function* getAllData() {
    try {
        yield all([call(getMaterials), call(getDoors), call(getWindows), call(getAssets), call(getTemplates)])
        const materials: MaterialDescription[] = Object.values(yield select(getReadyMaterials))
        const doors: Asset[] = Object.values(yield select(getReadyDoors))
        const windows: Asset[] = Object.values(yield select(getReadyWindows))
        const assets: Asset[] = Object.values(yield select(getReadyAssets))
        const templates: JsonTemplate[] = Object.values(yield select(getReadyTemplates))

        const resolvedAssets: JsonTemplateResolvedAssets[] = []
        templates.forEach((template) => {
            resolvedAssets.push({
                templateUuid: template.uuid,
                assets: resolveTemplateAssets(template, materials, [...doors, ...windows, ...assets]),
            })
        })
        yield put(resolvedData(resolvedAssets))
        const selectedTemplateUuid: string = yield select(getSelectedTemplateUuid)
        const isRoomBuilderEditor: boolean = yield select(getIsRoomBuilderEditor)
        // if no template is selected, select the first one
        if (!selectedTemplateUuid && !isRoomBuilderEditor) {
            yield put(setSelectedTemplateUuid(templates[0].uuid))
        }
    } catch (error) {
        yield put(failedResolveData())
    }
}

export function* watchRequestAllData() {
    yield takeEvery('planner/requestAllData', getAllData)
}

type SaveEditedRoomAction = {
    type: typeof saveEditedRoom.type
    payload: {
        sceneId: string
        name: string
        gltf: GLTf
        composition: CompositionSaveData
        envmap?: Blob | null
    }
}

type StoreEditedRoomLocallyAction = {
    type: typeof storeEditedRoomLocally.type
    payload: {
        name: string
        gltf: GLTf
        composition?: CompositionSaveData
    }
}

function* storeEditedCompositionLocally(composition: CompositionSaveData, sceneId?: string) {
    const compositionToSave: CompositionSaveData = { ...composition, sceneId: sceneId ?? NEW_SCENE_ID }
    const trackingInfo: CompositionSaveTrackingInfo = { SavedFrom: TRACK_LOCATION_NOT_SET }
    const compToStore = {
        ...compositionToSave,
        isStock: composition.isStock,
        trackingInfo,
    }
    window.localStorage.setItem(STORED_COMPOSITION_LABEL, JSON.stringify(compToStore))
    yield put(loadCompositionFromLocalStorage())
    yield put(
        openComposition(compositionToSave.compositionId, undefined, undefined, {
            preserveCurrentCompositionState: true,
        }),
    )
}

export function* saveEditedRoomSaga({ payload: { sceneId, name, gltf, composition, envmap } }: SaveEditedRoomAction) {
    const roomType = BEDROOM
    yield put(requestSaveScene(name, roomType, gltf))
    try {
        const { isStock: isSceneStock } = yield select(getSelectedScene)
        const { isStock: isCompositionStock } = yield select(getSelectedCompositionData)
        const isLoggedIn: boolean = yield select(getIsLoggedIn)

        // Before saving the scene, we always save the composition, to make sure the backend knows exactly how many
        // compositions are associated with the scene and whether to update the existing scene, or create a new one.
        // For a stock scene we don't need to do this since the backend always creates a new scene.
        const trackingInfo: CompositionSaveTrackingInfo = { SavedFrom: TRACK_LOCATION_NOT_SET }
        let compositionId = composition.compositionId
        if (isLoggedIn && !isSceneStock) {
            const compositionToSave: CompositionSaveData = { ...composition }
            yield put(requestSaveComposition(compositionToSave, trackingInfo))
            const { data: newCompositionData } =
                compositionId === NEW_COMPOSITION_ID
                    ? yield call(compositionsApi.createComposition, compositionToSave)
                    : yield call(compositionsApi.saveComposition, compositionToSave)
            window.localStorage.removeItem(STORED_COMPOSITION_LABEL)
            yield put(
                receiveSaveComposition(newCompositionData, true, true, newCompositionData.compositionId, trackingInfo),
            )
            compositionId = newCompositionData.uuid
        }

        const envmapUUID: string | null = yield call(envmapsApi.uploadEnvmap, envmap)
        const { data } = yield call(
            scenesApi.saveRoomBuilderScene,
            sceneId,
            name,
            roomType,
            gltf,
            envmapUUID,
            !isLoggedIn,
        )

        // The saveRoomBuilderScene call returns the uploaded gltfManifest as is, ignoring the patched
        // envmap URI that was just uploaded, so as a workaround it also returns the envmap URI.
        // So we patch the returned envmap URI into the uploaded scene's gltf manifest.
        // If not available; the envmap will be cached locally to be consumed after the navigation.
        const gltfCustomEnvmap = data.gltfManifest?.extras?.geomagical?.geomagicalScenes[0]?.environmentMapCustomImage
        if (data.environmentMapCustomImage && gltfCustomEnvmap) {
            gltfCustomEnvmap.uri = data.environmentMapCustomImage
        } else if (envmap) {
            yield call(cacheSceneAsset, ASSETS_CACHE_ENVMAP_KEY, { uuid: data.uuid, asset: envmap })
        }

        // Save scene may create a new scene or override existing one.
        const savedSceneId = data.uuid as string
        if (isLoggedIn) {
            yield put(receiveSaveScene(data, false))
            // If new scene was created, we need to save the composition again
            // in order to associate it with the new scene.
            if (savedSceneId !== sceneId) {
                const compositionToSave: CompositionSaveData = { ...composition, compositionId, sceneId: savedSceneId }
                yield put(requestSaveComposition(compositionToSave, trackingInfo))
                const { data: newCompositionData } = isCompositionStock
                    ? yield call(compositionsApi.createComposition, compositionToSave)
                    : yield call(compositionsApi.saveComposition, compositionToSave)
                window.localStorage.removeItem(STORED_COMPOSITION_LABEL)
                yield put(
                    receiveSaveComposition(
                        newCompositionData,
                        true,
                        true,
                        newCompositionData.compositionId,
                        trackingInfo,
                    ),
                )
                compositionId = newCompositionData.uuid
            }
            yield put(openComposition(compositionId, undefined, undefined, { preserveCurrentCompositionState: true }))
        } else {
            // When not logged in we store edited composition to local storage
            yield put(receiveSaveScene(data, false))
            yield storeEditedCompositionLocally(composition, savedSceneId)
        }
    } catch (error) {
        yield put(failedSaveScene(error))
    }
}

export function* storeEditedRoomLocallySaga({ payload: { name, gltf, composition } }: StoreEditedRoomLocallyAction) {
    try {
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
            hasWallPaint: true,
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

        yield put(storeScene(localScene))
        yield put(selectScene(localScene.sceneId))

        if (composition) {
            yield storeEditedCompositionLocally(composition)
        }
    } catch (error) {
        yield call(Sentry.captureException, error)
    }
}

export function* cancelRoomEditingSaga() {
    const roomBuilderEditorInfo: RoomBuilderEditorState = yield select(getRoomBuilderEditorInfo)
    const compositionId = roomBuilderEditorInfo?.compositionId
    const sceneId = roomBuilderEditorInfo?.sceneId
    if (compositionId) {
        yield put(loadCompositionFromLocalStorage())
        yield put(openComposition(compositionId, undefined, undefined, { preserveCurrentCompositionState: true }))
    } else if (sceneId) {
        yield put(openScene(sceneId))
    } else {
        yield call<(path: string) => void>(navigate, '/dashboard')
    }
}

export function* watchSaveEditedRoom() {
    yield takeEvery(saveEditedRoom.type, saveEditedRoomSaga)
}

export function* watchStoreEditedRoomLocally() {
    yield takeEvery(storeEditedRoomLocally.type, storeEditedRoomLocallySaga)
}

export function* watchCancelRoomEditing() {
    yield takeEvery(cancelRoomEditing.type, cancelRoomEditingSaga)
}

export const plannerSagas = [
    watchRequestAllData(),
    watchSaveEditedRoom(),
    watchStoreEditedRoomLocally(),
    watchCancelRoomEditing(),
]
