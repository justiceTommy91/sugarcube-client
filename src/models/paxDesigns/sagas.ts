import { call, delay, put, takeEvery, takeLatest } from 'redux-saga/effects'
import { fetchPAXDesigns } from 'services/pax'
import toastsService, { ToastType } from 'services/toasts'
import * as tracker from 'utils/tracker'
import { PAX_DESIGNS_ACTION_TYPES, PAX_IMPORT_ACTION_TYPES } from './constants'
import { receivedPAXDesigns, failedPAXDesigns, failPAXImport } from './actions'
import type { PAXDesign } from './types'

const PAX_IMPORT_SLOW_THRESHOLD_MS = 5000
// TODO(WEBFS-1046): replace this mock saga with real REX API call
const PAX_IMPORT_MOCK_DURATION_MS = 8000

function* fetchPAXDesignsSaga() {
    try {
        const response: { data: { results: PAXDesign[] } } = yield call(fetchPAXDesigns)
        yield put(receivedPAXDesigns(response.data.results))
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch PAX designs'
        yield put(failedPAXDesigns(errorMessage))
        yield call(tracker.error, 'DecorateRoom.PAXImport.FailedToFetchDesigns', { error: errorMessage })
    }
}

function* importPAXDesignSaga() {
    // TODO(WEBFS-1046): replace delay + throw with real REX API call; remove the throw
    yield delay(PAX_IMPORT_MOCK_DURATION_MS)
    yield put(failPAXImport('mock'))
    yield call(toastsService.showToast, { toastType: ToastType.PAX_IMPORT_FAILED })
}

function* watchRequestPAXDesigns() {
    yield takeEvery(PAX_DESIGNS_ACTION_TYPES.REQUEST_PAX_DESIGNS, fetchPAXDesignsSaga)
}

function* watchRequestPAXImport() {
    yield takeLatest(PAX_IMPORT_ACTION_TYPES.REQUEST_PAX_IMPORT, importPAXDesignSaga)
}

export const paxDesignsSagas = [watchRequestPAXDesigns(), watchRequestPAXImport()]
export { PAX_IMPORT_SLOW_THRESHOLD_MS }
