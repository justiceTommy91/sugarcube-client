import { createAction } from '@reduxjs/toolkit'
import * as types from 'models/actionTypes'
import { APIComposition, CompositionDataItem } from 'models/compositions'
import { Scene } from 'models/scenes'

export const saveSelectedCompositionToLocalStorage = createAction(types.SAVE_SELECTED_COMPOSITION_TO_LOCAL_STORAGE)
export const saveCompositionToLocalStorageForEditor = createAction(types.SAVE_COMPOSITION_TO_LOCAL_STORAGE_FOR_EDITOR)

type LoadCompositionFromLocalStorageProps = APIComposition & {
    originalCompositionData: CompositionDataItem
}

export const loadCompositionFromLocalStorage = createAction(
    types.LOAD_COMPOSITION_FROM_LOCAL_STORAGE,
    (): { payload: { composition: LoadCompositionFromLocalStorageProps | null } } => ({
        payload: {
            composition: null,
        },
    }),
)

export const saveUIStateToLocalStorage = createAction(types.SAVE_UI_STATE_TO_LOCAL_STORAGE)

export const loadUIStateFromLocalStorage = createAction(
    types.LOAD_UI_STATE_FROM_LOCAL_STORAGE,
    (): { payload: { data: Record<string, unknown> } } => ({
        payload: {
            data: {},
        },
    }),
)

export const loadSceneFromLocalStorage = createAction<Scene | undefined>(types.LOAD_SCENE_FROM_LOCAL_STORAGE)
