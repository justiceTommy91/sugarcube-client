import { navigate } from 'gatsby'
import { call, delay, put, select, takeLatest } from 'redux-saga/effects'

import { CONTEXT_ROOM, CONTEXT_KREATIV_LITE } from 'constants/contexts'

import {
    LOAD_COMPOSITION_FROM_LOCAL_STORAGE,
    OPEN_COMPOSITION,
    REQUEST_LOGIN_PAGE,
    GO_TO_ROOM_EDITOR,
} from 'models/actionTypes'
import {
    saveSelectedCompositionToLocalStorage,
    saveCompositionToLocalStorageForEditor,
} from 'models/localStorage/actions'
import { showLoginPromptModal } from 'models/ui/actions'

import * as tracker from 'utils/tracker'

import { OpenCompositionAction } from 'models/compositions/types'
import { resetCompositionToLatestSavedState, selectComposition } from 'models/compositions/actions'
import { NEW_COMPOSITION_ID } from 'models/compositions/constants'
import { getSelectedSceneId } from 'models/scenes/selectors'
import { getCompositionsData, getSelectedComposition } from 'models/compositions/selectors'
import { buildRoomUrlWithParamsAndHash } from 'models/compositions/utils'

import type { Composition } from 'models/compositions'
import { hasPendingKreativLiteGuestSave } from 'utils/kreativLiteGuestMerge'
import { PARAM_RESUME, PARAM_OPEN_UPLOAD } from './constants'
import { makeLoginUrl, replaceUrlParams } from './helpers'
import { generateRoomLink, getIsIFrame, getIsLivingRoomContext, getRegion } from './selectors'

function* loadCompositionFromLocalStorage() {
    yield call(replaceUrlParams, (search) => {
        search.delete(PARAM_RESUME)
    })
}

type RequestLoginPagePayload = { isSignup: boolean; context: string }

function* requestLoginPage({ isSignup, context }: RequestLoginPagePayload) {
    yield call(tracker.click, `DecorateRoom.SignupLogin.${isSignup ? 'Signup' : 'Login'}`)
    const isLivingRoomIntegration: boolean = yield select(getIsLivingRoomContext)

    const isIframe: boolean = yield call(getIsIFrame)
    if (!isIframe) {
        // Suppress the CONTEXT_ROOM resume path when a Kreativ Lite guest save is
        // pending: that save already created a backend composition, and the
        // post-login flow will merge it (transferring ownership). The
        // resume + saveonfirstrender autosave on return would just re-save on top
        // of the merged composition — a redundant write we don't need.
        const shouldResume = context === CONTEXT_ROOM && !hasPendingKreativLiteGuestSave()
        const shouldOpenUpload = context === CONTEXT_KREATIV_LITE

        if (shouldResume) {
            // Add resume param to url that allows loading the composition from local storage.
            // If the user decides to not login and navigates with the back button,
            // the url will have the resume url param and will load the composition
            // from local storage so that the user can continue designing.
            yield call(replaceUrlParams, (search) => {
                search.set(PARAM_RESUME, 'true')
            })

            // Save changes locally
            // NOTE: isModified will be false after composition is stored in localStorage
            yield put(saveSelectedCompositionToLocalStorage())

            // We don't need to save the scene to local storage here
            // because the scene is saved locally as soon as it's exported
            // from the room builder.
        }

        if (shouldOpenUpload) {
            // Add openUpload param to url so that the upload modal will be auto-opened after login
            yield call(replaceUrlParams, (search) => {
                search.set(PARAM_OPEN_UPLOAD, 'true')
            })
        }

        const currentUrl = new URL(window.location.toString())
        const region: string = yield call(getRegion)

        const loginUrl: string = yield call(
            makeLoginUrl,
            currentUrl.toString(),
            region,
            isSignup,
            shouldResume,
            isLivingRoomIntegration,
        )
        // KLUDGE: Simplest workaround to ensure React and Redux state are in sync by pausing the saga for one event loop cycle,
        // giving React enough time to process the state update and re-render the UI with the new isModified value in the window eventListeners
        yield delay(0)
        yield call([window.location, window.location.assign], loginUrl)
    }
    yield put(showLoginPromptModal(false))
}

export function* openComposition({
    payload: {
        compositionId,
        extra,
        isAlreadyOnDesignPage,
        replaceCurrentHistoryEntry,
        preserveCurrentCompositionState,
    },
}: OpenCompositionAction) {
    if (!isAlreadyOnDesignPage && !preserveCurrentCompositionState) {
        // TODO 3D TRANSITION: Remove this block
        // Only reset the composition if we are going to navigate to the room page (from dash)
        // This way we don't discard 3d data that the viewer is depending on
        // There shouldn't be a dependency like this...but we're in the middle of refactors as we transition
        yield put(resetCompositionToLatestSavedState(compositionId))
    }

    let sceneId: string

    if (compositionId === NEW_COMPOSITION_ID) {
        sceneId = yield select(getSelectedSceneId)
    } else if (extra?.sceneId) {
        sceneId = extra.sceneId
    } else {
        const compositions: ReturnType<typeof getCompositionsData> = yield select(getCompositionsData)
        const comp = compositions.find((c) => c.id === compositionId)
        sceneId = comp?.sceneId ?? ''
    }

    const hasParams = !!extra?.subCatalog || !!extra?.productId || !!extra?.query || !!extra?.roomType

    // Unifying buildRoomUrlWithParamsAndHash method so we only need to handle URL params at one place
    const url = buildRoomUrlWithParamsAndHash({
        compositionId,
        sceneId,
        subCatalog: extra?.subCatalog,
        productId: extra?.productId,
        query: extra?.query,
        roomType: extra?.roomType,
    })

    if (hasParams) {
        // Still hard navigate to the design room so we can make rendered provider to get update URL params
        // And properly dispatch actions we want: placeProductId, updateFurnitureFilter, etc...
        window.location.assign(generateRoomLink(url))
    } else {
        // If there is no params just perform an usual Gatsby Navigate, no page refresh needed
        const shouldReplaceFreshSaveUrl = isAlreadyOnDesignPage && replaceCurrentHistoryEntry
        yield call<
            (path: string, options?: { replace: boolean; state?: { preserveCurrentCompositionState: boolean } }) => void
        >(
            navigate,
            url,
            shouldReplaceFreshSaveUrl ? { replace: true, state: { preserveCurrentCompositionState: true } } : undefined,
        )
    }
}

function* navigateToRoomEditor() {
    const composition: Composition = yield select(getSelectedComposition)
    if (composition) {
        yield put(selectComposition(composition.id))
        yield put(saveCompositionToLocalStorageForEditor())
    }
    const currentSearch = typeof window !== 'undefined' ? window.location.search : ''
    const roomEditorUrl = `/room-editor${currentSearch}`
    yield call<(path: string) => void>(navigate, roomEditorUrl)
}

function* watchLoadCompositionFromLocalStorage() {
    yield takeLatest(LOAD_COMPOSITION_FROM_LOCAL_STORAGE, loadCompositionFromLocalStorage)
}

function* watchRequestLoginPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yield takeLatest<any>(REQUEST_LOGIN_PAGE, requestLoginPage)
}

function* watchOpenComposition() {
    yield takeLatest(OPEN_COMPOSITION, openComposition)
}

function* watchGoToRoomEditor() {
    yield takeLatest(GO_TO_ROOM_EDITOR, navigateToRoomEditor)
}

export const locationSagas = [
    watchLoadCompositionFromLocalStorage(),
    watchRequestLoginPage(),
    watchOpenComposition(),
    watchGoToRoomEditor(),
]
