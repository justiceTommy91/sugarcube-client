import { createAction } from '@reduxjs/toolkit'
import * as types from 'models/actionTypes'

export const artToggle = () => ({
    type: types.ART_TOGGLE,
})

export const filterArtTray = (filter) => ({
    type: types.ART_TRAY_FILTER,
    filter,
})

export const pinDesignSidepanel = createAction(types.PIN_DESIGN_SIDEPANEL)

export const unpinDesignSidepanel = createAction(types.UNPIN_DESIGN_SIDEPANEL)

export const openDesignSidepanel = createAction(types.OPEN_DESIGN_SIDEPANEL, (renderItemId = undefined, trackingInfo = {}) => ({
    payload: {
        renderItemId,
        trackingInfo,
    },
}))

export const setDesignSidepanelMode = createAction(types.SET_DESIGN_SIDEPANEL_MODE, (mode, trackingInfo = {}) => ({
    payload: {
        mode,
        trackingInfo,
    },
}))

export const closeDesignSidepanel = () => ({
    type: types.CLOSE_DESIGN_SIDEPANEL,
})

export const toggleDesignSidepanel = createAction(types.TOGGLE_DESIGN_SIDEPANEL)

/** @type {(productId: number) => import('@reduxjs/toolkit').PayloadAction<{ productId: number }>} */
export const viewProductDetails = createAction(types.VIEW_PRODUCT_DETAILS, (productId) => ({
    payload: {
        productId,
    },
}))

export const dismissDesignSidepanelOverlay = createAction(types.DISMISS_DESIGN_SIDEPANEL_OVERLAY)

export const openPAXImportPanel = createAction(types.OPEN_PAX_IMPORT_PANEL)

export const openPAXCustomizePanel = createAction(types.OPEN_PAX_CUSTOMIZE_PANEL)

export const presentItemSelection = (shouldPresent) => ({
    type: types.PRESENT_ITEM_SELECTION,
    shouldPresent,
})

export const displayItemSelection = (display) => ({
    type: types.ITEM_SELECTION_DISPLAY,
    display,
})

export const reloadPage = () => ({
    type: types.RELOAD_PAGE,
})

export const toggleSharePanelOpen = (trackingInfo = {}) => ({
    type: types.SHARE_PANEL_OPEN_TOGGLE,
    trackingInfo,
})

export const toggleExpertCheckPanelOpen = () => ({
    type: types.EXPERT_CHECK_PANEL_OPEN_TOGGLE,
})

export const setHasSeenExpertCheck = (seen) => ({
    type: types.SEEN_EXPERT_CHECK,
    seen,
})

export const showExpertCheckCalloutFromTimeout = () => ({
    type: types.SHOW_EXPERT_CHECK_CALLOUT_FROM_TIMEOUT,
})

export const dismissExpertCheckCalloutFromTimeout = () => ({
    type: types.DISMISS_EXPERT_CHECK_CALLOUT_FROM_TIMEOUT,
})

export const setIsMagicWindowLoading = (isMagicWindowLoading) => ({
    type: types.SET_MAGIC_WINDOW_LOADING,
    isMagicWindowLoading,
})

export const setShowFilterModal = (isOpen) => ({
    type: types.SET_FILTER_MODAL_OPEN,
    isOpen,
})

// Shows or hides the swap menu
// showSwap: bool
// furnitureId: sets the swapAnchorId in the furniture reducer for which swapabble items are shown
export const showSwapMenuForId = (showSwap, furnitureId = -1) => ({
    type: types.SHOW_SWAP_MENU,
    showSwapMenu: showSwap,
    id: furnitureId,
})

export const showMissingWallsModal = (show = true) => ({
    type: types.SHOW_MISSING_WALLS_MODAL,
    showMissingWallsModal: show,
})

export const openDesignLab = () => ({
    type: types.OPEN_DESIGN_LAB,
})

export const setMobileOrientation = (orientation) => ({
    type: types.SET_MOBILE_ORIENTATION,
    orientation,
})

export const showLoginPromptModal = (show = true) => ({
    type: types.SHOW_LOGIN_PROMPT_MODAL,
    showLoginPromptModal: show,
})

export const showDesignSummary = (show = true) => ({
    type: types.SHOW_DESIGN_SUMMARY,
    showDesignSummary: show,
})

export const trackHelpCenterClicks = () => ({
    type: types.TRACK_HELP_CENTER_CLICKS,
})

export const showMoreMenu = (show = true) => ({
    type: types.SHOW_MORE_MENU,
    showMoreMenu: show,
})

export const showSaveMenu = (show = true) => ({
    type: types.SHOW_SAVE_OPTIONS_MENU,
    showMoreMenu: show,
})

export const skipMagicEraserOnboarding = (skipTime) => ({
    type: types.SKIP_MAGIC_ERASER_ONBOARDING,
    skipTime,
})

export const completeMagicEraserOnboarding = (completeTime) => ({
    type: types.COMPLETE_MAGIC_ERASER_ONBOARDING,
    completeTime,
})

export const skipFeedbackForm = () => ({
    type: types.SKIP_FEEDBACK_FORM,
})

export const skipFeedbackFormFirstTime = (skipTime) => ({
    type: types.SKIP_FEEDBACK_FORM_FIRST_TIME,
    skipTime,
})

