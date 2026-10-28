import { STARTER_SET_ACTION_TYPES } from './constants'
import type { StarterSetByRoomType, StarterSetPayload, StarterSetState } from './types'

type RequestStarterSetAction = { type: typeof STARTER_SET_ACTION_TYPES.REQUEST_STARTER_SET_DATA }
type ReceivedStarterSetAction = {
    type: typeof STARTER_SET_ACTION_TYPES.RECIEVED_STARTER_SET_DATA
    payload: StarterSetByRoomType
}
type FailedReceiveStarterSetAction = {
    type: typeof STARTER_SET_ACTION_TYPES.FAILED_RECEIVE_STARTER_SET_DATA
    payload: { error: string }
}
type SetRoomCategoriesAction = {
    type: typeof STARTER_SET_ACTION_TYPES.SET_ROOM_CATEGORIES
    payload: (keyof StarterSetByRoomType)[]
}
type RequestStarterSetByIdAction = {
    type: typeof STARTER_SET_ACTION_TYPES.REQUEST_STARTER_SET_BY_ID
    setId: string
    sceneId: string
}
type ReceivedStarterSetByIdAction = {
    type: typeof STARTER_SET_ACTION_TYPES.RECEIVED_STARTER_SET_BY_ID
    payload: StarterSetPayload
}
type FailedReceiveStarterSetByIdAction = {
    type: typeof STARTER_SET_ACTION_TYPES.FAILED_RECEIVE_STARTER_SET_BY_ID
    payload: { setId: string; error: string }
}

type StarterSetTypesAction =
    | RequestStarterSetAction
    | ReceivedStarterSetAction
    | FailedReceiveStarterSetAction
    | SetRoomCategoriesAction
    | FailedReceiveStarterSetAction
    | RequestStarterSetByIdAction
    | ReceivedStarterSetByIdAction
    | FailedReceiveStarterSetByIdAction

const initialState: StarterSetState = {
    allRoomsData: {},
    roomCategories: [],
    loading: false,
    error: null,
    loadingSetId: null,
    setByIdError: null,
}

const replaceSetInAllRooms = (
    allRoomsData: StarterSetState['allRoomsData'],
    payload: StarterSetPayload,
): StarterSetState['allRoomsData'] => {
    const next: StarterSetState['allRoomsData'] = {}
    let replaced = false
    Object.keys(allRoomsData).forEach((roomType) => {
        const sets = allRoomsData[roomType] || []
        next[roomType] = sets.map((set) => {
            if (set.uuid === payload.uuid) {
                replaced = true
                return payload
            }
            return set
        })
    })
    if (!replaced) {
        const roomTypeKey = payload.roomType
        next[roomTypeKey] = [...(next[roomTypeKey] || []), payload]
    }
    return next
}

export const starterSetReducer = (state = initialState, action: StarterSetTypesAction): StarterSetState => {
    switch (action.type) {
        case STARTER_SET_ACTION_TYPES.REQUEST_STARTER_SET_DATA:
            return {
                ...state,
                loading: true,
                error: null,
            }
        case STARTER_SET_ACTION_TYPES.RECIEVED_STARTER_SET_DATA:
            return {
                ...state,
                allRoomsData: action.payload,
                loading: false,
            }
        case STARTER_SET_ACTION_TYPES.FAILED_RECEIVE_STARTER_SET_DATA:
            return {
                ...state,
                loading: false,
                error: action.payload.error,
            }
        case STARTER_SET_ACTION_TYPES.SET_ROOM_CATEGORIES:
            return {
                ...state,
                roomCategories: action.payload,
            }
        case STARTER_SET_ACTION_TYPES.REQUEST_STARTER_SET_BY_ID:
            return {
                ...state,
                loadingSetId: action.setId,
                setByIdError: null,
            }
        case STARTER_SET_ACTION_TYPES.RECEIVED_STARTER_SET_BY_ID:
            return {
                ...state,
                allRoomsData: replaceSetInAllRooms(state.allRoomsData, action.payload),
                loadingSetId: null,
                setByIdError: null,
            }
        case STARTER_SET_ACTION_TYPES.FAILED_RECEIVE_STARTER_SET_BY_ID:
            return {
                ...state,
                loadingSetId: null,
                setByIdError: action.payload.error,
            }
        default:
            return state
    }
}
