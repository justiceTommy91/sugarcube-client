import { call, put, takeEvery } from 'redux-saga/effects'
import { fetchRoomTypes } from 'services/roomTypes'
import { ROOM_TYPES_ACTION_TYPES } from './constants'
import { receiveRoomTypes, failedReceiveRoomTypes } from './actions'
import type { RoomTypesApiResponse } from './types'

function* requestRoomTypesSaga() {
    try {
        const response: RoomTypesApiResponse = yield call(fetchRoomTypes)
        // Filter out bathroom and kitchen, then pre-compute categoryIds/categoryNames
        const roomsWithCategoryIds = (response.data || [])
            .filter((room) => room.humanId !== 'rooms--bathroom' && room.humanId !== 'rooms--kitchen')
            .map((room) => ({
                ...room,
                categoryIds: room.categories?.map((cat) => cat.categoryId).join(',') || undefined,
                categoryNames: room.categories?.map((cat) => cat.name).join(',') || undefined,
            }))

        yield put(receiveRoomTypes(roomsWithCategoryIds))
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch room types'
        yield put(failedReceiveRoomTypes(errorMessage))
    }
}

function* watchRequestRoomTypes() {
    yield takeEvery(ROOM_TYPES_ACTION_TYPES.REQUEST_ROOM_TYPES_SAGA, requestRoomTypesSaga)
}

export const roomTypesSagas = [watchRequestRoomTypes()]
