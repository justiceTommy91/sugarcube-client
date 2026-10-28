import { useState } from 'react'
import { navigate } from 'gatsby'
import { useTranslation } from 'react-i18next'
import * as Sentry from '@sentry/react'

import { uploadImage } from 'services/imageUpload'
import {
    KREATIVLITE_SELECTION_CLICK_BUTTON,
    KREATIVLITE_SELECTION_DRAG_DROP,
    KREATIVLITE_RESULT_SUCCESS,
    KREATIVLITE_RESULT_TOO_LARGE,
    KREATIVLITE_RESULT_UNSUPPORTED_TYPE,
    KREATIVLITE_RESULT_PROCESSING_ERROR,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'
import { workflow, trackGoogleAnalytics } from 'utils/tracker'
import { validateImageFile, resizeImage, normalizeFilename, extractExifData } from 'components/dashboard/UploadImageModal/imageProcessing'
import type { UploadState, UploadError, ResizeDebugInfo } from 'components/dashboard/UploadImageModal/types'
import {
    UPLOAD_ERROR_FILE_TOO_LARGE,
    UPLOAD_ERROR_UPLOAD_FAILED,
    UPLOAD_STATUS_IDLE,
    UPLOAD_STATUS_PROCESSING,
    UPLOAD_STATUS_UPLOADING,
    UPLOAD_STATUS_ERROR,
} from 'components/dashboard/UploadImageModal/types'
import { getOrientation, getFileExtension } from 'components/dashboard/UploadImageModal/trackingHelpers'

/**
 * Required tracking configuration. Each entry point into the upload flow should
 * supply its own event names so analytics can distinguish between features.
 *
 * The selection-method and result constants (KREATIVLITE_SELECTION_*, KREATIVLITE_RESULT_*)
 * are mechanic-level labels shared across all callers.
 */
export interface UseImageUploadTracking {
    /** Workflow (Qualtrics/WTS) event name for the file-select event */
    fileSelectEvent: string
    /** Google Analytics action for the file-select event */
    gaAction: string
    /** Google Analytics category. Defaults to GA_CATEGORY_DYH_SUGARCUBE */
    gaCategory?: string
    /** Workflow event name for the image upload event. Defaults to KreativLite.ImageUpload */
    imageUploadEvent?: string
    /** Google Analytics action for the image upload event. Defaults to GA_ACTION_KREATIVLITE_IMAGE_UPLOAD */
    gaActionImageUpload?: string
}

interface UseImageUploadConfig {
    /** Tracking event names. Required so each caller explicitly identifies its feature. */
    tracking: UseImageUploadTracking
    /** Path to navigate to after a successful upload. Defaults to /kreativ-lite-upload */
    redirectPath?: string
    /** Scene type to pass to the capture-lite API. Use 'fmf' for Find My Fit uploads. */
    type?: string
}

interface UseImageUploadResult {
    uploadState: UploadState
    errorToast: string | null
    clearErrorToast: () => void
    handleFileSelect: (file: File, isDragDrop?: boolean) => Promise<boolean>
}

const DEFAULT_REDIRECT_PATH = '/kreativ-lite-upload'

/**
 * Reusable hook that encapsulates the full image upload flow:
 * validate → extract EXIF → resize → upload to backend → navigate to interstitial page.
 *
 * Used by UploadImageModal, MobileDashboardV3, and any future entry points.
 * Each caller must supply its own tracking event names via the `tracking` config.
 */
export const useImageUpload = ({ tracking, redirectPath = DEFAULT_REDIRECT_PATH, type }: UseImageUploadConfig): UseImageUploadResult => {
    const { t } = useTranslation()
    const gaCategory = tracking.gaCategory ?? GA_CATEGORY_DYH_SUGARCUBE

    const [uploadState, setUploadState] = useState<UploadState>({ status: UPLOAD_STATUS_IDLE })
    const [errorToast, setErrorToast] = useState<string | null>(null)

    const createUploadError = (message: string): UploadError => ({
        type: UPLOAD_ERROR_UPLOAD_FAILED,
        message,
        userMessage: t('design.kreativLite.upload.failed'),
    })

    const handleFileSelect = async (file: File, isDragDrop = false): Promise<boolean> => {
        if (!file) return false

        const originalExtension = getFileExtension(file.name)
        const originalSize = file.size
        const selectionMethod = isDragDrop ? KREATIVLITE_SELECTION_DRAG_DROP : KREATIVLITE_SELECTION_CLICK_BUTTON

        try {
            setUploadState({ status: UPLOAD_STATUS_PROCESSING, message: t('design.kreativLite.upload.processing') })

            const validation = validateImageFile(file, t)
            if (!validation.valid) {
                const img = new Image()
                img.src = URL.createObjectURL(file)
                await new Promise<void>((resolve) => {
                    img.onload = () => {
                        const result =
                            validation.error?.type === UPLOAD_ERROR_FILE_TOO_LARGE
                                ? KREATIVLITE_RESULT_TOO_LARGE
                                : KREATIVLITE_RESULT_UNSUPPORTED_TYPE
                        const orientation = getOrientation(img.width, img.height)

                        workflow(tracking.fileSelectEvent, {
                            SelectionMethod: selectionMethod,
                            FileType: originalExtension,
                            FileSizeBytes: originalSize,
                            ImageWidthPx: img.width,
                            ImageHeightPx: img.height,
                            ImageOrientation: orientation,
                            result,
                        })

                        trackGoogleAnalytics({
                            action: tracking.gaAction,
                            category: gaCategory,
                            label: result,
                            custom: {
                                SelectionMethod: selectionMethod,
                                FileType: originalExtension,
                                FileSizeBytes: String(originalSize),
                                ImageWidthPx: String(img.width),
                                ImageHeightPx: String(img.height),
                                ImageOrientation: orientation,
                                Result: result,
                            },
                        })

                        URL.revokeObjectURL(img.src)
                        resolve()
                    }
                    img.onerror = () => {
                        const result =
                            validation.error?.type === UPLOAD_ERROR_FILE_TOO_LARGE
                                ? KREATIVLITE_RESULT_TOO_LARGE
                                : KREATIVLITE_RESULT_UNSUPPORTED_TYPE

                        workflow(tracking.fileSelectEvent, {
                            SelectionMethod: selectionMethod,
                            FileType: originalExtension,
                            FileSizeBytes: originalSize,
                            ImageWidthPx: 0,
                            ImageHeightPx: 0,
                            ImageOrientation: 'unknown',
                            result,
                        })

                        trackGoogleAnalytics({
                            action: tracking.gaAction,
                            category: gaCategory,
                            label: result,
                            custom: {
                                SelectionMethod: selectionMethod,
                                FileType: originalExtension,
                                FileSizeBytes: String(originalSize),
                                ImageWidthPx: '0',
                                ImageHeightPx: '0',
                                ImageOrientation: 'unknown',
                                Result: result,
                            },
                        })

                        URL.revokeObjectURL(img.src)
                        resolve()
                    }
                })

                setUploadState({
                    status: UPLOAD_STATUS_ERROR,
                    error: validation.error,
                })
                setErrorToast(validation.error?.userMessage || (t('design.kreativLite.upload.failed') as string))
                return false
            }

            const exifData = await extractExifData(file)
            const resizeResult = await resizeImage(file)

            const orientation = getOrientation(
                resizeResult.originalDimensions.width,
                resizeResult.originalDimensions.height,
            )

            workflow(tracking.fileSelectEvent, {
                SelectionMethod: selectionMethod,
                FileType: originalExtension,
                FileSizeBytes: originalSize,
                ImageWidthPx: resizeResult.originalDimensions.width,
                ImageHeightPx: resizeResult.originalDimensions.height,
                ImageOrientation: orientation,
                Result: KREATIVLITE_RESULT_SUCCESS,
            })

            trackGoogleAnalytics({
                action: tracking.gaAction,
                category: gaCategory,
                label: KREATIVLITE_RESULT_SUCCESS,
                custom: {
                    SelectionMethod: selectionMethod,
                    FileType: originalExtension,
                    FileSizeBytes: String(originalSize),
                    ImageWidthPx: String(resizeResult.originalDimensions.width),
                    ImageHeightPx: String(resizeResult.originalDimensions.height),
                    ImageOrientation: orientation,
                    Result: KREATIVLITE_RESULT_SUCCESS,
                },
            })

            const filename = normalizeFilename(file.name, resizeResult.blob.type)

            const debugInfo: ResizeDebugInfo = {
                originalDimensions: resizeResult.originalDimensions,
                finalDimensions: resizeResult.finalDimensions,
                originalSize: resizeResult.originalSize,
                finalSize: resizeResult.finalSize,
                wasResized: resizeResult.wasResized,
                fileType: file.type,
                fileName: filename,
                exifData: Object.keys(exifData).length > 0 ? exifData : undefined,
            }

            setUploadState({
                status: UPLOAD_STATUS_UPLOADING,
                message: t('design.kreativLite.upload.processing'),
                debugInfo,
                processedBlob: resizeResult.blob,
            })

            const sceneId = await uploadImage(
                resizeResult.blob,
                filename,
                resizeResult.originalDimensions.width,
                resizeResult.originalDimensions.height,
                exifData,
                type,
                tracking.imageUploadEvent
                    ? { event: tracking.imageUploadEvent, gaAction: tracking.gaActionImageUpload ?? tracking.gaAction, gaCategory }
                    : undefined,
            )

            // Navigate to the interstitial page, preserving any existing search params (e.g. productId)
            const currentParams = new URLSearchParams(window.location.search)
            // eslint-disable-next-line i18next/no-literal-string
            currentParams.set('sceneId', sceneId)
            navigate(`${redirectPath}?${currentParams.toString()}`)
            return true
        } catch (uploadError) {
            // eslint-disable-next-line no-console
            console.error('Error processing image:', uploadError)
            Sentry.captureException(uploadError)

            const img = new Image()
            img.src = URL.createObjectURL(file)
            img.onload = () => {
                const orientation = getOrientation(img.width, img.height)

                workflow(tracking.fileSelectEvent, {
                    SelectionMethod: selectionMethod,
                    FileType: originalExtension,
                    FileSizeBytes: originalSize,
                    ImageWidthPx: img.width,
                    ImageHeightPx: img.height,
                    ImageOrientation: orientation,
                    Result: KREATIVLITE_RESULT_PROCESSING_ERROR,
                })

                trackGoogleAnalytics({
                    action: tracking.gaAction,
                    category: gaCategory,
                    label: KREATIVLITE_RESULT_PROCESSING_ERROR,
                    custom: {
                        SelectionMethod: selectionMethod,
                        FileType: originalExtension,
                        FileSizeBytes: String(originalSize),
                        ImageWidthPx: String(img.width),
                        ImageHeightPx: String(img.height),
                        ImageOrientation: orientation,
                        Result: KREATIVLITE_RESULT_PROCESSING_ERROR,
                    },
                })
                URL.revokeObjectURL(img.src)
            }
            img.onerror = () => {
                workflow(tracking.fileSelectEvent, {
                    SelectionMethod: selectionMethod,
                    FileType: originalExtension,
                    FileSizeBytes: originalSize,
                    ImageWidthPx: 0,
                    ImageHeightPx: 0,
                    ImageOrientation: 'unknown',
                    Result: KREATIVLITE_RESULT_PROCESSING_ERROR,
                })

                trackGoogleAnalytics({
                    action: tracking.gaAction,
                    category: gaCategory,
                    label: KREATIVLITE_RESULT_PROCESSING_ERROR,
                    custom: {
                        SelectionMethod: selectionMethod,
                        FileType: originalExtension,
                        FileSizeBytes: String(originalSize),
                        ImageWidthPx: '0',
                        ImageHeightPx: '0',
                        ImageOrientation: 'unknown',
                        Result: KREATIVLITE_RESULT_PROCESSING_ERROR,
                    },
                })

                URL.revokeObjectURL(img.src)
            }

            const err = createUploadError(
                uploadError instanceof Error ? uploadError.message : t('design.kreativLite.upload.processing error'),
            )
            setUploadState({
                status: UPLOAD_STATUS_ERROR,
                error: err,
            })
            setErrorToast(err.userMessage)
            return false
        }
    }

    return {
        uploadState,
        errorToast,
        clearErrorToast: () => setErrorToast(null),
        handleFileSelect,
    }
}
