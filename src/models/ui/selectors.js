import { createSelector } from 'reselect'
import {
    ART_FILTER_FULL,
    DESIGN_SIDEPANEL_MODE_OPTIONS,
    DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE,
} from 'models/ui/constants'

import {
    getSelectedScene,
    getSelectedComposition,
    getIsMinimumExpertCheckCartValue,
    getIsMinimumExpertCheckItemCount,
    getIsMinimumExpertCheckCalloutTimeoutItemCount,
} from 'models/compositions/selectors'
import { getPreviewSettings } from 'models/preview/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import { getFurnitureSwapCount } from 'models/sessionStorage/selectors'
import * as UIConstants from 'models/ui/constants'

import { getDecidedFlags } from 'models/experiments/selectors'
import { getCountryCode, getRegion } from 'models/location/selectors'

const getDesignSidepanelOpenRaw = (state) => state.ui.designSidepanelOpen
const getOnboarding = (state) => state.ui.onboarding
const getFeedbackForm = (state) => state.ui.feedbackForm
export const getPromptVisibility = (state) => state.ui.feedbackForm.promptVisibility

export const getUIStateLoaded = (state) => state.ui.uiStateLoaded
export const getArtOpen = (state) => state.ui.artOpen
export const getDesignSidepanelPinned = (state) => state.ui.designSidepanelPinned
export const getDesignSidepanelModeRaw = (state) => state.ui.designSidepanelMode
export const getShouldPresentItemSelection = (state) => state.ui.shouldPresentItemSelection
export const getArtTrayFilter = (state) => state.ui.artTrayFilter || ART_FILTER_FULL
export const getSharePanelOpen = (state) => state.ui.sharePanelOpen
export const getFilterModalOpen = (state) => state.ui.filterModalOpen
export const getShowSwapMenu = (state) => state.ui.showSwapMenu
export const getShowMissingWallsModal = (state) => state.ui.showMissingWallsModal
export const getShowLoginPromptModal = (state) => state.ui.showLoginPromptModal
export const getShowDesignSummary = (state) => state.ui.showDesignSummary
export const getShowMoreMenu = (state) => state.ui.showMoreMenu
export const getShowSaveMenu = (state) => state.ui.showSaveMenu
export const getShouldShowOnboarding = (state) => state.ui.shouldShowOnboarding
export const getSeenDashboard = (state) => state.ui.seenDashboard
export const getShowAppDownloadModal = (state) => state.ui.showAppDownloadModal
export const getShowUploadImageModal = (state) => state.ui.showUploadImageModal
export const getHasSeenFeedbackFormOnce = (state) => state.ui.feedbackForm.hasSeenFeedbackFormOnce
export const getHasSeenFeedbackForm = (state) => state.ui.feedbackForm.hasSeenFeedbackForm
export const getHasSeenBeautifyFeedback = (state) => state.ui.feedbackForm.hasSeenBeautifyFeedback
export const getShowDeleteModal = (state) => state.ui.showDeleteModal
export const getDeleteType = (state) => state.ui.deleteType
export const getItemsToDelete = (state) => state.ui.toDelete
export const getSceneTypeLabel = (state) => state.ui.sceneTypeLabel
export const getSavingUsingModal = (state) => state.ui.savingUsingModal
export const getShouldShowChangeView = (state) => state.ui.showChangeView
export const getShouldShowDollhouseViews = (state) => state.ui.showDollhouseViews
export const getShouldShowMeasurementsPopover = (state) => state.ui.showMeasurementsPopover
export const getShowGoesWithTab = (state) => state.ui.showGoesWithTab
export const getOrientation = (state) => state.ui.orientation
export const getExpertCheckPanelOpen = (state) => state.ui.expertCheckPanelOpen
export const getSeenExpertCheck = (state) => state.ui.seenExpertCheck
export const getShowExpertCheckCalloutFromTimeout = (state) => state.ui.shownExpertCheckCalloutFromTimeout
export const getDismissedExpertCheckCalloutFromTimeout = (state) => state.ui.dismissedExpertCheckCalloutFromTimeout
export const getPinsVisibility = (state) => state.ui.pinsVisibility
export const getShouldShowColorPicker = (state) => state.ui.showColorPicker
export const getShouldShowImperialMeasurements = (state) => state.ui.showImperialMeasurements
export const getProductDimensionsEnabled = (state) => state.ui.measurementsPopover.productDimensionsEnabled
export const getRoomDimensionsEnabled = (state) => state.ui.measurementsPopover.roomDimensionsEnabled
export const getDynamicMeasurementsEnabled = (state) => state.ui.measurementsPopover.dynamicMeasurementsEnabled
export const getShouldAutoShowRoomBuilderModal = (state) => state.ui.autoShowRoomBuilderModal
export const getWalkedToId = (state) => state.ui.walkedToId
export const getZoomLevel = (state) => state.ui.zoomLevel
export const getRoomBuilderEditorInfo = (state) => state.ui.roomBuilderEditor

