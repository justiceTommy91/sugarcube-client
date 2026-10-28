import React, { useEffect } from 'react'

type Props = {
    src: string
    label: string
    onClose: () => void
}

export const ImageLightbox = ({ src, label, onClose }: Props) => {
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

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Esc handler covers keyboard close
        <div
            className="glb-gallery__lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={handleBackdropClick}
        >
            <button type="button" className="glb-gallery__lightbox-close" onClick={onClose} aria-label="Close">
                ×
            </button>
            <img src={src} alt={label} className="glb-gallery__lightbox-image" />
            <div className="glb-gallery__lightbox-caption">{label}</div>
        </div>
    )
}
