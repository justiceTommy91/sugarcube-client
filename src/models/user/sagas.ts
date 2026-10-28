import { takeLatest, put, call, delay } from 'redux-saga/effects'
import type { SagaIterator } from 'redux-saga'
import { getUser, type UserInfo } from 'services/user'
import { receiveUser, failedToReceiveUser, requestUser, skipFetchUser } from 'models/user/actions'
import {
    HANDLE_MATERIALIZED_USER_SAGA,
    REQUEST_USER_SAGA,
    RECEIVE_IKEA_TOKENS,
    REQUEST_KREATIV_LITE_MERGE_RETRY_SAGA,
    RESOLVE_KREATIV_LITE_GUEST_RETURN,
} from 'models/actionTypes'
import { updateDebugSettings } from 'models/admin/actions'
import { requestFavorites } from 'models/favorites/actions'
import { hydrateBeautifierUsage } from 'models/beautifier/slice'
import * as fetchApi from 'services'
import * as cartApi from 'services/spiderpigs'
import * as homeProjectsApi from 'services/homeProjects'
import { isProd } from 'utils/environment'
import type { IkeaTokensContainer } from 'models/tokens'
import {
    attemptKreativLiteMerge,
    consumeKreativLiteMergeReturn,
    MergeReturnResultType,
    type MergeReturnResult,
} from 'utils/kreativLiteGuestMerge'
import { activateMergedComposition } from 'models/compositions/sagas-typed'
import { selectScene } from 'models/scenes/actions'
import { getRouteCompositionIds, getUrlParams, usesDevAuth } from 'models/location/selectors'
import toastsService, { ToastType } from 'services/toasts'
import { isDesignPage } from 'utils/tracker'
import { isValidAuthToken } from './utils'

const KREATIV_LITE_GUEST_RETURN_TOKEN_TIMEOUT_MS = 10_000
let pendingKreativLiteGuestReturnSceneId: string | null = null
let activeKreativLiteGuestReturnSceneId: string | null = null

export function* receiveUserWithSideEffects(data: UserInfo): SagaIterator {
    yield put(receiveUser(data))
    yield put(hydrateBeautifierUsage(data.beautifierUses))
    if (data?.isStaff) {
        yield put(updateDebugSettings({ enableWalls: true }))
    }
}

export function* fetchUserSaga(): SagaIterator {
    try {
        const { data }: Awaited<ReturnType<typeof getUser>> = yield call(getUser)
        yield call(receiveUserWithSideEffects, data)
    } catch {
        yield put(failedToReceiveUser(true))
    }
}

type HandleMaterializedUserAction = {
    payload: {
        user: UserInfo
    }
    type: string
}

export function* handleMaterializedUserSaga(action: HandleMaterializedUserAction): SagaIterator {
    yield call(receiveUserWithSideEffects, action.payload.user)
}

type ReceiveIkeaTokensAction = {
    payload: {
        tokens: IkeaTokensContainer
    }
    type: string
}

// Reacts to a guest-save merge result. Activation / failure toasts only
// fire on the design page — anywhere else means the user logged in for an
// unrelated reason and the merge should stay invisible. Failure coverage
// (Sentry) lives inside consumeKreativLiteMergeReturn.
function* handleMergeResult(result: MergeReturnResult, returnSceneId?: string): SagaIterator {
    if (!isDesignPage()) return

    const { sceneId } = getRouteCompositionIds()
    const querySceneId = getUrlParams().sceneId?.toString()
    const currentSceneId = sceneId || querySceneId || returnSceneId || activeKreativLiteGuestReturnSceneId

    if (result.type === MergeReturnResultType.Success) {
        activeKreativLiteGuestReturnSceneId = null
        // Only activate (transfer ownership + open the saved composition) on the
        // exact scene that was guest-saved. Other scenes get the merge silently
        // — the composition just appears in their dashboard.
        if (currentSceneId === result.sceneId) {
            yield call(activateMergedComposition, result.compositionId)
        } else if (returnSceneId) {
            yield put(selectScene(returnSceneId))
        }
        return
    }

    if (result.type === MergeReturnResultType.PermanentFailure && currentSceneId) {
        activeKreativLiteGuestReturnSceneId = null
        // The page-boot gate suppressed selectScene; the gate is released now
        // that stashes are cleared, so load the scene to un-blank the canvas.
        yield put(selectScene(currentSceneId))
    }

    yield call(toastsService.showToast, {
        toastType: ToastType.KREATIV_LITE_MERGE_FAILED,
        canRetry: result.type === MergeReturnResultType.TransientFailure,
    })
}