export const getStarterSetPopupVisible = (state) => state.ui.starterSet.isPopupVisible
export const getStarterSetSidebarVisible = (state) => state.ui.starterSet.isStarterSetSidebarVisible

/** @returns {import('services/uiState').UiState} */
export const getUISaveData = (state) => {
    const {
        onboarding,
        magicEraserOnboarding,
        feedbackForm,
        seenDashboard,
        seenExpertCheck,
        shownExpertCheckCalloutFromTimeout,
        dismissedExpertCheckCalloutFromTimeout,
        measurementsPopover,
        roomBuilderEditor,
    } = state.ui
    return {
        onboarding,
        magicEraserOnboarding,
        feedbackForm,
        seenDashboard,
        seenExpertCheck,
        shownExpertCheckCalloutFromTimeout,
        dismissedExpertCheckCalloutFromTimeout,
        measurementsPopover,
        roomBuilderEditor,
        hideImageViewerDisclaimerPermanently: state.beautifier.hideImageViewerDisclaimerPermanently,
        generatedImagesByRoom: state.beautifier.generatedImagesByRoom,
    }
}

export const getCanPersonalize = createSelector(getSelectedComposition, (comp) => !!comp && !!comp.renderItems.length)

export const getAvailableItemSelections = createSelector(
    [getSelectedScene, getDebugSettings],
    (selectedScene, debugSettings) => {
        if (!selectedScene) {
            return { furniture: true, art: false }
        }

        const artEnabled = selectedScene.hasWall && debugSettings.enableWalls
        const furnitureEnabled = !artEnabled || selectedScene.hasFloor // if no walls, allow furniture
        return {
            furniture: furnitureEnabled,
            art: artEnabled,
        }
    },
)

export const getDesigningEnabled = createSelector(
    [getPreviewSettings],
    (previewSettings) => !previewSettings.onOffOptions.magicEraserMode,
)

export const getDesignSidepanelMode = createSelector(
    [getCanPersonalize, getDesignSidepanelModeRaw],
    (canPersonalize, mode) => {
        if (mode === DESIGN_SIDEPANEL_MODE_OPTIONS && !canPersonalize) {
            return DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE
        }
        return mode
    },
)

/** @type {(state: import('store').RootState) => import('./types').DesignSidepanelOverlay | null} */
export const getDesignSidepanelVisibleOverlay = (state) => state.ui.designSidepanelVisibleOverlay

export const getDesignSidepanelOpen = createSelector(
    [getDesignSidepanelOpenRaw, getDesigningEnabled],
    (isOpen, canBeOpen) => canBeOpen && isOpen,
)

export const getAreOptionsVisible = createSelector(
    [getDesignSidepanelOpen, getDesignSidepanelMode],
    (isOpen, mode) => isOpen && mode === DESIGN_SIDEPANEL_MODE_OPTIONS,
)

