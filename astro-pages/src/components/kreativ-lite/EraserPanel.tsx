import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import arrowCounterclockwise from '@ingka/ssr-icon/paths/arrow-counterclockwise'
import visibilityHide from '@ingka/ssr-icon/paths/visibility-hide'
import { GeomViewer } from '@gatsby/Renderer/geomviewer'
import EraserInstructionTooltip from './EraserInstructionTooltip'
import './EraserPanel.scss'

interface EraserPanelProps {
    onStartDesign: () => void
}

// Persists across eraser mode re-entries within the page session.
let hasShownEraserTooltip = false

export const EraserPanel = ({ onStartDesign }: EraserPanelProps) => {
    const { t } = useTranslation()
    const [showTooltip, setShowTooltip] = useState(!hasShownEraserTooltip)

    useEffect(() => {
        if (!showTooltip) return

        hasShownEraserTooltip = true
        const hide = () => setShowTooltip(false)

        document.addEventListener('mousedown', hide)
        document.addEventListener('touchstart', hide)

        // eslint-disable-next-line consistent-return
        return () => {
            document.removeEventListener('mousedown', hide)
            document.removeEventListener('touchstart', hide)
        }
    }, [showTooltip])

    const handleHideAll = () => GeomViewer.bindings?.doAction('magic-eraser-hide-all')
    const handleShowAll = () => GeomViewer.bindings?.doAction('magic-eraser-show-all')

    return (
        <div className="EraserPanel">
            <EraserInstructionTooltip visible={showTooltip} />
            <div className="EraserPanel__actions">
                <Button
                    type="tertiary"
                    size="small"
                    ssrIcon={arrowCounterclockwise}
                    iconPosition="leading"
                    text={t('design.reset')}
                    onClick={handleShowAll}
                />
                <Button
                    type="tertiary"
                    size="small"
                    ssrIcon={visibilityHide}
                    iconPosition="leading"
                    text={t('design.hide all')}
                    onClick={handleHideAll}
                />
            </div>

            <div className="EraserPanel__footer">
                <Button
                    type="primary"
                    className="EraserPanel__footer-btn"
                    text={t('design.start design')}
                    onClick={onStartDesign}
                />
            </div>
        </div>
    )
}
