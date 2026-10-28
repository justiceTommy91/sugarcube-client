import React, { useEffect, useRef, useState } from 'react'

import { useAppDispatch, useAppSelector, useMultiViewLabels, useOutsideAlerter } from 'hooks'
import { viewSelected } from 'models/preview/actions'
import { getDesignSidepanelOpen, getShouldShowChangeView, getShouldShowDollhouseViews } from 'models/ui/selectors'
import classNames from 'classnames'
import { GeomViewer } from 'Renderer/geomviewer'
import { getIsCameraInOrbitModeMoving, getViewports } from 'models/renderer/selectors'
import { Viewport } from 'models/preview'
import { getSelectedScene, getSelectedView } from 'models/compositions/selectors'
import { allScenesAreStandard3D } from 'models/scenes/utils'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

import './MultiViewModal.scss'
import { showChangeView, showDollhouseViews } from 'models/ui/actions'
import MultiViewModalViewButton from '../uiElements/MultiViewModalViewButton'

const MultiViewModal: React.FunctionComponent = () => {
    const scene = useAppSelector(getSelectedScene)
    const { isUpptacka } = useSugarcubeContext()
    const shouldShowDollhouseViews = useAppSelector(getShouldShowDollhouseViews)
    const isHelaScene = allScenesAreStandard3D(scene) || isUpptacka

    const [selectedView, setSelectedView] = useState(isHelaScene ? 'view-5' : 'mainView')
    const [hasOrbitModeBeenTriggered, setHasOrbitModeBeenTriggered] = useState(false)

    const dispatch = useAppDispatch()
    const shouldShowChangeView = useAppSelector(getShouldShowChangeView)
    const viewports: Viewport[] = useAppSelector(getViewports)
    const ref = useRef<HTMLDivElement>(null)
    const withSidepanel = useAppSelector(getDesignSidepanelOpen)
    const reduxSelectedView = useAppSelector(getSelectedView)
    const isCameraInOrbitModeMoving = useAppSelector(getIsCameraInOrbitModeMoving)

    const viewNames = useMultiViewLabels(shouldShowDollhouseViews)
    useEffect(() => {
        // Grab the selected viewport when the viewports are
        // updated instead of relying on the local default
        const info = GeomViewer.bindings?.queryViewerInfo()
        if (info?.currentView) {
            setSelectedView(info.currentView)
            dispatch(viewSelected(info.currentView, info.currentView))
        }
    }, [viewports])

    const handleViewClick = (name: string, id: string) => {
        GeomViewer.bindings?.setCurrentView?.(id)
        setSelectedView(id)
        dispatch(viewSelected(name, id))
        setHasOrbitModeBeenTriggered(false)
    }

    useEffect(() => {
        if (isCameraInOrbitModeMoving) {
            setHasOrbitModeBeenTriggered(true)
            setSelectedView('')
        }
    }, [isCameraInOrbitModeMoving])

    useEffect(() => {
        if ((!shouldShowChangeView || !shouldShowDollhouseViews) && !hasOrbitModeBeenTriggered) {
            setSelectedView(reduxSelectedView)
        }
    }, [shouldShowChangeView, reduxSelectedView, shouldShowDollhouseViews])

    useOutsideAlerter({
        ref,
        onClickOutside: () => {
            if (shouldShowChangeView) {
                dispatch(showChangeView(false))
            }

            if (shouldShowDollhouseViews) {
                dispatch(showDollhouseViews(false))
            }

            // Don't close the measurements popover from this outside alerter
            // The measurements popover has its own outside alerter
            // if (shouldShowMeasurements) {
            //     dispatch(showMeasurementsPopover(false))
            // }
        },
    })

    if (viewports.length <= 1) {
        return null
    }

    const selectedViewports = shouldShowDollhouseViews ? viewports.slice(5, 7) : viewports.slice(0, 4)

    const selectedIndex = selectedViewports.findIndex(({ id }) => id === selectedView)

    return (
        <div
            className={classNames('MultiViewModal', {
                open: shouldShowChangeView || shouldShowDollhouseViews,
                withSidepanel,
                upptacka: isUpptacka,
            })}
            ref={ref}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    dispatch(showChangeView(false))
                    dispatch(showDollhouseViews(false))
                    // Don't close measurements popover - let it handle its own outside clicks
                    // dispatch(showMeasurementsPopover(false))
                }
            }}
        >
            {(shouldShowChangeView || shouldShowDollhouseViews) && !isCameraInOrbitModeMoving && (
                <div className="multiViewCarousel" id="multiview-carousel">
                    {selectedViewports.map((view, idx) => (
                        <MultiViewModalViewButton
                            id={view.id}
                            onClick={() => handleViewClick(view.name, view.id)}
                            className={idx === selectedIndex ? 'selectedView' : ''}
                            name={viewNames[idx]}
                            // image thumbnails are only for non-hela rooms
                            thumbnailUrl={allScenesAreStandard3D(scene) ? null : view.thumbnailUrl}
                            key={view.id}
                            alwaysShowLabel={isUpptacka}
                            isSelected={idx === selectedIndex}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default MultiViewModal
