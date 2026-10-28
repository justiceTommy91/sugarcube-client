/* eslint-disable i18next/no-literal-string */ // CSS properties use inline styles (required for drag preview portals without SCSS) and internal IDs don't need translation
import React, { useMemo } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'
import type { ProductData } from 'models/furniture'
import { DRAG_CONSTANTS } from '../constants/dragConstants'

type DragPreviewProps = {
    productData: ProductData
    sourceElement?: HTMLElement
    useExistingImage?: boolean
}

const DragPreview = ({ productData, sourceElement, useExistingImage }: DragPreviewProps) => {
    const { t } = useTranslation()

    // Memoize image URL to avoid recalculation
    const imageUrl = useMemo(() => {
        if (useExistingImage && sourceElement) {
            const existingImg = sourceElement.querySelector('img.thumbImage') || sourceElement.querySelector('img')
            const hasValidImage =
                existingImg instanceof HTMLImageElement && existingImg.complete && existingImg.naturalWidth > 0

            if (hasValidImage) {
                return existingImg.src
            }
        }

        return productData.imageUrls?.[0] || productData.thumbUrl || ''
    }, [productData.imageUrls, productData.thumbUrl, sourceElement, useExistingImage])

    // Memoize styles to avoid recreation on each render
    const containerStyle: React.CSSProperties = useMemo(
        () => ({
            position: 'fixed',
            top: '-200px',
            left: '-200px',
            width: `${DRAG_CONSTANTS.PREVIEW_WIDTH}px`,
            height: `${DRAG_CONSTANTS.PREVIEW_HEIGHT}px`,
            background: '#fff',
            border: '2px solid #0058a3',
            borderRadius: `${DRAG_CONSTANTS.PREVIEW_BORDER_RADIUS}px`,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            zIndex: DRAG_CONSTANTS.PREVIEW_Z_INDEX,
            pointerEvents: 'none',
        }),
        [],
    )

    const imageContainerStyle: React.CSSProperties = useMemo(
        () => ({
            width: `${DRAG_CONSTANTS.PREVIEW_IMAGE_WIDTH}px`,
            height: `${DRAG_CONSTANTS.PREVIEW_IMAGE_HEIGHT}px`,
            borderRadius: `${DRAG_CONSTANTS.PREVIEW_IMAGE_BORDER_RADIUS}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
        }),
        [],
    )

    const imageStyle: React.CSSProperties = useMemo(
        () => ({
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
        }),
        [],
    )

    const placeholderLargeStyle: React.CSSProperties = useMemo(
        () => ({
            width: `${DRAG_CONSTANTS.PREVIEW_ICON_SIZE}px`,
            height: `${DRAG_CONSTANTS.PREVIEW_ICON_SIZE}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            backgroundColor: '#f5f5f5',
            borderRadius: `${DRAG_CONSTANTS.PREVIEW_IMAGE_BORDER_RADIUS}px`,
            color: '#666',
        }),
        [],
    )

    const nameStyle: React.CSSProperties = useMemo(
        () => ({
            fontSize: '12px',
            fontWeight: 600,
            color: '#484848',
            textAlign: 'center',
            marginTop: '4px',
            lineHeight: 1.2,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        }),
        [],
    )

    return (
        <div style={containerStyle}>
            {imageUrl ? (
                <div style={imageContainerStyle}>
                    <img src={imageUrl} style={imageStyle} alt="" />
                </div>
            ) : (
                <div style={placeholderLargeStyle}>📦</div>
            )}
            <div style={nameStyle}>{productData.name || t('dragDrop.preview.product')}</div>
        </div>
    )
}

// Create a reusable portal container
let portalContainer: HTMLElement | null = null
let currentRoot: Root | null = null

const getPortalContainer = (): HTMLElement => {
    if (!portalContainer) {
        portalContainer = document.createElement('div')
        portalContainer.id = 'drag-preview-portal'
        portalContainer.style.position = 'fixed'
        portalContainer.style.top = '0px'
        portalContainer.style.left = '0px'
        portalContainer.style.pointerEvents = 'none'
        portalContainer.style.zIndex = DRAG_CONSTANTS.PREVIEW_Z_INDEX.toString()
        portalContainer.style.overflow = 'visible'
        document.body.appendChild(portalContainer)
    }
    return portalContainer
}

export const createDragPreview = (
    productData: ProductData,
    sourceElement?: HTMLElement,
    useExistingImage?: boolean,
): HTMLElement | null => {
    try {
        const container = getPortalContainer()

        // Clean up any existing root
        if (currentRoot) {
            currentRoot.unmount()
            currentRoot = null
        }

        // Clear any existing content
        container.innerHTML = ''

        // Create a wrapper div for the preview
        const previewWrapper = document.createElement('div')
        container.appendChild(previewWrapper)

        // Create root and render React component
        currentRoot = createRoot(previewWrapper)
        currentRoot.render(
            <DragPreview productData={productData} sourceElement={sourceElement} useExistingImage={useExistingImage} />,
        )

        // Return the actual rendered preview element
        return previewWrapper.firstElementChild as HTMLElement
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(DRAG_CONSTANTS.ERROR_MESSAGES.DRAG_PREVIEW_CREATION_FAILED, error)
        Sentry.captureMessage(
            `Drag preview creation warning: ${DRAG_CONSTANTS.ERROR_MESSAGES.DRAG_PREVIEW_CREATION_FAILED}`,
            'warning',
        )
        return null
    }
}

export default DragPreview