export const getSelectedSidepanelTabs = createSelector([getDesignSidepanelMode], (mode) => ({
    isSwapSelected: [
        UIConstants.DESIGN_SIDEPANEL_MODE_SWAP_BROWSE,
        UIConstants.DESIGN_SIDEPANEL_MODE_SWAP_DETAILS,
    ].includes(mode),
    isBrowseSelected: [
        UIConstants.DESIGN_SIDEPANEL_MODE_PRODUCT_BROWSE,
        UIConstants.DESIGN_SIDEPANEL_MODE_PRODUCT_DETAILS,
    ].includes(mode),
    isMyListSelected: [
        UIConstants.DESIGN_SIDEPANEL_MODE_MYITEMS_BROWSE,
        UIConstants.DESIGN_SIDEPANEL_MODE_MYITEMS_DETAILS,
    ].includes(mode),
    isFavoritesSelected: [
        UIConstants.DESIGN_SIDEPANEL_MODE_FAVORITES_BROWSE,
        UIConstants.DESIGN_SIDEPANEL_MODE_FAVORITES_DETAILS,
    ].includes(mode),
    isDebugSelected: mode === UIConstants.DESIGN_SIDEPANEL_MODE_DEBUG,
    isRateSelected: mode === UIConstants.DESIGN_SIDEPANEL_MODE_RATE,
}))

export const getHasSeenOnboarding = createSelector([getOnboarding], (onboarding) => onboarding.hasSeenOnboarding)

export const getShouldShowFeedbackFormSwaps = createSelector(
    [getFeedbackForm, getFurnitureSwapCount],
    (feedbackForm, swaps) => {
        const hasCompletedSwaps = Number(swaps) >= UIConstants.MIN_SWAPS_FOR_SURVEY
        if (!feedbackForm.hasSeenFeedbackForm && hasCompletedSwaps) {
            return true
        }
        return false
    },
)

export const getShouldShowFeedbackForm = createSelector(
    [getFeedbackForm],
    (feedbackForm) => feedbackForm.hasSeenFeedbackForm,
)

export const getShouldShowExpertCheck = createSelector(
    [getDecidedFlags, getRegion],
    (flags, region) => region === 'us/en' || flags.ExpertCheck,
)

export const getIsRoomBuilderEditorAvailable = createSelector(
    [getDecidedFlags, getCountryCode],
    (flags, country) => ['au', 'gb'].includes(country) || flags.RoomBuilderEditor,
)

export const getShouldShowExpertCheckCallout = createSelector(
    [
        getDismissedExpertCheckCalloutFromTimeout,
        getShowExpertCheckCalloutFromTimeout,
        getSeenExpertCheck,
        getIsMinimumExpertCheckCartValue,
        getIsMinimumExpertCheckItemCount,
        getIsMinimumExpertCheckCalloutTimeoutItemCount,
    ],
    (
        dismissedExpertCheckCalloutFromTimeout,
        shouldShowExpertCheckCalloutFromTimeout,
        hasSeenExpertCheck,
        isMinimumCartValue,
        isMinimumItemCount,
        isMinimumItemCountForCalloutTimeout,
    ) => {
        // Requirements:
        // 1. Show the callout if the user has not seen expert check before and it fulfills the minimum cart value and item count
        // 2. Show the callout if the user has reached the timeout (even if min cart value and item count are not fulfilled)
        // 3. Don't show the callout ever again if the user dismissed it after reaching the timeout
        if (dismissedExpertCheckCalloutFromTimeout) {
            return false
        }

        return (
            (shouldShowExpertCheckCalloutFromTimeout && isMinimumItemCountForCalloutTimeout) ||
            (!hasSeenExpertCheck && isMinimumCartValue && isMinimumItemCount)
        )
    },
)

export const getInvalidLocalItemNumbers = (state) => state.ui.invalidLocalItemNumbers
