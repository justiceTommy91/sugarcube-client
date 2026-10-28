import axios from 'axios'
import axiosRetry from 'axios-retry'
import * as Sentry from '@sentry/react'
import fetch from 'services'
import type { ExifTags } from 'exif-js'
import { addJitter } from 'utils/async'
import {
    SCENE_STATE_SUCCESS,
    SCENE_STATE_COMPLETE,
    SCENE_STATE_FAILED,
    SCENE_STATE_ERROR,
} from 'models/scenes/constants'
import {
    UPLOAD_POLL_INITIAL_DELAY,
    UPLOAD_POLL_MAX_DELAY,
    UPLOAD_POLL_MAX_ATTEMPTS,
    SCENE_POLL_INITIAL_DELAY,
    SCENE_POLL_MAX_DELAY,
    SCENE_POLL_MAX_ATTEMPTS,
} from 'components/dashboard/UploadImageModal/constants'
import { workflow, trackGoogleAnalytics } from 'utils/tracker'
import {
    KREATIVLITE_IMAGE_UPLOAD,
    KREATIVLITE_RESULT_SUCCESS,
    KREATIVLITE_RESULT_FAIL,
    GA_ACTION_KREATIVLITE_IMAGE_UPLOAD,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'
import {
    getOrientation,
    formatExifMetadata,
    getErrorTracking,
    getFileExtension,
} from 'components/dashboard/UploadImageModal/trackingHelpers'

// Scene type values for the capture-lite API
export const CAPTURE_LITE_TYPE_FMF = 'fmf'
export const CAPTURE_LITE_TYPE_KREATIVLITE = 'kreativlite'

const isGuestAllowedCaptureLiteType = (type?: string) =>
    type === CAPTURE_LITE_TYPE_FMF || type === CAPTURE_LITE_TYPE_KREATIVLITE

// Error message translation keys for scene processing
export const SCENE_PROCESSING_ERROR_MESSAGES = {
    TIMEOUT: 'design.kreativLite.errors.timeout',
    FAILED: 'design.kreativLite.errors.failed',
    GENERIC: 'design.kreativLite.errors.generic',
    UPLOAD_TIMEOUT: 'design.kreativLite.errors.upload timeout',
} as const

/**
 * Camera metadata extracted from EXIF data
 */
export interface CameraMetadata {
    poseIndexes: [0]
    shutterSpeeds: [string | null]
    iso: [number | null]
    Aperture: [number | null]
}

interface CreateUploadResponse {
    uuid: string
    urls: Array<{
        path: string
        contentType: string
        contentMd5: string | null
        headers: string | null
        url: string
        completed: boolean
        isUploaded: boolean
    }>
    completed: boolean
    clientIdentifier: string | null
    properties: string | null
    resumable: boolean | null
    createdAt: string
    lastUpdatedTs: string
    user: number
}

/**
 * Create upload request to get signed URL from backend
 */
async function createUpload(blob: Blob, filename: string, type?: string): Promise<CreateUploadResponse> {
    const response = await fetch<CreateUploadResponse>(
        '/uploads/?use_custom_domain=true',
        {
            method: 'POST',
            data: {
                urls: [
                    {
                        path: filename,
                        content_type: blob.type,
                    },
                ],
            },
        },
        { allowGuest: isGuestAllowedCaptureLiteType(type) },
    )

    return response.data
}

/**
 * Poll upload status with exponential backoff
 */
async function pollUploadStatus(
    uuid: string,
    onProgress?: (status: CreateUploadResponse) => void,
    allowGuest?: boolean,
): Promise<CreateUploadResponse> {
    const checkStatus = async (attempt: number, delay: number): Promise<CreateUploadResponse> => {
        if (attempt >= UPLOAD_POLL_MAX_ATTEMPTS) {
            throw new Error(SCENE_PROCESSING_ERROR_MESSAGES.UPLOAD_TIMEOUT)
        }

        // Add jitter to prevent synchronized polling from multiple clients
        const jitteredDelay = addJitter(delay)
        await new Promise((resolve) => {
            setTimeout(resolve, jitteredDelay)
        })

        const response = await fetch<CreateUploadResponse>(`/uploads/${uuid}/`, undefined, { allowGuest })
        const status = response.data

        onProgress?.(status)

        // Check if upload is complete
        // Backend returns isUploaded when file is uploaded to GCS
        const allUrlsUploaded = status.urls.every((url) => url.isUploaded === true)
        if (allUrlsUploaded) {
            return status
        }

        // Calculate next delay with exponential backoff
        const nextDelay = Math.min(delay * 1.5, UPLOAD_POLL_MAX_DELAY)
        return checkStatus(attempt + 1, nextDelay)
    }

    return checkStatus(0, UPLOAD_POLL_INITIAL_DELAY)
}

/**
 * Extract camera metadata from EXIF data for backend
 * Note: EXIF library returns special Number objects with numerator/denominator
 */
export function extractCameraMetadata(exifData?: ExifTags): CameraMetadata {
    const shutterSpeed = exifData?.ExposureTime ? `1/${Math.round(1 / Number(exifData.ExposureTime))}` : null
    const iso = exifData?.ISOSpeedRatings ? Number(exifData.ISOSpeedRatings) : null
    const aperture = exifData?.FNumber ? Number(exifData.FNumber) : null

    return {
        poseIndexes: [0],
        shutterSpeeds: [shutterSpeed],
        iso: [iso],
        Aperture: [aperture],
    }
}

/**
 * Trigger scene capture/processing after upload completes
 */
async function captureScene(
    uploadUuid: string,
    originalWidth: number,
    originalHeight: number,
    exifData?: ExifTags,
    type?: string,
): Promise<{ sceneId: string }> {
    // Determine panoConfiguration based on image orientation
    const isLandscape = originalWidth > originalHeight
    const panoConfiguration = isLandscape ? 'WIDE_LANDSCAPE' : 'WIDE_PORTRAIT'

    // Extract camera metadata from EXIF
    const cameraMetadata = extractCameraMetadata(exifData)

    // Only include sourceImageSize if we have valid dimensions (not 0x0)
    // If dimensions are invalid, pass null to match other metadata fields
    // This is the case when the browser cannot read the image dimensions (heic on non-ios browsers)
    const sourceImageSize =
        originalWidth === 0 && originalHeight === 0 ? [null] : [{ width: originalWidth, height: originalHeight }]

    const response = await fetch<{ sceneId: string }>(
        '/scenes/capture-lite/',
        {
            method: 'POST',
            data: {
                upload_uuid: uploadUuid,
                ...(type && { type }),
                metadata: {
                    session_meta: {
                        platform: 'WEB',
                        panoConfiguration,
                    },
                    pano_meta: {
                        sourceImageSize,
                        ...cameraMetadata,
                    },
                },
            },
        },
        { allowGuest: isGuestAllowedCaptureLiteType(type) },
    )

    return response.data
}

export interface SceneStatus {
    sceneId: number
    jobState: string
    status: number
    state: string
    estimatedFinishTs?: string
    clientCapturedAt?: string
    createdAt?: string
    uuid: string
    thumbnails?: {
        url: string
    }
    // Add other fields as needed
}

/**
 * Poll scene processing status with cancellation support
 */
export async function pollSceneStatus(
    sceneId: string,
    onProgress?: (scene: SceneStatus) => void,
    signal?: AbortSignal,
    allowGuest?: boolean,
): Promise<SceneStatus> {
    const checkStatus = async (attempt: number, delay: number): Promise<SceneStatus> => {
        // Check if cancelled
        if (signal?.aborted) {
            throw new Error('Polling cancelled')
        }

        if (attempt >= SCENE_POLL_MAX_ATTEMPTS) {
            throw new Error(SCENE_PROCESSING_ERROR_MESSAGES.TIMEOUT)
        }

        // Add jitter to prevent synchronized polling from multiple clients
        const jitteredDelay = addJitter(delay)

        // Use AbortSignal-aware sleep
        await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, jitteredDelay)
            signal?.addEventListener('abort', () => {
                clearTimeout(timeoutId)
                reject(new Error('Polling cancelled'))
            })
        })

        // Check again after sleep
        if (signal?.aborted) {
            throw new Error('Polling cancelled')
        }

        const response = await fetch<SceneStatus>(`/scenes/${sceneId}/`, undefined, { allowGuest })
        const scene = response.data

        onProgress?.(scene)

        // Check if processing is complete
        if (scene.jobState === SCENE_STATE_SUCCESS || scene.jobState === SCENE_STATE_COMPLETE) {
            return scene
        }

        // If status indicates failure, throw error
        if (scene.jobState === SCENE_STATE_FAILED || scene.jobState === SCENE_STATE_ERROR) {
            throw new Error(SCENE_PROCESSING_ERROR_MESSAGES.FAILED)
        }

        // Calculate next delay with exponential backoff
        const nextDelay = Math.min(delay * 1.5, SCENE_POLL_MAX_DELAY)
        return checkStatus(attempt + 1, nextDelay)
    }

    return checkStatus(0, SCENE_POLL_INITIAL_DELAY)
}

