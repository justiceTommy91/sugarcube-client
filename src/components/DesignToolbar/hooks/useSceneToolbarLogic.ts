import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CompositionSavedFrom } from 'models/compositions'
import { getSelectedScene } from 'models/compositions/selectors'

import { useAppDispatch, useAppSelector } from 'hooks'
import { showMeasurementsPopover } from 'models/ui/actions'
import { getShouldShowMeasurementsPopover } from 'models/ui/selectors'
import { updatePreviewSettings } from 'models/preview/actions'
import { getErasedItemsCount, getPreviewSettings } from 'models/preview/selectors'
import { hasUsedEraser } from 'models/sessionStorage/actions'
import { GeomViewer } from 'Renderer/geomviewer'
import { useTracker } from 'apps/TrackingBoundary'
import { ACTION_DIMENSIONS } from 'models/tracking/constants'
import { SOURCETYPE_LITE_SCAN } from 'models/scenes/constants'

export function useSceneToolbarLogic(exitToRoomBuilderPage: (trackLocation: CompositionSavedFrom) => void) {
    const { t } = useTranslation('translation')
    const dispatch = useAppDispatch()
    const track = useTracker()

    const previewSettings = useAppSelector(getPreviewSettings)
    const scene = useAppSelector(getSelectedScene)

    const isEditScanMode = previewSettings.onOffOptions.magicEraserMode
    const shouldShowMeasurements = useAppSelector(getShouldShowMeasurementsPopover)
    const erasedItemsCount = useAppSelector(getErasedItemsCount)
    const erasableItemsCount = GeomViewer.bindings?.queryViewerInfo()?.erasableItems
    const disableShowAll = erasedItemsCount === 0
    const disableHideAll = erasedItemsCount === erasableItemsCount

    const isKreativLiteScan = scene?.sourceType === SOURCETYPE_LITE_SCAN
    const editButtonTooltip = isKreativLiteScan ? t('design.erase items from image') : t('design.erase items from scan')

    const toolbarRef = useRef<HTMLDivElement>(null)
    const measurementsButtonId = React.useId()
    const measurementsPopoverId = React.useId()

    // Show instruction tooltip only once when entering edit mode
    const [showInstructionTooltip, setShowInstructionTooltip] = useState(false)
    const [hasSeenInstructionTooltip, setHasSeenInstructionTooltip] = useState(false)
    // Track if auto-enabled edit mode already on load, to avoid re-triggering later even if conditions still apply (like unsaved kreativ lite scans)
    const [hasAutoEnabledEditMode, setHasAutoEnabledEditMode] = useState(false)

    const dismissTooltip = useCallback(() => {
        setShowInstructionTooltip(false)
    }, [])

    const handleSaveChanges = useCallback(() => {
        dismissTooltip()
        // Exit edit scan mode after saving changes
        // Disable magic eraser mode in the renderer
        dispatch(updatePreviewSettings({ magicEraserMode: false }))
    }, [dispatch, dismissTooltip])

    const handleEditScanClick = () => {
        const newEditScanMode = !isEditScanMode

        // Enable magic eraser mode in the renderer when entering edit mode
        // Note: DesktopDesignPage now handles not hiding the sidepanel for single-view scans
        dispatch(updatePreviewSettings({ magicEraserMode: newEditScanMode }))

        // Close measurements if open when entering edit mode
        if (newEditScanMode && shouldShowMeasurements) {
            dispatch(showMeasurementsPopover(false))
        }
    }

    const handleMeasurementsClick = () => {
        dispatch(showMeasurementsPopover(!shouldShowMeasurements))

        track(ACTION_DIMENSIONS, {
            attributes: { Enabled: !shouldShowMeasurements },
        })

        if (!shouldShowMeasurements && isEditScanMode) {
            dismissTooltip()
            dispatch(updatePreviewSettings({ magicEraserMode: false }))
        }
    }

    const handleHideAll = () => {
        GeomViewer.bindings?.doAction('magic-eraser-hide-all')
        dispatch(hasUsedEraser())
    }

    const handleShowAll = () => {
        GeomViewer.bindings?.doAction('magic-eraser-show-all')
        dispatch(hasUsedEraser())
    }

    // Auto-enable edit mode if URL param is present
    useEffect(() => {
        if (typeof window !== 'undefined' && !hasAutoEnabledEditMode) {
            const urlParams = new URLSearchParams(window.location.search)
            const shouldAutoEnableEditMode = urlParams.get('editMode') === 'true'

            if (shouldAutoEnableEditMode && !previewSettings.onOffOptions.magicEraserMode) {
                dispatch(updatePreviewSettings({ magicEraserMode: true }))
                setHasAutoEnabledEditMode(true)
            }
        }
    }, [dispatch, previewSettings.onOffOptions.magicEraserMode, hasAutoEnabledEditMode])

    // Show instruction tooltip when entering edit mode for the first time
    useEffect(() => {
        if (isEditScanMode && !hasSeenInstructionTooltip) {
            setShowInstructionTooltip(true)
            setHasSeenInstructionTooltip(true)
        }
    }, [isEditScanMode, hasSeenInstructionTooltip])

    // Hide instruction tooltip on any interaction
    useEffect(() => {
        if (!showInstructionTooltip) return

        const hideTooltip = () => {
            dismissTooltip()
        }

        const hideTooltipOnKeydown = (e: KeyboardEvent) => {
            if (['Tab', 'Enter', 'Escape', ' '].includes(e.key)) {
                dismissTooltip()
            }
        }

        document.addEventListener('mousedown', hideTooltip)
        document.addEventListener('touchstart', hideTooltip)
        document.addEventListener('keydown', hideTooltipOnKeydown)

        // eslint-disable-next-line consistent-return
        return () => {
            document.removeEventListener('mousedown', hideTooltip)
            document.removeEventListener('touchstart', hideTooltip)
            document.removeEventListener('keydown', hideTooltipOnKeydown)
        }
    }, [showInstructionTooltip, dismissTooltip])

    // Exit edit mode when clicking on specific header buttons (not the design name)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isEditScanMode && toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
                // Check if click is on the header area (not the canvas)
                const designHeader = document.querySelector('.designHeader')
                const compositionTitle = document.querySelector('.compositionTitle')

                // Exit edit mode if clicking header buttons, but NOT the composition title
                if (designHeader && designHeader.contains(event.target as Node)) {
                    if (!compositionTitle || !compositionTitle.contains(event.target as Node)) {
                        handleSaveChanges()
                    }
                }
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isEditScanMode, handleSaveChanges])

    useEffect(() => {
        if (!previewSettings.onOffOptions.magicEraserMode) {
            dismissTooltip()
        }
    }, [previewSettings.onOffOptions.magicEraserMode])

    return {
        t,
        isEditScanMode,
        shouldShowMeasurements,
        disableShowAll,
        disableHideAll,
        toolbarRef,
        measurementsButtonId,
        measurementsPopoverId,
        showInstructionTooltip,
        exitToRoomBuilderPage,
        editButtonTooltip,
        handlers: {
            handleEditScanClick,
            handleSaveChanges,
            handleMeasurementsClick,
            handleHideAll,
            handleShowAll,
        },
    }
}
