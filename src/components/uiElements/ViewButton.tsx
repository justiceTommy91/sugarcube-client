import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { GeomViewer } from 'Renderer/geomviewer'

import './ViewButton.scss'

interface ViewButtonProps {
    className: string | undefined
    id: string
    onClick: () => void
    name: string
    thumbnailUrl: string | null | undefined
    alwaysShowLabel: boolean
    isSelected?: boolean
}

const ViewButton = ({ id, className, onClick, thumbnailUrl, alwaysShowLabel, name, isSelected }: ViewButtonProps) => {
    const canvasRef = React.createRef<HTMLCanvasElement>()
    const { t } = useTranslation()

    useEffect(() => {
        const canvas = canvasRef.current
        if (canvas) {
            GeomViewer.bindings?.updateViewThumbnail(canvas, id)
        }
    }, [])

    return (
        <button className={classNames('ViewButton', className)} id={id} onClick={onClick} aria-pressed={isSelected}>
            <div className="multiViewImage">
                {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt={t('design.alt.room view thumbnail')} />
                ) : (
                    <canvas ref={canvasRef} />
                )}
                <div className="viewOverlayWrapper">
                    <div className={classNames('viewOverlay', { alwaysShowLabel })} title={name}>
                        {name}
                    </div>
                </div>
            </div>
        </button>
    )
}

export default ViewButton
