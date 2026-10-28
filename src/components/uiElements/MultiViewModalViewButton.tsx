import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { GeomViewer } from 'Renderer/geomviewer'

import './MultiViewModalViewButton.scss'

interface MultiViewModalViewButtonProps {
    className: string | undefined
    id: string
    onClick: () => void
    name: string
    thumbnailUrl: string | null | undefined
    alwaysShowLabel: boolean
    isSelected?: boolean
}

const MultiViewModalViewButton = ({
    id,
    className,
    onClick,
    thumbnailUrl,
    alwaysShowLabel,
    name,
    isSelected,
}: MultiViewModalViewButtonProps) => {
    const canvasRef = React.createRef<HTMLCanvasElement>()
    const { t } = useTranslation()

    useEffect(() => {
        const canvas = canvasRef.current
        if (canvas) {
            const dimensions = GeomViewer.bindings?.queryViewerInfo().dimensions
            if (dimensions) {
                canvas.height = Math.max((dimensions[1] / dimensions[0]) * canvas.width, canvas.height)
                canvas.width = (canvas.height * dimensions[0]) / dimensions[1]
            }
            GeomViewer.bindings?.updateViewThumbnail(canvas, id)
        }
    }, [])

    return (
        <button
            className={classNames('MultiViewModalViewButton', className)}
            id={id}
            onClick={onClick}
            aria-pressed={isSelected}
        >
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

export default MultiViewModalViewButton
