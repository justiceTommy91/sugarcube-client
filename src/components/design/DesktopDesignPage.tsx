/*
    This is the Design page, the DnD
    composition editor.
*/
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link, navigate } from 'gatsby'
import classNames from 'classnames'
import { Trans, useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import { useStore } from 'react-redux'
import { RootState } from 'store'

// Drag and Drop feature imports
import { ConditionalDropZoneWrapper } from 'features/drag-and-drop-product/components'
import * as cartApi from 'services/spiderpigs'
import { getAuthToken } from 'services/authToken'
import {
    getShouldPresentItemSelection,
    getShowDesignSummary,
    getSharePanelOpen,
    getDesigningEnabled,
    getShouldShowFeedbackForm,
    getShouldShowFeedbackFormSwaps,
    getDesignSidepanelOpen,
    getShouldShowColorPicker,
    getStarterSetPopupVisible,
    getStarterSetSidebarVisible,
    getPromptVisibility,
    getHasSeenBeautifyFeedback,
} from 'models/ui/selectors'
import {
    getActiveSceneId,
    getSelectedComposition,
    getSelectedCompositionId,
    getSelectedCompositionTrackingRoomInfo,
    getSelectedCompositionRenderedItemsTotalPrice,
    getSelectedCompositionShoppableProductData,
    getIsSaving,
    getIsSaved,
    getForceSmartaOff,
    getIsModified,
    getHasSaveError,
} from 'models/compositions/selectors'
import { CompositionSavedFrom, CompositionSaveTrackingInfo } from 'models/compositions'
import { getCanBeAdmin, getIsAdmin, getIsLoggedIn } from 'models/user/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import { getHasSceneLoadFailure, getLowPerformanceCause, getViewports } from 'models/renderer/selectors'
import { getIsBeautifying, getIsViewerOpen, getBeautifierErrorMessage } from 'models/beautifier/selectors'
import { closeImageViewer, setActiveRoomKey, buildRoomKey } from 'models/beautifier/slice'
import { getPreviewSettings } from 'models/preview/selectors'
import { getIkeaHomeUrl, getPlannerDashboardUrl, getRegion, getUrlContext, getWindow } from 'models/location/selectors'
import { getAddToCartUrl } from 'utils/buildUrls'
import {
    openDesignLab as openDesignLabAction,
    showDesignSummary as showDesignSummaryAction,
    toggleSharePanelOpen as toggleSharePanelOpenAction,
    showLoginPromptModal,
    setStarterSetPopupVisible,
    setStarterSetSidebarVisible,
    setPromptVisibility,
} from 'models/ui/actions'
import {
    selectCompositionRenderItem as selectCompositionRenderItemAction,
    saveSelectedComposition as saveSelectedCompositionAction,
    saveCompositionBeforeSharing as saveAndShareAction,
    type TrackingInfo,
    setSmartaTimeout,
    resetPlaceProduct,
    resetCompositionToLatestSavedState,
} from 'models/compositions/actions'
import { getIsProductContext, getContextFromReferrer } from 'models/referrer/selector'
import { getChosenVariations } from 'models/experiments/selectors'
import { exitDesign as exitDesignAction } from 'models/location/actions'
import { isUnsupportedBrowser } from 'utils/browser'
import { error, track, shouldShowFeedbackForm } from 'utils/tracker'
import { useTrackDesignContext } from 'hooks/useTrackDesignContext'
import SugarcubeContext from 'apps/SugarcubeContext'
import DebugHotkeysContainer from 'containers/admin/DebugHotkeysContainer'
import { DebugConsole } from 'components/admin/DebugConsole'
import PreviewHeaderContainer from 'containers/design/PreviewHeaderContainer'
import { DesignSidepanel } from 'components/DesignSidepanel'
import { PAXImportLoadingOverlay } from 'components/configurableProducts/PAXImportLoadingOverlay'
import PreviewContainer from 'containers/PreviewContainer'
import SharePanelContainer from 'containers/design/SharePanelContainer'
import OnboardingModalContainer from 'containers/design/OnboardingModalContainer'
import DesignSurveyContainer from 'containers/design/DesignSurveyContainer'
import LoginPromptModalContainer from 'containers/accountAccess/LoginPromptModalContainer'
import LoadFailedModalContainer from 'containers/LoadFailedModalContainer'
import AppDownloadQRModal from 'components/AppDownloadQRModal'
import { CONTEXT_ROOM } from 'constants/contexts'
import SSRIcon from '@ingka/ssr-icon'
import feedbackSad from '@ingka/ssr-icon/paths/feedback-sad'
import { GeomViewer } from 'Renderer/geomviewer'
import { useAppSelector, useAppDispatch, useExperiments } from 'hooks'
import { APP_STORE_SOURCE_WEB_DESIGN, TRACK_LOCATION_DESIGN_SUMMARY } from 'models/tracking/constants'
import { clearFurnitureSearch, selectFurniture } from 'models/furniture/actions'

import { withTrackingBoundary } from 'apps/TrackingBoundary'
import MultiView from 'components/MultiView'
import DesignToolbar from 'components/DesignToolbar/DesignToolbar'
import { DesignToolbarContextProvider } from 'components/DesignToolbar/DesignToolbarContext'
import SceneToolbar from 'components/DesignToolbar/SceneToolbar'
import { useShoppingBag } from 'features/shopping-bag'
import DesignSummaryExitPopup from 'features/checkout-summary/DesignSummaryExitPopup'
import DesignSummaryModalContainer from 'features/checkout-summary/DesignSummaryModalContainer'
import { SOURCETYPE_CAPTURED, SOURCETYPE_FMF_LITE, SOURCETYPE_LITE_SCAN } from 'models/scenes/constants'
import { allScenesAreStandard3D } from 'models/scenes/utils'
import { hasPendingKreativLiteGuestSave } from 'utils/kreativLiteGuestMerge'

import StarterSetModal from 'components/StarterSet/StarterSetModal'
import { ImageGalleryModalFromContext } from 'components/DesignSidepanel/ProductDetails/ImageGalleryModalFromContext'
import LowPerformanceModal from './LowPerformanceModal'
import AppDescriptionForScreenReader from './AppDescriptionForScreenReader'
import KioskShare from './KioskShare'
import DesignSummarySavePopup from './DesignSummarySavePopup'
import ExpertCheckSidePanel from './ExpertCheckSidePanel'
import { DesignSidepanelContextProvider, DesignSidepanelView, useDesignSidebarContext } from './DesignSidepanelContext'
import ZoomControls from './ZoomControls'
import BeautifyButton from './BeautifyButton'

require('./DesktopDesignPage.scss')

const MULTIVIEW_CAROUSEL_HEIGHT = 180

const BeautifierSceneLoadReset = () => {
    const dispatch = useAppDispatch()
    const activeSceneId = useAppSelector(getActiveSceneId)
    const compositionId = useAppSelector(getSelectedCompositionId)
    const isBeautifierViewerOpen = useAppSelector(getIsViewerOpen)
    const { displaySidepanelView, expandSidepanel } = useDesignSidebarContext()
    const lastHandledSceneIdRef = useRef<string | null>(null)
    const prevRoomKeyRef = useRef<string | null>(null)

    useEffect(() => {
        const roomKey = buildRoomKey(activeSceneId, compositionId)
        if (roomKey !== prevRoomKeyRef.current) {
            prevRoomKeyRef.current = roomKey
            dispatch(setActiveRoomKey(roomKey))
        }
    }, [activeSceneId, compositionId, dispatch])

    useEffect(() => {
        if (!activeSceneId || lastHandledSceneIdRef.current === activeSceneId) {
            return
        }

        lastHandledSceneIdRef.current = activeSceneId

        if (!isBeautifierViewerOpen) {
            return
        }
        // A newly loaded scene should always start in the normal design view.
        displaySidepanelView(DesignSidepanelView.ADD)
        expandSidepanel()
        dispatch(closeImageViewer())
    }, [activeSceneId, dispatch, displaySidepanelView, expandSidepanel, isBeautifierViewerOpen])

    return null
}

// Helper component to conditionally wrap with drop zone functionality
const DesktopDesignPage = withTrackingBoundary('DesignPage')(() => {
    const { t } = useTranslation('translation')
    const dispatch = useAppDispatch()
    const store = useStore<RootState>()
    const { isPipIntegration } = getUrlContext()

    const {
        promptVisibility,
        composition,
        isDesignSummaryVisible,
        roomInfo,
        hasSeenFeedbackForm,
        hasSeenBeautifyFeedback,
        settings,
        shouldShowColorPicker,
        isModified,
        isProductContext,
        context,
        experiments,
        starterSetPopupVisible,
        starterSetSidebarVisible,
        ...state
    } = useAppSelector((appState) => ({
        promptVisibility: getPromptVisibility(appState),
        composition: getSelectedComposition(appState),
        itemsPresenting: getShouldPresentItemSelection(appState),
        isAdmin: getIsAdmin(appState),
        canBeAdmin: getCanBeAdmin(appState),
        debugSettings: getDebugSettings(appState),
        lowPerformanceCause: getLowPerformanceCause(appState),
        roomInfo: getSelectedCompositionTrackingRoomInfo(appState),
        totalPrice: getSelectedCompositionRenderedItemsTotalPrice(appState),
        addedToRoomItems: getSelectedCompositionShoppableProductData(appState),
        isSaving: getIsSaving(appState as RootState),
        hasSaveError: getHasSaveError(appState as RootState),
        isDesignSummaryVisible: getShowDesignSummary(appState),
        isLoggedIn: getIsLoggedIn(appState),
        isSharePanelOpen: getSharePanelOpen(appState),
        isDesigningEnabled: getDesigningEnabled(appState),
        hasSceneLoadFailure: getHasSceneLoadFailure(appState),
        settings: getPreviewSettings(appState),
        hasSeenFeedbackForm: getShouldShowFeedbackForm(appState),
        hasSeenBeautifyFeedback: getHasSeenBeautifyFeedback(appState),
        hasNotSeenFeedbackFormSwaps: getShouldShowFeedbackFormSwaps(appState),
        viewports: getViewports(appState),
        isSidepanelOpen: getDesignSidepanelOpen(appState),
        isSaved: getIsSaved(appState),
        isModified: getIsModified(appState),
        shouldShowColorPicker: getShouldShowColorPicker(appState),
        isProductContext: getIsProductContext(appState),
        context: getContextFromReferrer(appState),
        experiments: getChosenVariations(appState),
        starterSetPopupVisible: getStarterSetPopupVisible(appState),
        starterSetSidebarVisible: getStarterSetSidebarVisible(appState),
    }))

    const selectCompositionRenderItem = (itemId: number) => dispatch(selectCompositionRenderItemAction(itemId))
    const closeStarterSetPopup = () => dispatch(setStarterSetPopupVisible(false))
    const openStarterSetSidePanel = () => dispatch(setStarterSetSidebarVisible(true))
    const saveSelectedComposition = (trackingInfo?: CompositionSaveTrackingInfo) =>
        dispatch(saveSelectedCompositionAction(trackingInfo))
    const saveAndShare = (trackingInfo?: CompositionSaveTrackingInfo) => dispatch(saveAndShareAction(trackingInfo))
    const openDesignLab = () => dispatch(openDesignLabAction())
    const showDesignSummary = (show: boolean) => dispatch(showDesignSummaryAction(show))
    const toggleSharePanelOpen = (trackingInfo?: TrackingInfo) => dispatch(toggleSharePanelOpenAction(trackingInfo))
    const showLoginModal = (show: boolean) => dispatch(showLoginPromptModal(show))
    const contentContainerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const previewContainerRef = useRef<HTMLDivElement>(null)
    const { openBag: openShoppingBag } = useShoppingBag()

    const { isMobile, isKiosk, isInIframe, isUpptacka, isLivingRoomIntegration, isRoomPlannerIntegration } =
        useContext(SugarcubeContext)

    const [contentHeight, setContentHeight] = useState<number | null>(null)
    const [showSavePopup, setShowSavePopup] = useState<{ isLogoPress?: boolean; show: boolean }>({
        isLogoPress: undefined,
        show: false,
    })
    const [showShare, setShowShare] = useState(false)
    const [showExitPopup, setShowExitPopup] = useState(false)
    const [multiViewPosition, setMultiViewPosition] = useState('top')

    const isTrackingEnabled = shouldShowFeedbackForm()
    const missingItemsWarning = composition ? composition.isMissingItems : false
    const unsupportedBrowserWarning = isUnsupportedBrowser()
    const showSaveShareButton = isKiosk && state.isLoggedIn
    const showHiddenLoginButton = isKiosk && !state.isLoggedIn

    // TODO: Change to checking for viewports when backend changes are merged
    const showMultiView = state.viewports.length > 1
    const isBeautifyFeedback = promptVisibility?.source === 'beautify'
    const isFeedbackFormVisible =
        promptVisibility?.visible && (isBeautifyFeedback ? !hasSeenBeautifyFeedback : !hasSeenFeedbackForm)

    const isReadOnly = state.debugSettings.disable3DCompositionSave && composition?.isGLTF
    const canSave = !state.isSaving && isModified && !isReadOnly

    const onSaveShareClick = useCallback(() => {
        if (composition) {
            saveAndShare()
            setShowShare(true)
        }
    }, [composition, isKiosk])

    const deselectItems = useCallback(() => {
        if (!isMobile && !isLivingRoomIntegration) {
            selectCompositionRenderItem(-1)
            GeomViewer.bindings?.doAction('deselect-all')
        }
    }, [isMobile])

    const handleDeselectAll = () => {
        dispatch(selectCompositionRenderItemAction(-1))
        GeomViewer.bindings?.doAction('exit-placement-mode')
    }

    const handleCloseModal = () => {
        showDesignSummary(false)
        handleDeselectAll()
    }

    const closeModalAndPopup = () => {
        setShowSavePopup({ show: false })
        showDesignSummary(false)
        handleDeselectAll()
        // Push again the current state to keep the user on the page
        // This is helpful for when the user dismiss the save dialog to trigger
        // it once gain in the next exit (go back) attempt
        window.history.pushState(null, '', window.location.href)
    }

    const resetComposition = () => {
        if (composition?.id) {
            selectCompositionRenderItem(-1)
            dispatch(resetCompositionToLatestSavedState(composition.id))
        }
    }

    const hasStartedExitWithoutSavingRef = useRef(false)

    const exit = () => {
        if (isInIframe) {
            openDesignLab()
        } else if (isLivingRoomIntegration && !isRoomPlannerIntegration) {
            dispatch(resetPlaceProduct())
            navigate(showSavePopup.isLogoPress ? getIkeaHomeUrl() : `/living-room`)
        } else {
            // Always reset placeProductId when exiting to prevent auto-placement in subsequent designs
            dispatch(resetPlaceProduct())

            // For ContextualDashboard (non-PIP) product context, preserve productId in URL
            // For PIP integration, do NOT preserve productId to avoid auto-placement in next design
            let dashboardUrl = isRoomPlannerIntegration ? getPlannerDashboardUrl() : `/dashboard`
            if (!isRoomPlannerIntegration && !isPipIntegration && context?.type === 'product') {
                dashboardUrl = `/dashboard?productId=${context.value}`
            }

            navigate(showSavePopup.isLogoPress ? getIkeaHomeUrl() : dashboardUrl)
        }
    }

    const exitWithoutSaving = () => {
        if (hasStartedExitWithoutSavingRef.current) {
            return
        }

        hasStartedExitWithoutSavingRef.current = true
        setShowSavePopup({ show: false })
        showDesignSummary(false)
        resetComposition()
        exit()
    }

    const exitDesign = () => {
        handleDeselectAll()
        resetComposition()

        // On non-mobile devices simply exit.
        if (!isMobile) {
            dispatch(exitDesignAction())
            return
        }

        // On mobile devices check if the feedback form has been displayed and
        // display it if not.
        if (state.hasNotSeenFeedbackFormSwaps) {
            dispatch(setPromptVisibility(true, promptVisibility?.timeDelay ?? 0))
            return
        }

        dispatch(exitDesignAction())
    }

    const checkout = () => {
        if (cartApi.isAuthenticated()) {
            openShoppingBag()
            return
        }

        const productIds = state.addedToRoomItems.map((item) => item.localItemNumber)
        const region = getRegion()
        const shoppingCartUrl = getAddToCartUrl(productIds, region)
        if (!shoppingCartUrl) {
            return
        }
        window.open(shoppingCartUrl, `_blank`)
    }

    // KLUDGE: we currently don't have a way to wait for a save action to finish,
    // so instead we listen to the change in save state and compare it to the last
    // save state. If save state transitioned from true to false, we infer that the
    // save was successful and trigger any callbacks registered.
    const prevIsSavingRef = useRef<boolean>(state.isSaving)
    const saveCallbacksRef = useRef<Array<() => void>>([])
    const registerSaveCallback = (callback: () => void): void => {
        saveCallbacksRef.current.push(callback)
    }
    useEffect(() => {
        const saveSucceeded = prevIsSavingRef.current && !state.isSaving
        prevIsSavingRef.current = state.isSaving

        if (!saveSucceeded) {
            return
        }

        saveCallbacksRef.current.forEach((cb) => {
            cb()
        })
        saveCallbacksRef.current = []
    }, [state.isSaving])

    const exitTimeoutRef = useRef<number>()
    const saveAndExit = () => {
        const isGuestKLite = getAuthToken()?.type === 'guest' && composition?.scene?.sourceType === SOURCETYPE_LITE_SCAN
        if (isGuestKLite) {
            // Guest save: dismiss exit modal, trigger silent background save (which opens the login modal).
            // Don't register an exit callback — navigation is owned by the post-merge flow.
            closeModalAndPopup()
            saveSelectedComposition({ SavedFrom: TRACK_LOCATION_DESIGN_SUMMARY })
            return
        }
        if (!state.isLoggedIn) {
            closeModalAndPopup()
            showLoginModal(true)
            return
        }
        saveSelectedComposition({
            SavedFrom: TRACK_LOCATION_DESIGN_SUMMARY,
        })
        registerSaveCallback(() => {
            resetComposition()
            exitTimeoutRef.current = window.setTimeout(exit, 1_000)
        })
    }

    const exitToRoomBuilderPage = (trackLocation: CompositionSavedFrom) => {
        if (canSave) {
            if (!state.isLoggedIn) {
                closeModalAndPopup()
                showLoginModal(true)
                return
            }

            saveSelectedComposition({
                SavedFrom: trackLocation,
            })
        } else {
            exitWithoutSaving()
        }
    }

    // Ensure that we properly clean up the timeout in saveAndExit if
    // the page unmounts before the timeout executes (e.g. user clicked
    // on the back button or link).
    useEffect(() => {
        if (exitTimeoutRef.current !== undefined) {
            clearTimeout(exitTimeoutRef.current)
            exitTimeoutRef.current = undefined
            resetComposition()
        }
    }, [])

    useTrackDesignContext(composition)

    useEffect(() => {
        const updateContentHeight = () => {
            if (contentContainerRef.current) {
                const containerRect = contentContainerRef.current.getBoundingClientRect()
                setContentHeight(containerRect.height)
            }
        }

        updateContentHeight()

        window.addEventListener('resize', updateContentHeight)

        return () => {
            window.removeEventListener('resize', updateContentHeight)
        }
    }, [])

    useEffect(() => {
        const updateMultiViewPosition = () => {
            const pageHeight = getWindow().innerHeight
            const previewRect = previewContainerRef.current?.getBoundingClientRect()

            if (pageHeight && previewRect?.height) {
                const previewBottom = previewRect.bottom
                const spaceUnderPreview = pageHeight - previewBottom
                const fitsUnderneath = spaceUnderPreview > MULTIVIEW_CAROUSEL_HEIGHT

                setMultiViewPosition(fitsUnderneath ? `bottom` : `top`)
            }
        }

        if (isUnsupportedBrowser()) {
            error('UnsupportedBrowser')
        }

        window.addEventListener('resize', updateMultiViewPosition)
        updateMultiViewPosition()

        if (isDesignSummaryVisible) {
            handleCloseModal()
        }

        return () => {
            window.removeEventListener('resize', updateMultiViewPosition)

            if (state.isSharePanelOpen) {
                toggleSharePanelOpen()
            }

            dispatch(clearFurnitureSearch())
        }
    }, [])

    const prevCompositionRef = useRef<typeof composition>()
    useEffect(() => {
        if (
            composition &&
            composition.isMissingItems &&
            (!prevCompositionRef.current || composition.isMissingItems !== prevCompositionRef.current.isMissingItems)
        ) {
            track('DecorateRoom.Design.MissingProductsWarning', roomInfo)
        }
        prevCompositionRef.current = composition
    }, [composition, roomInfo])

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            // We want to let people navigate without the popup if they are trying to log in/sign up
            // the login action will take care of saving a local state of the composition to be restored
            // and saved after the user is redirected from a successful log in.
            //
            // KLite guest save pending: the backend already has the composition (it succeeded
            // under the guest token); the merge POST will transfer ownership on the next OAuth
            // return. The "unsaved changes" warning would be misleading — there is nothing to
            // lose. isModified stays true intentionally so the save button keeps prompting the
            // user to log in.
            if (hasPendingKreativLiteGuestSave()) {
                return
            }
            // Read at unload time because login navigation clears isModified before leaving,
            // but this stable listener may still hold the pre-clear render value.
            if (getIsModified(store.getState())) {
                event.preventDefault()
                // eslint-disable-next-line no-param-reassign
                event.returnValue = ''
            }
        }

        const handleBackButton = (event: PopStateEvent) => {
            track('DecorateRoom.BackButtonPressed', roomInfo)
            // Read directly from Redux because a successful first save can update
            // isModified before React has re-rendered this popstate listener. Using
            // the render-scoped value can treat post-save URL canonicalization as an
            // unsaved back navigation and open the save-exit popup incorrectly.
            if (getIsModified(store.getState())) {
                event.preventDefault()
                // Block later window popstate listeners from resetting composition state under this modal.
                event.stopImmediatePropagation()
                setShowSavePopup({ show: true })
            } else if (window.history.state) {
                resetComposition()
                // Manually go back again to go back past the artificial state we pushed initially.
                // Since we are once again firing a popstate with window.history.back
                // we check if the window.history.state is still there to make sure we only do this once
                window.history.back()
            }
        }

        window.addEventListener('popstate', handleBackButton, { capture: true })
        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('popstate', handleBackButton, { capture: true })
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [roomInfo, store])

    useEffect(() => {
        // Push the initial state to the history stack when the page loads. Only run once on initial load.
        // This prevents the user from navigating away (via back button) until they decide what to do with unsaved changes.
        window.history.pushState(null, '', window.location.href)
    }, [])

    const { variations } = useExperiments()
    const isBeautifierEnabled = variations.Beautifier === 'enabled'
    const isBeautifying = useAppSelector(getIsBeautifying)
    const isBeautifierViewerOpen = useAppSelector(getIsViewerOpen)
    const hasBeautifierError = !!useAppSelector(getBeautifierErrorMessage)

    useEffect(() => {
        if (!isBeautifying) {
            return
        }

        dispatch(selectCompositionRenderItemAction(-1))
        dispatch(selectFurniture(null))
        GeomViewer.bindings?.doAction('deselect-all')
    }, [dispatch, isBeautifying])

    const forceSmartaOff = useAppSelector(getForceSmartaOff)
    useEffect(() => {
        if (forceSmartaOff) {
            dispatch(setSmartaTimeout(0))
        } else {
            dispatch(setSmartaTimeout(500))
        }
    }, [forceSmartaOff])

    const viewerInfo = GeomViewer.bindings?.queryViewerInfo()
    const isSingleViewScan = [SOURCETYPE_CAPTURED, SOURCETYPE_LITE_SCAN, SOURCETYPE_FMF_LITE].includes(
        composition?.scene?.sourceType ?? 0,
    )
    const isHelaScene =
        allScenesAreStandard3D(composition?.scene) || isUpptacka || viewerInfo?.cameraState?.orbitModeAllowed
    const displayDesignToolbar = (!isUpptacka && !isSingleViewScan) || isHelaScene
    const showMagicEraseMode = composition && composition.canMagicErase && isSingleViewScan && !isHelaScene

    if (state.lowPerformanceCause) {
        return <LowPerformanceModal cause={state.lowPerformanceCause} />
    }
    return (
        <DesignSidepanelContextProvider>
            <DesignToolbarContextProvider>
                <BeautifierSceneLoadReset />
                <div id="DesktopDesignPage">
                    <Link to="/" />
                    <AppDescriptionForScreenReader />
                    {state.isAdmin || state.canBeAdmin ? <DebugHotkeysContainer /> : null}
                    {state.debugSettings.showDebugConsole && <DebugConsole />}
                    <div
                        className={classNames('contentContainer', {
                            isModalOpen: isDesignSummaryVisible,
                        })}
                        data-drag-drop-container="true"
                    >
                        <div className="designHeader">
                            <PreviewHeaderContainer
                                toggleSaveModal={(show: boolean) => setShowSavePopup({ show })}
                                magicEraserMode={settings.onOffOptions.magicEraserMode && !isSingleViewScan}
                                deselectItems={deselectItems}
                            />
                        </div>
                        <div
                            className={classNames('unsupportedBrowserWarning', { visible: unsupportedBrowserWarning })}
                        >
                            <Trans i18nKey="common.unsupportedBrowserWarning">
                                Your browser is not officially supported at this time. You may be see unexpected
                                behavior and find that some features do not work as expected.
                                <br />
                                Please use Mozilla Firefox or Google Chrome for a more reliable experience.
                            </Trans>
                        </div>
                        {settings.onOffOptions.magicEraserMode ? null : <DesignSidepanel />}
                        <div className={classNames('missingItemsWarning', { visible: missingItemsWarning })}>
                            {t('common.items missing')}
                        </div>
                        <ConditionalDropZoneWrapper
                            dropMessage={t('design.drop to add to room', 'Drop to add to room')}
                        >
                            <div
                                className={classNames('Viewport', {
                                    isModalOpen: isDesignSummaryVisible,
                                    isKiosk,
                                    showMultiView,
                                    isSidepanelOpen: !state.isSidepanelOpen,
                                })}
                                ref={contentContainerRef}
                                onMouseDown={() => {
                                    // Only deselect items if there is an actual composition that may have items to be deselected.
                                    // e.g. if a non-logged in user accesses a shared composition, within the Viewport an error component
                                    // with a login button is rendered instead of the composition
                                    if (!composition) return
                                    deselectItems()
                                }}
                            >
                                <div className="content" ref={contentRef}>
                                    {isUnsupportedBrowser() ? (
                                        <div className="Icon unsupportedContent">
                                            <SSRIcon paths={feedbackSad} />
                                        </div>
                                    ) : (
                                        <div ref={previewContainerRef}>
                                            <PreviewContainer
                                                maxHeight={contentHeight}
                                                setShowDesignSummary={() => showDesignSummary(true)}
                                                onCloseMagicWindow={isMobile ? () => exitDesign() : null}
                                                showMultiView={showMultiView}
                                                multiViewPosition={multiViewPosition}
                                            />
                                        </div>
                                    )}
                                </div>

                                {isUpptacka && <MultiView />}
                                <StarterSetModal
                                    onDismiss={closeStarterSetPopup}
                                    openStarterSetSidePanel={openStarterSetSidePanel}
                                    visible={starterSetPopupVisible}
                                />
                            </div>
                        </ConditionalDropZoneWrapper>

                        <SharePanelContainer />
                        <ExpertCheckSidePanel />
                        <PAXImportLoadingOverlay />
                        {!isBeautifying && !hasBeautifierError && !isBeautifierViewerOpen && <ZoomControls />}
                        {isBeautifierEnabled && state.isLoggedIn && <BeautifyButton />}

                        {displayDesignToolbar && !isBeautifying && !isBeautifierViewerOpen && (
                            <DesignToolbar
                                showMagicEraseMode={showMagicEraseMode}
                                sceneId={composition?.sceneId}
                                compositionId={composition?.id}
                                exitToRoomBuilderPage={exitToRoomBuilderPage}
                            />
                        )}

                        {showMagicEraseMode && !isBeautifying && !hasBeautifierError && !isBeautifierViewerOpen && (
                            <SceneToolbar exitToRoomBuilderPage={exitToRoomBuilderPage} />
                        )}

                        {showSaveShareButton && (
                            <div className="footer">
                                <Button
                                    onClick={onSaveShareClick}
                                    text={t('kiosk.save & share')}
                                    type="primary"
                                    className="shareButton"
                                />
                            </div>
                        )}

                        {showHiddenLoginButton && (
                            <div className="footer">
                                <button onClick={() => window.open('/login', '_self')} className="hiddenLoginButton" />
                            </div>
                        )}
                        {composition && isKiosk && showShare && (
                            <KioskShare closeModal={() => setShowShare(false)} uuid={composition.uuid} />
                        )}
                        {isDesignSummaryVisible && (
                            <DesignSummaryModalContainer
                                exitDesignSummary={exitDesign}
                                closeModal={handleCloseModal}
                                openExitPopup={
                                    isMobile ? () => setShowExitPopup(true) : () => setShowSavePopup({ show: true })
                                }
                            />
                        )}
                        {showSavePopup.show && !isMobile && (
                            <DesignSummarySavePopup
                                onClose={closeModalAndPopup}
                                onClickGoBack={exitWithoutSaving}
                                onClickSave={saveAndExit}
                                isSaving={state.isSaving}
                                hasSaveError={state.hasSaveError}
                            />
                        )}
                        {showExitPopup && isMobile && (
                            <DesignSummaryExitPopup
                                onClose={() => setShowExitPopup(false)}
                                onClickBack={exitDesign}
                                onClickCheckout={checkout}
                            />
                        )}
                        <OnboardingModalContainer />
                        {isFeedbackFormVisible && isTrackingEnabled && (
                            <DesignSurveyContainer
                                onClose={() => dispatch(setPromptVisibility(false, 0))}
                                feedbackDelayData={promptVisibility?.timeDelay}
                            />
                        )}
                        <LoginPromptModalContainer context={CONTEXT_ROOM} />
                        {state.hasSceneLoadFailure && <LoadFailedModalContainer />}
                    </div>
                    <AppDownloadQRModal source={APP_STORE_SOURCE_WEB_DESIGN} />
                    <ImageGalleryModalFromContext />
                </div>
            </DesignToolbarContextProvider>
        </DesignSidepanelContextProvider>
    )
})

export default DesktopDesignPage
