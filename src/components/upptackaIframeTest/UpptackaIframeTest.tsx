import React, { useEffect, useState } from 'react'
import { withPrefix } from 'gatsby'
import { useHideCookieAndChatElements } from 'hooks/useHideCookieAndChatElements'
import { getHref } from 'models/location/selectors'

require('./UpptackaIframeTest.scss')

export const UpptackaIframeTest: React.FC = () => {
    const [scale, setScale] = useState(1)
    const [href, setHref] = useState('')
    const handleResize = () => {
        if (typeof window === undefined) {
            setScale(1)
        } else {
            const { innerWidth, innerHeight } = window
            const widthScale = innerWidth < 2114 ? innerWidth / 2114 : 1
            const heightScale = innerHeight < 1274 ? innerHeight / 1274 : 1

            setScale(Math.min(widthScale, heightScale))
        }
    }

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHref(getHref().replace(/upptackaTest\/$/, ''))
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    useHideCookieAndChatElements()

    return (
        <div
            className="UpptackaIframeTest"
            style={{ backgroundImage: `url(${withPrefix('/images/upptacka/backboard.jpg')})` }}
        >
            <div className="frame-stand" />
            <iframe
                title="upptacka-iframe-test"
                width="1920px"
                height="1080px"
                src={`${href}upptackaShowroom`}
                style={{ transform: `scale(${scale}) translate(-50%, -50%)` }}
            />
            <div className="frame-shadow" style={{ transform: `scale(${scale}) translate(-50%, -50%)` }} />
        </div>
    )
}
