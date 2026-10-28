import { fetchStarterSet, fetchStarterSetById } from 'services/starterSet'
import { takeEvery, takeLatest, call, put, select } from 'redux-saga/effects'
import { getSelectedCompositionId, getSelectedScene } from 'models/compositions/selectors'
import { clickPlaceSetRenderItems, removeRenderItems } from 'models/compositions/actions'
import { setStarterSetPopupVisible } from 'models/ui/actions'
import { getFurnitureAddCount } from 'models/sessionStorage/selectors'
import { getStarterSetPopupVisible } from 'models/ui/selectors'
import { CLICK_PLACE_RENDER_ITEM } from 'models/actionTypes'
import { Scene } from 'models/scenes'
import { SOURCETYPE_SYNTHETIC } from 'models/scenes/constants'
import * as tracker from 'utils/tracker'
import { STARTER_SET_ACTION_TYPES } from './constants'
import {
    failedReceiveStarterSets,
    failedReceiveStarterSetById,
    receivedStarterSetById,
    recievedStarterSets,
    requestStarterSetById,
    setRoomCategories,
} from './actions'
import { getStarterSetAllRoomsData } from './selectors'
import { StarterSetPayload, StarterSetByRoomType } from './types'

export function* requestStarterSetData() {
    try {
        const response: { results: StarterSetPayload[] } = yield call(fetchStarterSet)
        const grouped: StarterSetByRoomType = response.results.reduce((acc, item) => {
            const { roomType } = item
            if (!acc[roomType]) {
                acc[roomType] = []
            }
            const roomArray = acc[roomType]
            if (roomArray) {
                roomArray.push(item)
            }
            return acc
        }, {} as StarterSetByRoomType)
        yield put(recievedStarterSets(grouped))
        yield put(setRoomCategories(Object.keys(grouped) as (keyof StarterSetByRoomType)[]))
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch room types'
        const eventName = 'DecorateRoom.StarterSet.FailedToFetch'
        yield put(failedReceiveStarterSets(errorMessage))
        yield call(tracker.error, eventName, { error: errorMessage })
    }
}

function* watchRequestStarterSet() {
    yield takeEvery(STARTER_SET_ACTION_TYPES.REQUEST_STARTER_SET_DATA, requestStarterSetData)
}

export function* clearRenderData() {
    const compositionId: string = yield select(getSelectedCompositionId)
    yield put(removeRenderItems(compositionId))
}

export function* fetchRoomDataByType(roomType: string, roomCategory: keyof StarterSetByRoomType) {
    const compositionId: string = yield select(getSelectedCompositionId)
    const allRoomData: StarterSetByRoomType = yield select(getStarterSetAllRoomsData)
    const selectedRoomData = allRoomData[roomCategory] || ([] as StarterSetPayload[])
    const findRoomTypeData = selectedRoomData.find((room: StarterSetPayload) => room.internalName === roomType)
    const getSceneIdData: Scene = yield select(getSelectedScene)

    if (!findRoomTypeData) {
        return
    }

    const shouldIgnoreCamera = getSceneIdData.sourceType !== SOURCETYPE_SYNTHETIC
    const hasPlacements = findRoomTypeData.items?.some((item) => item.placement)

    if (!hasPlacements && getSceneIdData?.sceneId) {
        yield put(requestStarterSetById(findRoomTypeData.uuid, getSceneIdData.sceneId))
        try {
            const payload: StarterSetPayload = yield call(
                fetchStarterSetById,
                findRoomTypeData.uuid,
                getSceneIdData.sceneId,
            )
            yield put(receivedStarterSetById(payload))
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch starter set'
            yield put(failedReceiveStarterSetById(findRoomTypeData.uuid, errorMessage))
            yield call(tracker.error, 'DecorateRoom.StarterSet.FailedToFetchById', {
                setId: findRoomTypeData.uuid,
                error: errorMessage,
            })
        }
    }

    yield put(
        clickPlaceSetRenderItems({
            compositionId,
            trackingInfo: {},
            ignoreCamera: shouldIgnoreCamera,
            setId: findRoomTypeData.uuid,
        }),
    )
}
export function* handleRoomChange(action: {
    type: string
    roomType: string
    roomCategory: keyof StarterSetByRoomType
}) {
    yield call(clearRenderData)
    yield call(fetchRoomDataByType, action.roomType, action.roomCategory)
}

export function* clearPopupIfItemAdded() {
    const furnitureAddCount: ReturnType<typeof getFurnitureAddCount> = yield select(getFurnitureAddCount)
    const starterSetPopupVisible: boolean = yield select(getStarterSetPopupVisible)

    if (starterSetPopupVisible && furnitureAddCount > 0) {
        yield put(setStarterSetPopupVisible(false))
    }
}

function* clearStarterSetPopupIfItemAdded() {
    yield takeEvery(CLICK_PLACE_RENDER_ITEM, clearPopupIfItemAdded)
}

function* clearRenderItemsOnRoomChange() {
    yield takeLatest(STARTER_SET_ACTION_TYPES.SET_SELECTED_STARTER_SET_DATA, handleRoomChange)
}

export const starterSetSagas = [
    watchRequestStarterSet(),
    clearRenderItemsOnRoomChange(),
    clearStarterSetPopupIfItemAdded(),
]