export function* receiveIkeaTokensSaga(action: ReceiveIkeaTokensAction): SagaIterator {
    const tokens = usesDevAuth() ? {} : action.payload.tokens

    let hasAuthToken = false
    if (tokens.auth && isValidAuthToken(tokens.auth)) {
        hasAuthToken = true
        yield call(fetchApi.authenticate, tokens.auth.value, 'auth')
        yield call(cartApi.authenticate, tokens.auth.value)
        yield call(homeProjectsApi.authenticate, tokens.auth.value)
    } else if (tokens.guest && isValidAuthToken(tokens.guest)) {
        yield call(fetchApi.authenticate, tokens.guest.value, 'guest')
        yield call(cartApi.authenticate, tokens.guest.value)
        yield call(homeProjectsApi.authenticate, tokens.guest.value)
    }

    const pendingReturnSceneId = pendingKreativLiteGuestReturnSceneId
    pendingKreativLiteGuestReturnSceneId = null
    activeKreativLiteGuestReturnSceneId = pendingReturnSceneId
    const mergeResult = hasAuthToken ? yield call(consumeKreativLiteMergeReturn) : null

    if (isProd && !hasAuthToken) {
        yield put(skipFetchUser())
    } else {
        yield put(requestUser())
    }

    if (mergeResult !== null) {
        yield call(handleMergeResult, mergeResult, pendingReturnSceneId || undefined)
    } else if (pendingReturnSceneId && !hasAuthToken) {
        activeKreativLiteGuestReturnSceneId = null
        yield put(selectScene(pendingReturnSceneId))
    }

    yield put(requestFavorites())
}

type ResolveKreativLiteGuestReturnAction = {
    type: string
    payload: { sceneId: string }
}

export function* resolveKreativLiteGuestReturnSaga(action: ResolveKreativLiteGuestReturnAction): SagaIterator {
    const { sceneId } = action.payload
    pendingKreativLiteGuestReturnSceneId = sceneId

    yield delay(KREATIV_LITE_GUEST_RETURN_TOKEN_TIMEOUT_MS)
    if (pendingKreativLiteGuestReturnSceneId === sceneId) {
        pendingKreativLiteGuestReturnSceneId = null
        activeKreativLiteGuestReturnSceneId = null
        yield put(selectScene(sceneId))
    }
}

// Fired by the failure-toast retry button. Single attempt (no internal
// backoffs — the user is waiting), routed through the same handleMergeResult
// the auto-retry path uses so both paths converge.
export function* requestKreativLiteMergeRetrySaga(): SagaIterator {
    const result = yield call(attemptKreativLiteMerge)
    if (result !== null) {
        yield call(handleMergeResult, result)
    }
}

function* watchFetchUserSaga() {
    yield takeLatest(REQUEST_USER_SAGA, fetchUserSaga)
}

function* watchHandleMaterializedUserSaga() {
    yield takeLatest(HANDLE_MATERIALIZED_USER_SAGA, handleMaterializedUserSaga)
}

function* watchReceiveIkeaTokens() {
    yield takeLatest(RECEIVE_IKEA_TOKENS, receiveIkeaTokensSaga)
}

function* watchRequestKreativLiteMergeRetry() {
    yield takeLatest(REQUEST_KREATIV_LITE_MERGE_RETRY_SAGA, requestKreativLiteMergeRetrySaga)
}

function* watchResolveKreativLiteGuestReturn() {
    yield takeLatest(RESOLVE_KREATIV_LITE_GUEST_RETURN, resolveKreativLiteGuestReturnSaga)
}

export const userSagas = [
    watchFetchUserSaga(),
    watchHandleMaterializedUserSaga(),
    watchReceiveIkeaTokens(),
    watchRequestKreativLiteMergeRetry(),
    watchResolveKreativLiteGuestReturn(),
]
