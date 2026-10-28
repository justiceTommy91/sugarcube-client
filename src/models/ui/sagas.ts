import {
    COMPLETE_ONBOARDING,
    DISMISS_DESIGN_SIDEPANEL_OVERLAY,
    FIRST_RENDER,
    RECEIVE_COMPILED_COMPOSITION,
    SCROLL_SWAP_MENU,
    SKIP_ONBOARDING,
} from 'models/actionTypes'
import { takeEvery, put, select, delay, call, takeLatest, take } from 'redux-saga/effects'
import * as compositionsActions from 'models/compositions/actions'
import { requestStarterSets } from 'models/starterSet/actions'
import { getSelectedCompositionData, getSelectedScene } from 'models/compositions/selectors'
import { getStarterSetAllRoomsData, getStarterSetHasError } from 'models/starterSet/selectors'
import { CompositionDataItem } from 'models/compositions'
import { waitForInitialLoadingComplete, waitPromise } from 'models/compositions/sagas'
import { SOURCETYPE_CAPTURED, SOURCETYPE_LITE_SCAN } from 'models/scenes/constants'
import { Scene } from 'models/scenes'
import { getChosenVariations } from 'models/experiments/selectors'
import { StarterSetByRoomType } from 'models/starterSet/types'
import { ChosenVariations } from 'services/experiments'
import { getDesignSidepanelMode, getDesignSidepanelOpen, getShouldShowOnboarding } from './selectors'
import { DESIGN_SIDEPANEL_MODE_SWAP_BROWSE, SWAP_TITLE } from './constants'
import { openDesignSidepanel, setDesignSidepanelMode, setStarterSetPopupVisible } from './actions'

export function* scrollSwapMenuSaga() {
    try {
        const isSidepanelOpen: boolean = yield select(getDesignSidepanelOpen)
        const sidepanelMode: string = yield select(getDesignSidepanelMode)
        const isSwapMode = sidepanelMode === DESIGN_SIDEPANEL_MODE_SWAP_BROWSE

        // if sidepanel is open and on the correct tab
        // there is no delay

        // if not on the correct tab, we are adding a delay to let the tab switch happen before scrolling
        if (!isSwapMode) {
            yield put(setDesignSidepanelMode(DESIGN_SIDEPANEL_MODE_SWAP_BROWSE))
            yield delay(400)
        }

        // if sidepanel is closed, we are adding a delay to let the sidepanel open before scrolling
        if (!isSidepanelOpen) {
            yield put(openDesignSidepanel())
            yield delay(500)
        }

        const topOfSwappablesElement = document.getElementById(SWAP_TITLE)
        topOfSwappablesElement?.scrollIntoView({ behavior: 'smooth' })
    } catch (error) {
        //
    }
}

export function* renderStarterSetPopup() {
    const variations: ChosenVariations = yield select(getChosenVariations)
    const isStarterSetsEnabled = variations.StarterSet === 'enabled'
    const getSceneIdData: Scene = yield select(getSelectedScene)
    const isKreativLiteScene = getSceneIdData.sourceType === SOURCETYPE_LITE_SCAN
    const isSingleCaptureScene = getSceneIdData.sourceType === SOURCETYPE_CAPTURED

    if (!isStarterSetsEnabled || isKreativLiteScene || isSingleCaptureScene) {
        return
    }
    yield call(waitForInitialLoadingComplete)
    const shouldShowOnboarding: boolean = yield select(getShouldShowOnboarding)

    if (shouldShowOnboarding) {
        yield take([COMPLETE_ONBOARDING, SKIP_ONBOARDING])
    }

    const compositionData: CompositionDataItem = yield select(getSelectedCompositionData)
    if (Object.values(compositionData?.renderItems).length === 0) {
        const hasRoomData = (yield select(getStarterSetAllRoomsData)) as StarterSetByRoomType

        if (Object.values(hasRoomData).length === 0) {
            yield put(requestStarterSets())
        }

        yield call(waitPromise, 10000)

        const hasRequestError: boolean = yield select(getStarterSetHasError)
        if (hasRequestError) {
            return
        }

        const currentCompositionData: CompositionDataItem = yield select(getSelectedCompositionData)
        const currentRenderItemsArray = currentCompositionData?.renderItems
            ? Object.values(currentCompositionData.renderItems)
            : []

        if (currentRenderItemsArray.length === 0) {
            yield put(setStarterSetPopupVisible(true))
        }
    }
}

export function* watchScrollSwapMenu() {
    yield takeEvery(SCROLL_SWAP_MENU, scrollSwapMenuSaga)
}

// KLUDGE: Deselect furniture when dismissing the sidepanel overlay. This is a workaround for a bug where the
//         furniture is not deselected when clicking on the dismiss button on sidepanel overlays.
function* dismissDesignSidepanelOverlaySaga() {
    yield put(compositionsActions.selectCompositionRenderItem(-1))
}

function* watchDismissDesignSidepanelOverlay() {
    yield takeEvery(DISMISS_DESIGN_SIDEPANEL_OVERLAY, dismissDesignSidepanelOverlaySaga)
}

function* watchForEnablingStarterSetPopup() {
    // use array for takeLatest to support new room builder
    yield takeLatest([RECEIVE_COMPILED_COMPOSITION, FIRST_RENDER], renderStarterSetPopup)
}

export const uiSagas = [watchScrollSwapMenu(), watchDismissDesignSidepanelOverlay(), watchForEnablingStarterSetPopup()]
