import * as types from 'models/actionTypes'
import { LOCALES_USING_IMPERIAL_SYSTEM } from 'models/location/constants'
import { getRegion } from 'models/location/selectors'
import {
    DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE,
    DESIGN_SIDEPANEL_MODE_MYITEMS_DETAILS,
    ORIENTATION_LANDSCAPE,
    ZOOM_DEFAULT,
} from 'models/ui/constants'
import { migrateTemplate } from 'Planner/room_template/migrate'
import { OVERLAY_PAX_CUSTOMIZE, OVERLAY_PAX_IMPORT } from 'components/configurableProducts/constants'

const initialState = {
    uiStateLoaded: false,
    artOpen: true,
    designSidepanelPinned: true,
    designSidepanelOpen: false,
    designSidepanelMode: DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE,
    /** @type {import('./types').DesignSidepanelOverlay | null} */
    designSidepanelVisibleOverlay: null,
    shouldPresentItemSelection: false,
    artTrayFilter: null,
    sharePanelOpen: false,
    expertCheckPanelOpen: false,
    filterModalOpen: false,
    showSwapMenu: false,
    showMissingWallsModal: false,
    showLoginPromptModal: false,
    orientation: ORIENTATION_LANDSCAPE,
    showDesignSummary: false,
    magicEraserOnboarding: {
        skipTime: 0,
        completeTime: 0,
        hasSeenMagicEraserOnboarding: false,
    },
    shouldShowOnboarding: false,
    onboarding: {
        skipTime: 0,
        completeTime: 0,
        hasSeenOnboarding: false,
    },
    starterSet: {
        isPopupVisible: false,
        isStarterSetSidebarVisible: false,
    },
    feedbackForm: {
        skipTime: 0,
        completeTime: 0,
        hasSeenFeedbackForm: false,
        hasSeenFeedbackFormOnce: false,
        hasSeenBeautifyFeedback: false,
        promptVisibility: {
            visible: false,
            timeDelay: 0,
            source: null,
        },
    },
    seenDashboard: false,
    seenExpertCheck: false,
    shownExpertCheckCalloutFromTimeout: false,
    dismissedExpertCheckCalloutFromTimeout: false,
    showAppDownloadModal: false,
    showUploadImageModal: false,
    showDeleteModal: false,
    deleteType: null,
    toDelete: null,
    sceneTypeLabel: null,
    savingUsingModal: false,
    showChangeView: false,
    showDollhouseViews: false,
    showGoesWithTab: false,
    showSaveMenu: false,
    pinsVisibility: true,
    showColorPicker: false,
    /**
     * This tracks items that should not be available in the UI according to the cart API response
     * and will temporarily disable the products' add to cart buttons
     */
    invalidLocalItemNumbers: [],
    showImperialMeasurements: LOCALES_USING_IMPERIAL_SYSTEM.includes(getRegion()),
    showMeasurementsPopover: false,
    measurementsPopover: {
        productDimensionsEnabled: false,
        roomDimensionsEnabled: false,
        dynamicMeasurementsEnabled: false,
    },
    autoShowRoomBuilderModal: false,
    walkedToId: null,
    zoomLevel: ZOOM_DEFAULT,
}

