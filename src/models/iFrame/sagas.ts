import { navigate } from 'gatsby'
import { OPEN_DESIGN_LAB } from 'models/actionTypes'
import { getIsIFrame } from 'models/location/selectors'
import { call, takeLatest } from 'redux-saga/effects'
import { messageParent } from 'utils/iframe'
import { navigateBack } from './actions'

function* openDesignLab() {
    const isInIframe: boolean = yield call(getIsIFrame)
    if (isInIframe) {
        yield call(messageParent, navigateBack())
    } else {
        yield call<(path: string) => void>(navigate, '/')
    }
}

function* watchOpenDesignLab() {
    yield takeLatest(OPEN_DESIGN_LAB, openDesignLab)
}

export const iFrameSagas = [watchOpenDesignLab()]
