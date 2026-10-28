import { takeEvery, select, call, put } from 'redux-saga/effects'
import {
    FAILED_RECEIVE_SCENE,
    FAILED_RECEIVE_COMPILED_COMPOSITION,
    FAILED_RECEIVE_COMPOSITIONS,
    RENDERER_READY,
    FIRST_RENDER,
    RECEIVE_FURNITURE,
    RENDER_ITEM_LOADED,
    WEBGL_CONTEXT_TOO_MANY_LOSSES,
    INITIALIZATION_FAILURE,
    SHOW_DESIGN_SUMMARY,
} from 'models/actionTypes'
import { GeomViewer } from 'Renderer/geomviewer'
import { getIsLoggedIn } from 'models/user/selectors'
import { getRouteCompositionIds } from 'models/location/selectors'
import { getLowPerformanceCause, getHasRendered } from 'models/renderer/selectors'
import * as tracker from 'utils/tracker'
import { getInitialLoading, getPreviewSettings } from 'models/preview/selectors'
import { getSelectedCompositionId, getSelectedCompositionIsLoading } from 'models/compositions/selectors'
import { getFurnitureIsLoading } from 'models/furniture/selectors'
import { setInitialLoading, updatePreviewSettings } from 'models/preview/actions'
import { PreviewErrorTypeTracking } from './constants'

type PreviewErrorTracking = {
    RoomId: string
    DesignId: string
    ApiErrorCode: number | null
    ErrorType?: string
}

export type SceneCompositionLoadingAction = {
    type: typeof FAILED_RECEIVE_SCENE | typeof FAILED_RECEIVE_COMPILED_COMPOSITION | typeof FAILED_RECEIVE_COMPOSITIONS
    payload: {
        status: number | null
    }
}

type DisableMagicEraserOnSummaryToggleSagaAction = {
    type: typeof SHOW_DESIGN_SUMMARY
    showDesignSummary: boolean
}

function handleErrorType(responseStatus: number | null, isLoggedIn: boolean): PreviewErrorTypeTracking {
    return isLoggedIn && responseStatus && responseStatus >= 400 && responseStatus < 500
        ? PreviewErrorTypeTracking.UserNotAllowed
        : PreviewErrorTypeTracking.ServerError
}

function* trackRoomLoadError(eventName: string, trackingInfo: Partial<PreviewErrorTracking>) {
    yield call(tracker.track, eventName, trackingInfo)
}

export function* requestSceneCompositionLoadingErrorSaga(action: SceneCompositionLoadingAction) {
    const { sceneId, compositionId } = yield select(getRouteCompositionIds)
    const isLoggedIn: boolean = yield select(getIsLoggedIn)

    const errorType: PreviewErrorTypeTracking = yield call(handleErrorType, action.payload.status, isLoggedIn)
    let eventName = 'DecorateRoom.RoomLoadError'

    const trackingInfo: PreviewErrorTracking = {
        RoomId: sceneId,
        DesignId: compositionId,
        ApiErrorCode: action?.payload?.status,
        ErrorType: errorType,
    }

    if (!isLoggedIn) {
        eventName = 'DecorateRoom.UserNotLoggedIn'
        delete trackingInfo.ErrorType
    }

    yield call(trackRoomLoadError, eventName, trackingInfo)
}

export function* getPreviewPerformanceErrorSaga() {
    const { sceneId, compositionId } = yield select(getRouteCompositionIds)
    const lowPerformanceCause: string = yield select(getLowPerformanceCause)
    let trackingPerformanceErrorType

    if (lowPerformanceCause) {
        if (lowPerformanceCause === 'low-graphics-memory') {
            trackingPerformanceErrorType = PreviewErrorTypeTracking.LowGraphicsMemory
        }
        if (lowPerformanceCause === 'low-performance-device') {
            trackingPerformanceErrorType = PreviewErrorTypeTracking.LowPerformanceDevice
        }
        if (lowPerformanceCause === 'too-many-context-losses') {
            trackingPerformanceErrorType = PreviewErrorTypeTracking.TooManyContextLosses
        }
    }

    const trackingInfo: Omit<PreviewErrorTracking, 'ApiErrorCode'> = {
        RoomId: sceneId,
        DesignId: compositionId,
        ErrorType: trackingPerformanceErrorType,
    }

    if (trackingPerformanceErrorType) {
        yield call(trackRoomLoadError, 'DecorateRoom.RoomLoadError', trackingInfo)
    }
}

function* checkInitialLoadingStates() {
    const hasRendered: boolean = yield select(getHasRendered)
    const isCompositionLoading: boolean = yield select(getSelectedCompositionIsLoading)
    const isFurnitureLoading: boolean = yield select(getFurnitureIsLoading)
    const isInitialLoading: boolean = yield select(getInitialLoading)
    const selectedCompositionId: string = yield select(getSelectedCompositionId)

    if (isInitialLoading && hasRendered && !isCompositionLoading && !isFurnitureLoading) {
        GeomViewer.bindings?.signalCompositionLoadingEnd()
        yield put(setInitialLoading(false, selectedCompositionId))
    }
}

function* watchInitialLoadingStates() {
    yield takeEvery([RENDERER_READY, FIRST_RENDER, RECEIVE_FURNITURE, RENDER_ITEM_LOADED], checkInitialLoadingStates)
}

function* watchRequestSceneCompositionErrors() {
    yield takeEvery(
        [FAILED_RECEIVE_SCENE, FAILED_RECEIVE_COMPILED_COMPOSITION, FAILED_RECEIVE_COMPOSITIONS],
        requestSceneCompositionLoadingErrorSaga,
    )
}

function* watchPreviewPerfomanceErrors() {
    yield takeEvery(
        [RENDERER_READY, WEBGL_CONTEXT_TOO_MANY_LOSSES, INITIALIZATION_FAILURE],
        getPreviewPerformanceErrorSaga,
    )
}

export function* disableMagicEraserOnSummaryToggleSaga(action: DisableMagicEraserOnSummaryToggleSagaAction) {
    if (!action.showDesignSummary) return

    const { onOffOptions } = yield select(getPreviewSettings)
    if (onOffOptions.magicEraserMode) {
        yield put(updatePreviewSettings({ magicEraserMode: false }))
    }
}

function* watchShowDesignSummary() {
    yield takeEvery(SHOW_DESIGN_SUMMARY, disableMagicEraserOnSummaryToggleSaga)
}

export const previewSagas = [
    watchRequestSceneCompositionErrors(),
    watchPreviewPerfomanceErrors(),
    watchInitialLoadingStates(),
    watchShowDesignSummary(),
]
