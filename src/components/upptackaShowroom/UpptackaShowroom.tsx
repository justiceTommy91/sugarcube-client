import React from 'react'
import { withTrackingBoundary } from 'apps/TrackingBoundary'
import { useHideCookieAndChatElements } from 'hooks/useHideCookieAndChatElements'
import { UpptackaShowroomHeader } from './UpptackaShowroomHeader'
import { UpptackaShowroomSlider } from './UpptackaShowroomSlider'

require('./UpptackaShowroom.scss')

export const UpptackaShowroom = withTrackingBoundary('UpptackaShowroom')(() => {
    useHideCookieAndChatElements()
    return (
        <div
            className="UpptackaShowroom"
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
            <UpptackaShowroomHeader />
            <UpptackaShowroomSlider />
        </div>
    )
})