export const submitFeedbackForm = (completeTime) => ({
    type: types.SUBMIT_FEEDBACK_FORM,
    completeTime,
})

export const showOnboarding = () => ({
    type: types.SHOW_ONBOARDING,
})

export const skipOnboarding = (skipTime) => ({
    type: types.SKIP_ONBOARDING,
    skipTime,
})

export const completeOnboarding = (completeTime) => ({
    type: types.COMPLETE_ONBOARDING,
    completeTime,
})

export const setSeenDashboard = () => ({
    type: types.SEEN_DASHBOARD,
})

export const showAppDownloadModal = (show = true) => ({
    type: types.SHOW_APP_DOWNLOAD_MODAL,
    showAppDownloadModal: show,
})

export const showUploadImageModal = (show = true) => ({
    type: types.SHOW_UPLOAD_IMAGE_MODAL,
    showUploadImageModal: show,
})

export const showDeleteModal = (show = true) => ({
    type: types.SHOW_DELETE_MODAL,
    showDeleteModal: show,
})

export const setDelete = (ids, deleteType, sceneTypeLabel) => ({
    type: types.SET_DELETE,
    toDelete: ids,
    setDelete: deleteType,
    sceneTypeLabel,
})

export const savingUsingModal = (saving) => ({
    type: types.SAVING_USING_MODAL,
    savingUsingModal: saving,
})

export const scrollSwapMenu = (trackingInfo) => ({
    type: types.SCROLL_SWAP_MENU,
    trackingInfo,
})

export const showChangeView = (show) => ({
    type: types.SHOW_CHANGE_VIEW,
    show,
})

export const showDollhouseViews = (show) => ({
    type: types.SHOW_DOLLHOUSE_VIEWS,
    show,
})

export const showGoesWithTab = (show, trackingInfo = null) => ({
    type: types.SHOW_GOES_WITH_TAB,
    show,
    trackingInfo,
})

export const togglePinsVisibility = () => ({
    type: types.TOGGLE_PINS_VISIBILITY,
})

export const showColorPicker = (show) => ({
    type: types.SHOW_COLOR_PICKER,
    show,
})

export const swappableItemsRendered = () => ({
    type: types.SWAPPABLE_ITEMS_READY,
})

/**
 * This temporarily marks items as invalid in the local state after Ingka's cart API indicates that the item is invalid.
 * @type {(localItemNumbers: string[]) => import('@reduxjs/toolkit').PayloadAction<{ localItemNumbers: string[] }>}
 * */
export const addInvalidLocalItemNumbers = createAction(types.ADD_INVALID_LOCAL_ITEM_NUMBERS, (localItemNumbers) => ({
    payload: {
        localItemNumbers,
    },
}))

export const showImperialMeasurements = () => ({
    type: types.SHOW_IMPERIAL_MEASUREMENTS,
})

export const showMeasurementsPopover = (show) => ({
    type: types.SHOW_MEASUREMENTS_POPOVER,
    show,
})

export const toggleProductDimensions = (enabled) => ({
    type: types.TOGGLE_PRODUCT_DIMENSIONS,
    enabled,
})

export const toggleRoomDimensions = (enabled) => ({
    type: types.TOGGLE_ROOM_DIMENSIONS,
    enabled,
})

export const toggleDynamicMeasurements = (enabled) => ({
    type: types.TOGGLE_DYNAMIC_MEASUREMENTS,
    enabled,
})

export const autoShowRoomBuilderModal = (show) => ({
    type: types.AUTO_SHOW_ROOM_BUILDER_MODAL,
    show,
})

export const setWalkedToId = (walkedToId) => ({
    type: types.SET_WALKED_TO_ID,
    walkedToId,
})

export const setZoomLevel = (zoomLevel) => ({
    type: types.SET_ZOOM_LEVEL,
    zoomLevel,
})

export const setPromptVisibility = (visible, timeDelay, source = visible ? 'design' : undefined) => ({
    type: types.SET_PROMPT_VISIBILITY,
    visible,
    timeDelay,
    source,
})

export const setWallColorRoomBuilderEditor = (wallColor) => ({
    type: types.SET_WALL_COLOR_ROOM_BUILDER_EDITOR,
    wallColor,
})

export const setFloorMaterialRoomBuilderEditor = (floorMaterial) => ({
    type: types.SET_FLOOR_MATERIAL_ROOM_BUILDER_EDITOR,
    floorMaterial,
})

export const setRoomTemplateRoomBuilderEditor = (roomTemplate) => ({
    type: types.SET_ROOM_TEMPLATE_ROOM_BUILDER_EDITOR,
    roomTemplate,
})

export const setPreviousSceneIdRoomBuilderEditor = (sceneId) => ({
    type: types.SET_PREVIOUS_SCENE_ID_ROOM_BUILDER_EDITOR,
    sceneId,
})

export const setPreviousCompositionIdRoomBuilderEditor = (compositionId) => ({
    type: types.SET_PREVIOUS_COMPOSITION_ID_ROOM_BUILDER_EDITOR,
    compositionId,
})

export const setStarterSetPopupVisible = (visible) => ({
    type: types.SET_STARTER_SET_POPUP_VISIBLE,
    visible,
})

export const setStarterSetSidebarVisible = (visible) => ({
    type: types.SET_STARTER_SET_SIDEBAR_VISIBLE,
    visible,
})
