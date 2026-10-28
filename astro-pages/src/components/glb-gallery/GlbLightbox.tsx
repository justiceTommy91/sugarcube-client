import React, { useEffect, useState } from 'react'
import { GlbCanvas } from '../glb-viewer/GlbCanvas'
import { mapLoadError } from '../glb-viewer/errorMapper'

type Props = {
    file: File
    label: string
    onClose: () => void
}

type Status =
    | { kind: 'loading'; loaded: number; total: number }
    | { kind: 'loaded' }
    | { kind: 'error'; message: string }

export const GlbLightbox = ({ file, label, onClose }: Props) => {
    const [status, setStatus] = useState<Status>({ kind: 'loading', loaded: 0, total: 0 })

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose])

    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) onClose()
    }

    const progressPercent =
        status.kind === 'loading' && status.total > 0 ? Math.round((status.loaded / status.total) * 100) : null

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Esc handler covers keyboard close
        <div
            className="glb-gallery__lightbox glb-gallery__lightbox--glb"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={handleBackdropClick}
        >
            <button type="button" className="glb-gallery__lightbox-close" onClick={onClose} aria-label="Close">
                ×
            </button>
            <div className="glb-gallery__lightbox-canvas-wrap">
                <GlbCanvas
                    source={file}
                    className="glb-gallery__lightbox-canvas"
                    onProgress={(loaded, total) => setStatus({ kind: 'loading', loaded, total })}
                    onLoaded={() => setStatus({ kind: 'loaded' })}
                    onError={(err) => setStatus({ kind: 'error', message: mapLoadError(err).message })}
                />
                {status.kind === 'loading' && (
                    <div className="glb-gallery__lightbox-status">
                        Loading{progressPercent !== null ? ` (${progressPercent}%)` : '...'}
                    </div>
                )}
                {status.kind === 'error' && (
                    <div className="glb-gallery__lightbox-status glb-gallery__lightbox-status--error">
                        {status.message}
                    </div>
                )}
            </div>
            <div className="glb-gallery__lightbox-caption">{label}</div>
        </div>
    )
}
