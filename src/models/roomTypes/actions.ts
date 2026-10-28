import { ROOM_TYPES_ACTION_TYPES } from './constants'
import type { RoomType } from './types'

export const requestRoomTypes = () => ({
    type: ROOM_TYPES_ACTION_TYPES.REQUEST_ROOM_TYPES_SAGA,
})

export const receiveRoomTypes = (rooms: RoomType[]) => ({
    type: ROOM_TYPES_ACTION_TYPES.RECEIVE_ROOM_TYPES,
    payload: { rooms },
})

export const failedReceiveRoomTypes = (error: string) => ({
    type: ROOM_TYPES_ACTION_TYPES.FAILED_RECEIVE_ROOM_TYPES,
    payload: { error },
})
