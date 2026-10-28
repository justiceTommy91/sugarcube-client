import { ROOM_TYPES_ACTION_TYPES } from './constants'
import type { RoomTypesState, RoomType } from './types'

type RequestRoomTypesAction = { type: typeof ROOM_TYPES_ACTION_TYPES.REQUEST_ROOM_TYPES_SAGA }
type ReceiveRoomTypesAction = { type: typeof ROOM_TYPES_ACTION_TYPES.RECEIVE_ROOM_TYPES; payload: { rooms: RoomType[] } }
type FailedReceiveRoomTypesAction = { type: typeof ROOM_TYPES_ACTION_TYPES.FAILED_RECEIVE_ROOM_TYPES; payload: { error: string } }

type RoomTypesAction = RequestRoomTypesAction | ReceiveRoomTypesAction | FailedReceiveRoomTypesAction

const initialState: RoomTypesState = {
    data: {
        rooms: [],
    },
    loading: false,
    error: null,
}

export const roomTypesReducer = (state = initialState, action: RoomTypesAction): RoomTypesState => {
    switch (action.type) {
        case ROOM_TYPES_ACTION_TYPES.REQUEST_ROOM_TYPES_SAGA:
            return {
                ...state,
                loading: true,
                error: null,
            }

        case ROOM_TYPES_ACTION_TYPES.RECEIVE_ROOM_TYPES:
            return {
                ...state,
                loading: false,
                data: {
                    rooms: action.payload.rooms,
                },
                error: null,
            }

        case ROOM_TYPES_ACTION_TYPES.FAILED_RECEIVE_ROOM_TYPES:
            return {
                ...state,
                loading: false,
                error: action.payload.error,
            }

        default:
            return state
    }
}