/**
 * Upload image blob to GCS via signed URL, trigger scene capture, and return scene ID
 * Uses axios-retry for automatic retries with exponential backoff
 * Note: Scene polling is handled separately on the processing page
 */
export async function uploadImage(
    blob: Blob,
    filename: string,
    originalWidth: number,
    originalHeight: number,
    exifData?: ExifTags,
    type?: string,
    imageUploadTracking?: { event: string; gaAction: string; gaCategory: string },
): Promise<string> {
    const startTime = Date.now()
    let uploadUuid: string | undefined
    let retryCount = 0

    const fileExtension = getFileExtension(filename)
    const orientation = getOrientation(originalWidth, originalHeight)
    const exifMetadata = formatExifMetadata(exifData || {})

    // Configure axios instance for the upload operations with retry
    const axiosInstance = axios.create()
    axiosRetry(axiosInstance, {
        retries: 3,
        retryDelay: axiosRetry.exponentialDelay,
        onRetry: (retryNumber) => {
            retryCount = retryNumber
            // eslint-disable-next-line no-console
            console.log(`Upload retry attempt ${retryNumber}`)
        },
    })

    try {
        // Step 1: Get signed URL from backend
        const uploadResponse = await createUpload(blob, filename, type)
        uploadUuid = uploadResponse.uuid
        const signedUrl = uploadResponse.urls[0]?.url

        if (!signedUrl) {
            throw new Error('No signed URL returned from backend')
        }

        // Step 2: Upload blob to GCS (with automatic retries via axios-retry)
        await axiosInstance({
            url: signedUrl,
            method: 'PUT',
            headers: {
                'Content-Type': blob.type,
            },
            data: blob,
        })

        // Step 3: Poll for upload completion
        const finalStatus = await pollUploadStatus(uploadResponse.uuid, undefined, isGuestAllowedCaptureLiteType(type))

        // Step 4: Trigger scene capture/processing
        const sceneResponse = await captureScene(finalStatus.uuid, originalWidth, originalHeight, exifData, type)

        // Track successful upload
        const duration = Date.now() - startTime

        workflow(imageUploadTracking?.event ?? KREATIVLITE_IMAGE_UPLOAD, {
            FileId: uploadUuid || 'unknown',
            DurationMs: duration,
            FileType: fileExtension,
            FileSizeBytes: blob.size,
            ImageWidthPx: originalWidth,
            ImageHeightPx: originalHeight,
            ImageOrientation: orientation,
            Result: KREATIVLITE_RESULT_SUCCESS,
            RetryCount: retryCount,
            ExifMetadata: exifMetadata,
        })

        trackGoogleAnalytics({
            action: imageUploadTracking?.gaAction ?? GA_ACTION_KREATIVLITE_IMAGE_UPLOAD,
            category: imageUploadTracking?.gaCategory ?? GA_CATEGORY_DYH_SUGARCUBE,
            label: KREATIVLITE_RESULT_SUCCESS,
            custom: {
                FileId: uploadUuid || 'unknown',
                DurationMs: String(duration),
                FileType: fileExtension,
                FileSizeBytes: String(blob.size),
                ImageWidthPx: String(originalWidth),
                ImageHeightPx: String(originalHeight),
                ImageOrientation: orientation,
                Result: KREATIVLITE_RESULT_SUCCESS,
                RetryCount: String(retryCount),
            },
        })

        return sceneResponse.sceneId
    } catch (error) {
        // Track upload failure
        const duration = Date.now() - startTime
        const errorTracking = getErrorTracking(error instanceof Error ? error : new Error(String(error)))

        workflow(imageUploadTracking?.event ?? KREATIVLITE_IMAGE_UPLOAD, {
            FileId: uploadUuid || 'unknown',
            DurationMs: duration,
            FileType: fileExtension,
            FileSizeBytes: blob.size,
            ImageWidthPx: originalWidth,
            ImageHeightPx: originalHeight,
            ImageOrientation: orientation,
            Result: KREATIVLITE_RESULT_FAIL,
            ErrorCode: errorTracking.ErrorCode,
            ErrorMessage: errorTracking.ErrorMessage,
            RetryCount: retryCount,
            ExifMetadata: exifMetadata,
        })

        trackGoogleAnalytics({
            action: imageUploadTracking?.gaAction ?? GA_ACTION_KREATIVLITE_IMAGE_UPLOAD,
            category: imageUploadTracking?.gaCategory ?? GA_CATEGORY_DYH_SUGARCUBE,
            label: KREATIVLITE_RESULT_FAIL,
            custom: {
                FileId: uploadUuid || 'unknown',
                DurationMs: String(duration),
                FileType: fileExtension,
                FileSizeBytes: String(blob.size),
                ImageWidthPx: String(originalWidth),
                ImageHeightPx: String(originalHeight),
                ImageOrientation: orientation,
                Result: KREATIVLITE_RESULT_FAIL,
                ErrorCode: errorTracking.ErrorCode || '',
                ErrorMessage: errorTracking.ErrorMessage || '',
                RetryCount: String(retryCount),
            },
        })

        // eslint-disable-next-line no-console
        console.error('Image upload failed:', error)
        Sentry.captureException(error, {
            contexts: {
                imageUpload: {
                    filename,
                    fileSize: blob.size,
                    imageWidth: originalWidth,
                    imageHeight: originalHeight,
                    retryCount,
                },
            },
        })
        throw new Error('Failed to upload your image, please try again')
    }
}