/** @type {import('redux').Reducer<typeof initialState>} */
const ui = (state = initialState, action) => {
    switch (action.type) {
        case types.ART_TOGGLE:
            return {
                ...state,
                artOpen: !state.artOpen,
            }
        case types.PIN_DESIGN_SIDEPANEL: {
            return {
                ...state,
                designSidepanelPinned: true,
                designSidepanelOpen: true,
            }
        }
        case types.UNPIN_DESIGN_SIDEPANEL: {
            return {
                ...state,
                designSidepanelPinned: false,
                designSidepanelOpen: false,
            }
        }
        case types.OPEN_DESIGN_SIDEPANEL: {
            const newState = {
                ...state,
                designSidepanelOpen: true,
            }
            if (action.payload.renderItemId) {
                newState.designSidepanelMode = DESIGN_SIDEPANEL_MODE_MYITEMS_DETAILS
            }
            return newState
        }
        case types.CLOSE_DESIGN_SIDEPANEL:
            return {
                ...state,
                designSidepanelOpen: false,
            }
        case types.TOGGLE_DESIGN_SIDEPANEL:
            return {
                ...state,
                designSidepanelOpen: !state.designSidepanelOpen,
            }
        case types.SET_DESIGN_SIDEPANEL_MODE:
            return {
                ...state,
                designSidepanelMode: action.payload.mode,
            }
        case types.SET_ADMIN:
            if (!action.shouldBeAdmin) {
                return {
                    ...state,
                    designSidepanelMode: DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE,
                }
            }
            return {
                ...state,
            }
        case types.PRESENT_ITEM_SELECTION:
            return {
                ...state,
                shouldPresentItemSelection: action.shouldPresent,
            }
        case types.ART_TRAY_FILTER:
            return {
                ...state,
                artTrayFilter: action.filter,
            }
        case types.ITEM_SELECTION_DISPLAY:
            return {
                ...state,
                itemSelectionDisplay: action.display,
            }
        case types.SHARE_PANEL_OPEN_TOGGLE:
            return {
                ...state,
                sharePanelOpen: !state.sharePanelOpen,
            }
        case types.EXPERT_CHECK_PANEL_OPEN_TOGGLE:
            return {
                ...state,
                expertCheckPanelOpen: !state.expertCheckPanelOpen,
                seenExpertCheck: true,
                // a callout is shown after a timeout if state.shownExpertCheckCalloutFromTimeout = true.
                // Toggling the panel after this needs to dismiss it and never show the callout again
                dismissedExpertCheckCalloutFromTimeout: state.shownExpertCheckCalloutFromTimeout,
            }
        case types.SEEN_EXPERT_CHECK:
            return {
                ...state,
                seenExpertCheck: action.seen,
            }
        case types.SHOW_EXPERT_CHECK_CALLOUT_FROM_TIMEOUT:
            return {
                ...state,
                shownExpertCheckCalloutFromTimeout: true,
            }
        case types.DISMISS_EXPERT_CHECK_CALLOUT_FROM_TIMEOUT:
            return {
                ...state,
                dismissedExpertCheckCalloutFromTimeout: true,
            }
        case types.SET_FILTER_MODAL_OPEN:
            return {
                ...state,
                filterModalOpen: action.isOpen,
            }
        case types.SHOW_SWAP_MENU:
            return {
                ...state,
                showSwapMenu: action.showSwapMenu,
            }
        case types.SHOW_MISSING_WALLS_MODAL:
            return {
                ...state,
                showMissingWallsModal: action.showMissingWallsModal,
            }
        case types.SET_MOBILE_ORIENTATION:
            return {
                ...state,
                orientation: action.orientation,
            }
        case types.LOGIN_NEEDED:
            return {
                ...state,
                showLoginPromptModal: true,
            }
        case types.SHOW_LOGIN_PROMPT_MODAL:
            return {
                ...state,
                showLoginPromptModal: action.showLoginPromptModal,
            }
        case types.SHOW_DESIGN_SUMMARY:
            return {
                ...state,
                showDesignSummary: action.showDesignSummary,
            }

        case types.SHOW_MORE_MENU:
            return {
                ...state,
                showMoreMenu: action.showMoreMenu,
            }
        case types.SHOW_SAVE_OPTIONS_MENU:
            return {
                ...state,
                showSaveMenu: action.showMoreMenu,
            }
        case types.LOAD_UI_STATE_FROM_LOCAL_STORAGE:
            if (action.payload.data) {
                return {
                    ...state,
                    ...action.payload.data,
                    uiStateLoaded: true,
                }
            }
            return {
                ...state,
                uiStateLoaded: true,
            }
        case types.SKIP_MAGIC_ERASER_ONBOARDING:
            return {
                ...state,
                magicEraserOnboarding: {
                    ...state.magicEraserOnboarding,
                    hasSeenMagicEraserOnboarding: true,
                    skipTime: action.skipTime,
                },
            }
        case types.COMPLETE_MAGIC_ERASER_ONBOARDING:
            return {
                ...state,
                magicEraserOnboarding: {
                    ...state.magicEraserOnboarding,
                    hasSeenMagicEraserOnboarding: true,
                    completeTime: action.completeTime,
                },
            }
        case types.SKIP_FEEDBACK_FORM: {
            const isBeautify = state.feedbackForm.promptVisibility.source === 'beautify'
            return {
                ...state,
                feedbackForm: {
                    ...state.feedbackForm,
                    hasSeenFeedbackForm: true,
                    hasSeenBeautifyFeedback: state.feedbackForm.hasSeenBeautifyFeedback || isBeautify,
                },
            }
        }
        case types.SKIP_FEEDBACK_FORM_FIRST_TIME: {
            const isBeautify = state.feedbackForm.promptVisibility.source === 'beautify'
            return {
                ...state,
                feedbackForm: {
                    ...state.feedbackForm,
                    hasSeenFeedbackFormOnce: true,
                    hasSeenBeautifyFeedback: state.feedbackForm.hasSeenBeautifyFeedback || isBeautify,
                    skipTime: action.skipTime,
                    promptVisibility: {
                        visible: false,
                        timeDelay: 0,
                    },
                },
            }
        }
        case types.SUBMIT_FEEDBACK_FORM: {
            const isBeautify = state.feedbackForm.promptVisibility.source === 'beautify'
            return {
                ...state,
                feedbackForm: {
                    ...state.feedbackForm,
                    hasSeenFeedbackForm: true,
                    hasSeenFeedbackFormOnce: true,
                    hasSeenBeautifyFeedback: state.feedbackForm.hasSeenBeautifyFeedback || isBeautify,
                    completeTime: action.completeTime,
                    promptVisibility: {
                        visible: false,
                        timeDelay: 0,
                    },
                },
            }
        }
        case types.SHOW_ONBOARDING:
            return {
                ...state,
                shouldShowOnboarding: true,
            }
        case types.SKIP_ONBOARDING:
            return {
                ...state,
                shouldShowOnboarding: false,
                onboarding: {
                    ...state.onboarding,
                    hasSeenOnboarding: true,
                    skipTime: action.skipTime,
                },
            }
        case types.COMPLETE_ONBOARDING:
            return {
                ...state,
                shouldShowOnboarding: false,
                onboarding: {
                    ...state.onboarding,
                    hasSeenOnboarding: true,
                    completeTime: action.completeTime,
                },
            }
        case types.SEEN_DASHBOARD:
            return {
                ...state,
                seenDashboard: true,
            }
        case types.SHOW_APP_DOWNLOAD_MODAL:
            return {
                ...state,
                showAppDownloadModal: action.showAppDownloadModal,
            }
        case types.SHOW_UPLOAD_IMAGE_MODAL:
            return {
                ...state,
                showUploadImageModal: action.showUploadImageModal,
            }
        case types.SHOW_DELETE_MODAL:
            return {
                ...state,
                showDeleteModal: action.showDeleteModal,
            }
        case types.SET_DELETE:
            return {
                ...state,
                toDelete: action.toDelete,
                deleteType: action.setDelete,
                sceneTypeLabel: action.sceneTypeLabel,
            }
        case types.SAVING_USING_MODAL:
            return {
                ...state,
                savingUsingModal: action.savingUsingModal,
            }
        case types.SHOW_CHANGE_VIEW:
            return {
                ...state,
                showChangeView: action.show,
            }
        case types.SHOW_DOLLHOUSE_VIEWS:
            return {
                ...state,
                showDollhouseViews: action.show,
            }
        case types.SHOW_GOES_WITH_TAB:
            return {
                ...state,
                showGoesWithTab: action.show,
            }
        case types.TOGGLE_PINS_VISIBILITY:
            return {
                ...state,
                pinsVisibility: !state.pinsVisibility,
            }
        case types.SHOW_COLOR_PICKER:
            return {
                ...state,
                showColorPicker: action.show,
            }
        case types.SWAP_RENDER_ITEM:
            if (state.designSidepanelVisibleOverlay?.furnitureId === action.payload.furnitureToSwapOut) {
                return {
                    ...state,
                    designSidepanelVisibleOverlay: {
                        ...state.designSidepanelVisibleOverlay,
                        furnitureId: action.payload.furnitureToSwapIn,
                    },
                }
            }
            return {
                ...state,
            }
        case types.DELETE_COMPOSITION_RENDER_ITEM: {
            if (state.designSidepanelVisibleOverlay?.furnitureId === action.payload.id) {
                return {
                    ...state,
                    designSidepanelVisibleOverlay: null,
                }
            }
            return {
                ...state,
            }
        }
        case types.SELECT_COMPOSITION_RENDER_ITEM: {
            // eslint-disable-next-line eqeqeq
            if (action.payload.renderItemId == -1) {
                return {
                    ...state,
                    designSidepanelVisibleOverlay: null,
                }
            }
            return {
                ...state,
                designSidepanelVisibleOverlay: {
                    overlay: 'furniture options',
                    productId: action.payload.productId,
                    furnitureId: action.payload.renderItemId,
                },
            }
        }
        case types.VIEW_PRODUCT_DETAILS:
            return {
                ...state,
                designSidepanelVisibleOverlay: {
                    overlay: 'product details',
                    productId: action.payload.productId,
                },
            }
        case types.OPEN_PAX_IMPORT_PANEL:
            return {
                ...state,
                designSidepanelVisibleOverlay: {
                    overlay: OVERLAY_PAX_IMPORT,
                },
            }
        case types.OPEN_PAX_CUSTOMIZE_PANEL:
            return {
                ...state,
                designSidepanelVisibleOverlay: {
                    overlay: OVERLAY_PAX_CUSTOMIZE,
                },
            }
        case types.OPEN_COMPOSITION:
        case types.DISMISS_DESIGN_SIDEPANEL_OVERLAY:
            return {
                ...state,
                designSidepanelVisibleOverlay: null,
            }
        case types.ADD_INVALID_LOCAL_ITEM_NUMBERS:
            return {
                ...state,
                invalidLocalItemNumbers: [...state.invalidLocalItemNumbers, ...action.payload.localItemNumbers],
            }
        case types.SHOW_IMPERIAL_MEASUREMENTS:
            return {
                ...state,
                showImperialMeasurements: !state.showImperialMeasurements,
            }
        case types.SHOW_MEASUREMENTS_POPOVER:
            return {
                ...state,
                showMeasurementsPopover: action.show,
            }
        case types.TOGGLE_PRODUCT_DIMENSIONS:
            return {
                ...state,
                measurementsPopover: {
                    ...state.measurementsPopover,
                    productDimensionsEnabled: action.enabled,
                },
            }
        case types.TOGGLE_ROOM_DIMENSIONS:
            return {
                ...state,
                measurementsPopover: {
                    ...state.measurementsPopover,
                    roomDimensionsEnabled: action.enabled,
                },
            }
        case types.SET_PROMPT_VISIBILITY:
            return {
                ...state,
                feedbackForm: {
                    ...state.feedbackForm,
                    promptVisibility: {
                        ...state.feedbackForm.promptVisibility,
                        visible: action.visible,
                        timeDelay: action.timeDelay,
                        source: action.source ?? null,
                    },
                },
            }
        case types.TOGGLE_DYNAMIC_MEASUREMENTS:
            return {
                ...state,
                measurementsPopover: {
                    ...state.measurementsPopover,
                    dynamicMeasurementsEnabled: action.enabled,
                },
            }
        case types.AUTO_SHOW_ROOM_BUILDER_MODAL:
            return {
                ...state,
                autoShowRoomBuilderModal: action.show,
            }
        case types.SET_WALKED_TO_ID:
            return {
                ...state,
                walkedToId: action.walkedToId,
            }
        case types.SET_ZOOM_LEVEL:
            return {
                ...state,
                zoomLevel: action.zoomLevel,
            }
        case types.SET_WALL_COLOR_ROOM_BUILDER_EDITOR:
            return {
                ...state,
                roomBuilderEditor: { ...state.roomBuilderEditor, wallColor: action.wallColor },
            }
        case types.SET_FLOOR_MATERIAL_ROOM_BUILDER_EDITOR:
            return {
                ...state,
                roomBuilderEditor: { ...state.roomBuilderEditor, floorMaterial: action.floorMaterial },
            }
        case types.SET_ROOM_TEMPLATE_ROOM_BUILDER_EDITOR: {
            return {
                ...state,
                roomBuilderEditor: {
                    ...state.roomBuilderEditor,
                    roomTemplate: action.roomTemplate && migrateTemplate(action.roomTemplate),
                },
            }
        }
        case types.SET_PREVIOUS_SCENE_ID_ROOM_BUILDER_EDITOR: {
            return {
                ...state,
                roomBuilderEditor: { ...state.roomBuilderEditor, sceneId: action.sceneId },
            }
        }
        case types.SET_PREVIOUS_COMPOSITION_ID_ROOM_BUILDER_EDITOR: {
            return {
                ...state,
                roomBuilderEditor: { ...state.roomBuilderEditor, compositionId: action.compositionId },
            }
        }
        case types.SET_STARTER_SET_POPUP_VISIBLE: {
            return {
                ...state,
                starterSet: {
                    ...state.starterSet,
                    isPopupVisible: action.visible,
                },
            }
        }
        case types.SET_STARTER_SET_SIDEBAR_VISIBLE: {
            return {
                ...state,
                starterSet: {
                    ...state.starterSet,
                    isPopupVisible: false,
                    isStarterSetSidebarVisible: action.visible,
                },
            }
        }
        default:
            return state
    }
}

export default ui
