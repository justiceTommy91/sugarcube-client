import React from 'react'
import type { HandleConfig, HandleId } from './hooks/useResizeHandles'

type ResizeHandlesProps = {
    handleConfigs: HandleConfig[]
    activeHandle: HandleId | null
    onPointerDown: (config: HandleConfig, e: React.PointerEvent) => void
}

const ResizeHandles: React.FC<ResizeHandlesProps> = ({
    handleConfigs, activeHandle, onPointerDown,
}) => {
    if (handleConfigs.length === 0) return null

    return (
        <div className="FmfViewer__resize-wrapper" data-fmf-blocks-move>
            {handleConfigs.map((config) => {
                const classes = [
                    'FmfViewer__resize-handle',
                    activeHandle === config.id && 'FmfViewer__resize-handle--active',
                    config.backfacing && !config.interactive && 'FmfViewer__resize-handle--backfacing',
                    !config.interactive && 'FmfViewer__resize-handle--reference',
                ].filter(Boolean).join(' ')

                return (
                    <div
                        key={config.id}
                        className={classes}
                        style={{
                            left: `${config.x * 100}%`,
                            top: `${config.y * 100}%`,
                        }}
                        onPointerDown={config.interactive ? (e) => onPointerDown(config, e) : undefined}
                    />
                )
            })}
        </div>
    )
}

export default ResizeHandles
