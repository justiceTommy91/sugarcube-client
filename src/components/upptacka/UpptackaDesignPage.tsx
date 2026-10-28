import React, { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useSugarcubeContext } from 'apps/SugarcubeContext'
import { withTrackingBoundary } from 'apps/TrackingBoundary'
import { DesignSidepanelContextProvider } from 'components/design/DesignSidepanelContext'
import PreviewContainer from 'containers/PreviewContainer'
import MultiView from 'components/MultiView'
import { useHideCookieAndChatElements } from 'hooks/useHideCookieAndChatElements'
import { useTrackDesignContext } from 'hooks/useTrackDesignContext'
import { updateLocation } from 'models/furniture/actions'
import { getSelectedComposition } from 'models/compositions/selectors'
import { UpptackaEditFurniturePanel } from './UpptackaEditFurniturePanel'
import { UpptackaExitModal } from './UpptackaExitModal'
import { UpptackaFurnitureDetailsPanel } from './UpptackaFurnitureDetailsPanel'
import { UpptackaPreviewHeader } from './UpptackaPreviewHeader'
import { UpptackaSaveModal } from './UpptackaSaveModal'
import { UpptackaSidePanel } from './UpptackaSidePanel'
import { UpptackaSummaryPanel } from './UpptackaSummaryPanel'
import { UpptackaDesignTips } from '../upptackaDesignTips/UpptackaDesignTips'

require('./UpptackaDesignPage.scss')

export const UpptackaDesignPage = withTrackingBoundary('UpptackaDesignPage')(() => {
    const dispatch = useAppDispatch()
    const { storeId } = useSugarcubeContext()
    const composition = useAppSelector(getSelectedComposition)
    const previewContainerRef = useRef<HTMLDivElement>(null)
    
    useEffect(() => {
        dispatch(updateLocation({ storeId, zipcode: null }))
    }, [storeId])

    useTrackDesignContext(composition)
    useHideCookieAndChatElements()

    return (
        <DesignSidepanelContextProvider>
            <div
                id="UpptackaDesignPage"
                className="UpptackaDesignPage"
                /**
                 * In Upptacka, there is an inactivity monitor that triggers a banner to reset the experience if it doesn't detect user
                 * interaction after X amount of time. We need to manually send user interaction events to Upptacka and manually reset
                 * this timer as our app is rendered within an iframe.
                 */
                onTouchStart={() => {
                    window?.parent?.postMessage('upptacka_user-interaction', '*')
                }}
                // we are also sending it onClick, so that the inactivity monitor is reset even in upptacka's dev environment emulator
                // (which is not replacing cursor clicks with touch events)
                onClick={() => {
                    window?.parent?.postMessage('upptacka_user-interaction', '*')
                }}
            >
                <div className="UpptackaDesignPage__PreviewContainer" ref={previewContainerRef}>
                    <UpptackaPreviewHeader />
                    <PreviewContainer maxHeight={764} showMultiView />
                    <MultiView />
                </div>
                <UpptackaSidePanel />
                <UpptackaEditFurniturePanel />
                <UpptackaFurnitureDetailsPanel />
                <UpptackaSummaryPanel />
                <UpptackaSaveModal />
                <UpptackaExitModal />
                <UpptackaDesignTips />
            </div>
        </DesignSidepanelContextProvider>
    )
})
