import type { Middleware } from 'redux'

import type { RootState } from 'store'

import uiStateService from 'services/uiState'

import {
    getSelectedCompositionData,
    getSelectedCompositionSaveData,
    getSelectedCompositionMissingFurnitureIds,
    getSelectedCompositionProductData,
    getSelectedScene,
} from 'models/compositions/selectors'
import { getUISaveData } from 'models/ui/selectors'
import { requestFurnitureByIds } from 'models/furniture/actions'

import { STORED_COMPOSITION_LABEL, STORED_SCENE_LABEL } from 'models/localStorage/constants'
import { getHasLocalStoredComposition, getHasLocalStoredScene } from 'models/localStorage/selectors'
import { saveUIStateToLocalStorage } from 'models/localStorage/actions'
import { getSaveTracking } from 'models/tracking/selectors'

import * as types from 'models/actionTypes'
import {
    beautifyImageReceived,
    deleteGeneratedImage,
    permanentlyDismissImageViewerDisclaimer,
} from 'models/beautifier/slice'

const localStorageMiddleware: Middleware<null, RootState> = (store) => (next) => (action) => {
    const nextAction = { ...action }
    switch (action.type) {
        case types.SAVE_SELECTED_COMPOSITION_TO_LOCAL_STORAGE: {
            const state = store.getState()
            const selectedComposition = getSelectedCompositionData(state)
            const saveData = getSelectedCompositionSaveData(state)
            const saveTrackingInfo = getSaveTracking(state)

            if (!saveData) {
                break
            }

            // Preserve the isStock property so that loading a showroom from local localStorage
            // doesn't have it appear with user comps on the dashboard
            // Also, preserve the originalCompositionData so that when
            // a showroom composition is opened to start a fresh design, the user does not see
            // their previous design items.
            const compToStore = {
                ...saveData,
                isStock: selectedComposition.isStock,
                trackingInfo: saveTrackingInfo,
                originalCompositionData: { ...selectedComposition.originalCompositionData },
            }

            try {
                window.localStorage.setItem(STORED_COMPOSITION_LABEL, JSON.stringify(compToStore))
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.SAVE_COMPOSITION_TO_LOCAL_STORAGE_FOR_EDITOR: {
            const state = store.getState()
            const selectedComposition = getSelectedCompositionData(state)
            const saveData = getSelectedCompositionSaveData(state)
            const saveTrackingInfo = getSaveTracking(state)

            if (!saveData) {
                break
            }

            const scene = getSelectedScene(state)
            const surfaces: Array<{ id: number, type: string }> | undefined
                = scene?.gltfManifest?.extras?.geomagical?.geomagicalSurfaces
            let floorId: number | undefined
            let ceilingId: number | undefined
            if (surfaces) {
                const floor = surfaces.find(surf => surf.type === `floor`)
                if (floor) {
                    floorId = floor.id
                }
                const ceiling = surfaces.find(surf => surf.type === `ceiling`)
                if (ceiling) {
                    ceilingId = ceiling.id
                }
            }

            const furnitures = getSelectedCompositionProductData(state)

            // Preserve the isStock property so that loading a showroom from local localStorage
            // doesn't have it appear with user comps on the dashboard
            // Also, preserve the originalCompositionData so that when
            // a showroom composition is opened to start a fresh design, the user does not see
            // their previous design items.
            const compToStore = {
                ...saveData,
                isStock: selectedComposition.isStock,
                trackingInfo: saveTrackingInfo,
                originalCompositionData: { ...selectedComposition.originalCompositionData },
                furnitures,
                floorId,
                ceilingId,
            }

            try {
                window.localStorage.setItem(STORED_COMPOSITION_LABEL, JSON.stringify(compToStore))
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.LOAD_COMPOSITION_FROM_LOCAL_STORAGE: {
            try {
                if (getHasLocalStoredComposition()) {
                    const loadDataString = window.localStorage.getItem(STORED_COMPOSITION_LABEL)
                    if (loadDataString) {
                        const loadData = JSON.parse(loadDataString)
                        // Legacy difference in saving/loading {
                        loadData.placedfurnitureSet = loadData.placedFurniture
                        loadData.uuid = loadData.compositionId
                        loadData.sceneUuid = loadData.sceneId
                        loadData.thumbnailUrl = loadData.thumbUrl
                        // }
                        nextAction.payload = {
                            ...nextAction,
                            composition: loadData,
                        }

                        window.localStorage.removeItem(STORED_COMPOSITION_LABEL)

                        const result = next(nextAction)

                        const missingFurnitureIds = getSelectedCompositionMissingFurnitureIds(store.getState())
                        if (missingFurnitureIds.length) {
                            store.dispatch(requestFurnitureByIds(missingFurnitureIds))
                        }

                        return result
                    }
                }
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.STORE_SCENE: {
            const { scene } = action.payload

            try {
                window.localStorage.setItem(STORED_SCENE_LABEL, JSON.stringify(scene))
            } catch (error) {
                /* empty */
            }

            break
        }
        case types.LOAD_SCENE_FROM_LOCAL_STORAGE: {
            try {
                if (getHasLocalStoredScene()) {
                    const sceneString = window.localStorage.getItem(STORED_SCENE_LABEL)
                    if (sceneString) {
                        const scene = JSON.parse(sceneString)
                        nextAction.payload = scene
                    }
                }
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.SAVE_UI_STATE_TO_LOCAL_STORAGE: {
            const saveData = getUISaveData(store.getState())
            try {
                uiStateService.update(saveData)
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.LOAD_UI_STATE_FROM_LOCAL_STORAGE: {
            try {
                nextAction.payload = {
                    ...nextAction,
                    data: uiStateService.retrieve(),
                }
            } catch (error) {
                /* empty */
            }
            break
        }
        case types.SWAP_RENDER_ITEM:
        case types.SKIP_FEEDBACK_FORM:
        case types.SKIP_FEEDBACK_FORM_FIRST_TIME:
        case types.SUBMIT_FEEDBACK_FORM:
        case types.SKIP_MAGIC_ERASER_ONBOARDING:
        case types.COMPLETE_MAGIC_ERASER_ONBOARDING:
        case types.SKIP_ONBOARDING:
        case types.SEEN_EXPERT_CHECK:
        case types.SEEN_DOLLHOUSE_ROTATE_TOOLTIP:
        case types.EXPERT_CHECK_PANEL_OPEN_TOGGLE:
        case types.SHOW_EXPERT_CHECK_CALLOUT_FROM_TIMEOUT:
        case types.DISMISS_EXPERT_CHECK_CALLOUT_FROM_TIMEOUT:
        case types.TOGGLE_PRODUCT_DIMENSIONS:
        case types.TOGGLE_ROOM_DIMENSIONS:
        case types.TOGGLE_DYNAMIC_MEASUREMENTS:
        case types.SET_WALL_COLOR_ROOM_BUILDER_EDITOR:
        case types.SET_FLOOR_MATERIAL_ROOM_BUILDER_EDITOR:
        case types.SET_ROOM_TEMPLATE_ROOM_BUILDER_EDITOR:
        case types.SET_PREVIOUS_COMPOSITION_ID_ROOM_BUILDER_EDITOR:
        case types.COMPLETE_ONBOARDING:
        case beautifyImageReceived.type:
        case deleteGeneratedImage.type:
        case permanentlyDismissImageViewerDisclaimer.type: {
            const result = next(nextAction)
            store.dispatch(saveUIStateToLocalStorage())
            return result
        }
        case types.SEEN_DASHBOARD: {
            const result = next(nextAction)
            store.dispatch(saveUIStateToLocalStorage())
            return result
        }
        default:
            break
    }
    return next(nextAction)
}

export default localStorageMiddleware
