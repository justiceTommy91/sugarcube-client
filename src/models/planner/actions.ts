import { createAction } from '@reduxjs/toolkit'

import * as types from 'models/actionTypes'

export const saveEditedRoom = createAction(types.SAVE_EDITED_ROOM, (sceneId, name, gltf, envmap?, composition?) => ({
    payload: { sceneId, name, gltf, envmap, composition },
}))

export const storeEditedRoomLocally = createAction(types.STORE_EDITED_ROOM_LOCALLY, (name, gltf, composition?) => ({
    payload: { name, gltf, composition },
}))

export const cancelRoomEditing = createAction(types.CANCEL_ROOM_EDIT)

export const startRoomPlanner = createAction(types.ROOM_PLANNER_STARTING)

export const finishRoomPlanner = createAction(types.ROOM_PLANNER_FINISHING)