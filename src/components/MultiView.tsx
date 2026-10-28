import React, { useEffect, useRef, useState } from 'react'

import { OverflowCarousel } from '@ingka/carousel'
import cross from '@ingka/ssr-icon/paths/cross'
import Button from '@ingka/button'
import { useAppDispatch, useAppSelector, useMultiViewLabels } from 'hooks'
import { viewSelected } from 'models/preview/actions'
import { getDesignSidepanelOpen, getShouldShowChangeView } from 'models/ui/selectors'
import classNames from 'classnames'
import { GeomViewer } from 'Renderer/geomviewer'
import { getViewports } from 'models/renderer/selectors'
import { Viewport } from 'models/preview'
import { useTranslation } from 'react-i18next'
import { getSelectedScene } from 'models/compositions/selectors'
import { allScenesAreStandard3D } from 'models/scenes/utils'
import { showChangeView } from 'models/ui/actions'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

import ViewButton from './uiElements/ViewButton'

import './MultiView.scss'

const MultiView: React.FunctionComponent = () => {
    const [selectedView, setSelectedView] = useState('mainView')
    const dispatch = useAppDispatch()
    const { isUpptacka } = useSugarcubeContext()
    const shouldShowChangeView = useAppSelector(getShouldShowChangeView)
    const viewports: Viewport[] = useAppSelector(getViewports)
    const ref = useRef<HTMLDivElement>(null)
    const scene = useAppSelector(getSelectedScene)
    const withSidepanel = useAppSelector(getDesignSidepanelOpen)

    const { t } = useTranslation('translation')
    const viewNames = useMultiViewLabels()
    useEffect(() => {
        // Grab the selected viewport when the viewports are
        // updated instead of relying on the local default
        const info = GeomViewer.bindings?.queryViewerInfo()
        if (info?.currentView) {
            setSelectedView(info.currentView)
        }
    }, [viewports])

    const handleViewClick = (name: string, id: string) => {
        GeomViewer.bindings?.setCurrentView?.(id)
        setSelectedView(id)
        dispatch(viewSelected(name, id))
    }

    if (viewports.length <= 1) {
        return null
    }

    const selectedIndex = viewports.findIndex(({ id }) => id === selectedView)

    return (
        <div
            className={classNames('MultiView', { open: shouldShowChangeView, withSidepanel, upptacka: isUpptacka })}
            ref={ref}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <Button
                onClick={() => dispatch(showChangeView(false))}
                ssrIcon={cross}
                size="small"
                iconOnly
                type="tertiary"
                className="closeButton"
                text={t('design.cancel')}
            />

            {shouldShowChangeView && (
                <OverflowCarousel
                    className="multiViewCarousel"
                    id="multiview-carousel"
                    controlBtnType="image-overlay"
                    slideIndex={selectedIndex}
                >
                    {viewports.map((view, idx) => (
                        <ViewButton
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
                </OverflowCarousel>
            )}
        </div>
    )
}

export default MultiView
