/* eslint-disable i18next/no-literal-string */
import Button from '@ingka/button'
import React, { useState } from 'react'

export const IFrameTest: React.FC = () => {
    const [isIFrameActive, setIsIFrameActive] = useState(false)
    return (
        <div>
            {isIFrameActive ? (
                <iframe
                    data-testid="iframe-test"
                    title="iframe-test"
                    width="900px"
                    height="600px"
                    src={`${window.location.origin}/?kiosk`}
                />
            ) : null}
            {!isIFrameActive ? (
                <Button
                    data-testid="iframe-test-render-button"
                    type="primary"
                    onClick={() => setIsIFrameActive(true)}
                    text="Render Iframe"
                />
            ) : null}
        </div>
    )
}
