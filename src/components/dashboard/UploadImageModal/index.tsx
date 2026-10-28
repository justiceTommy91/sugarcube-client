import React, { useEffect, useState, useMemo } from 'react'
import Modal, { ModalHeader, Theatre } from '@ingka/modal'
import { Typography } from '@ingka/typography-shared'
import { useTranslation } from 'react-i18next'

import { showUploadImageModal } from 'models/ui/actions'
import { getShowUploadImageModal } from 'models/ui/selectors'
import { PARAM_OPEN_UPLOAD } from 'models/location/constants'
import { getUrlParams } from 'utils/urlParams'
import ControlledToast from 'toasts/ControlledToast'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { useAppSelector, useAppDispatch } from 'hooks'
import {
    KREATIVLITE_CLOSE,
    GA_ACTION_KREATIVLITE_FILE_SELECT,
    GA_ACTION_KREATIVLITE_CLOSE,
    GA_CATEGORY_DYH_SUGARCUBE,
    KREATIVLITE_FILE_SELECT,
} from 'models/tracking/constants'
import { useImageUpload } from 'hooks/useImageUpload'
import { CAPTURE_LITE_TYPE_KREATIVLITE } from 'services/imageUpload'
import UploadHeroSection from './UploadHeroSection'
import BeforeAfterSection from './BeforeAfterSection'
import FeatureCardsSection from './FeatureCardsSection'

require('./UploadImageModal.scss')

const UploadImageModal: React.FC = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()

    const isVisible = useAppSelector(getShowUploadImageModal)

    const shouldAutoOpen = useMemo(() => {
        const params = getUrlParams()
        return params[PARAM_OPEN_UPLOAD] === 'true'
    }, [])

    const [isDragging, setIsDragging] = useState(false)

    const {
        uploadState,
        errorToast,
        clearErrorToast,
        handleFileSelect: uploadFileSelect,
    } = useImageUpload({
        tracking: {
            fileSelectEvent: KREATIVLITE_FILE_SELECT,
            gaAction: GA_ACTION_KREATIVLITE_FILE_SELECT,
            gaCategory: GA_CATEGORY_DYH_SUGARCUBE,
        },
        type: CAPTURE_LITE_TYPE_KREATIVLITE,
    })

    // Open modal if URL parameter is set
    useEffect(() => {
        if (shouldAutoOpen && typeof window !== 'undefined') {
            dispatch(showUploadImageModal(true))
            // Clean up the openUpload parameter from URL
            const currentUrl = new URL(window.location.toString())
            currentUrl.searchParams.delete(PARAM_OPEN_UPLOAD)
            window.history.replaceState(null, '', currentUrl)
        }
    }, [shouldAutoOpen, dispatch])

    useEffect(() => {
        const handleWindowDragEnter = (e: DragEvent) => {
            e.preventDefault()
            if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
                setIsDragging(true)
            }
        }

        const handleWindowDragLeave = (e: DragEvent) => {
            e.preventDefault()
            // Only hide if leaving the window entirely
            if (e.clientX === 0 && e.clientY === 0) {
                setIsDragging(false)
            }
        }

        const handleWindowDragOver = (e: DragEvent) => {
            e.preventDefault()
        }

        const handleWindowDrop = (e: DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
        }

        window.addEventListener('dragenter', handleWindowDragEnter)
        window.addEventListener('dragleave', handleWindowDragLeave)
        window.addEventListener('dragover', handleWindowDragOver)
        window.addEventListener('drop', handleWindowDrop)

        return () => {
            window.removeEventListener('dragenter', handleWindowDragEnter)
            window.removeEventListener('dragleave', handleWindowDragLeave)
            window.removeEventListener('dragover', handleWindowDragOver)
            window.removeEventListener('drop', handleWindowDrop)
        }
    }, [])

    const handleFileSelect = async (file: File, isDragDrop = false): Promise<void> => {
        if (!file) return
        const success = await uploadFileSelect(file, isDragDrop)
        // Explicitly close the modal on success. Redux state persists across Gatsby's
        // client-side route transitions, so without this, navigating back to the
        // dashboard would re-open the modal since showUploadImageModal is still true.
        if (success) {
            dispatch(showUploadImageModal(false))
        }
    }

    const handleDrop = (e: React.DragEvent): void => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const file = e.dataTransfer.files?.[0]
        if (file) {
            handleFileSelect(file, true)
        }
    }

    const handleClose = (): void => {
        trackGoogleAnalytics({
            action: GA_ACTION_KREATIVLITE_CLOSE,
            category: GA_CATEGORY_DYH_SUGARCUBE,
            label: '',
        })
        click(KREATIVLITE_CLOSE)
        dispatch(showUploadImageModal(false))
    }

    return (
        <>
            <Modal
                className={`UploadImageModal ${Typography.TypographyRoot}`}
                visible={isVisible}
                handleCloseBtn={handleClose}
            >
                <Theatre header={<ModalHeader floating />}>
                    <div className="UploadImageModal__content">
                        <UploadHeroSection
                            isDragging={isDragging}
                            onDrop={handleDrop}
                            onFileSelect={(file) => handleFileSelect(file, false)}
                            uploadState={uploadState}
                        />
                        <BeforeAfterSection />
                        <FeatureCardsSection />
                    </div>
                </Theatre>
            </Modal>
            {errorToast && (
                <ControlledToast
                    text={errorToast}
                    onDismiss={clearErrorToast}
                    ariaLabelCloseBtn={t('aria.dismiss notification')}
                />
            )}
        </>
    )
}

export default UploadImageModal
