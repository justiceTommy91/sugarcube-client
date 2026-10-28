import { takeEvery, call, put } from 'redux-saga/effects'
import { getStatus } from 'services/support'
import * as Sentry from '@sentry/react'
import { receiveStatus, failedReceiveStatus } from './slice'
import { requestStatus } from './actions'

export function* requestStatusSaga() {
    try {
        const { data } = yield call(getStatus)
        yield put(receiveStatus(data))
    } catch (error) {
        yield put(failedReceiveStatus())
        Sentry.captureException(error)
    }
}

export function* watchRequestStatus() {
    yield takeEvery(requestStatus.type, requestStatusSaga)
}

export const supportSagas = [watchRequestStatus()]
