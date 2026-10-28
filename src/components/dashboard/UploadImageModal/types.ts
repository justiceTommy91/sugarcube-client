import type { ExifTags } from 'exif-js'

// Upload status constants
export const UPLOAD_STATUS_IDLE = 'idle' as const
export const UPLOAD_STATUS_PROCESSING = 'processing' as const
export const UPLOAD_STATUS_UPLOADING = 'uploading' as const
export const UPLOAD_STATUS_SUCCESS = 'success' as const
export const UPLOAD_STATUS_ERROR = 'error' as const

export type UploadStatus =
    | typeof UPLOAD_STATUS_IDLE
    | typeof UPLOAD_STATUS_PROCESSING
    | typeof UPLOAD_STATUS_UPLOADING
    | typeof UPLOAD_STATUS_SUCCESS
    | typeof UPLOAD_STATUS_ERROR

export interface ResizeDebugInfo {
    originalDimensions: { width: number; height: number }
    finalDimensions: { width: number; height: number }
    originalSize: number
    finalSize: number
    wasResized: boolean
    fileType: string
    fileName: string
    exifData?: ExifTags
}

// Error type constants
export const UPLOAD_ERROR_FILE_TOO_LARGE = 'FILE_TOO_LARGE' as const
export const UPLOAD_ERROR_UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT' as const
export const UPLOAD_ERROR_UPLOAD_FAILED = 'UPLOAD_FAILED' as const

export type UploadErrorType =
    | typeof UPLOAD_ERROR_FILE_TOO_LARGE
    | typeof UPLOAD_ERROR_UNSUPPORTED_FORMAT
    | typeof UPLOAD_ERROR_UPLOAD_FAILED

export interface UploadError {
    type: UploadErrorType
    message: string
    userMessage: string
    details?: Record<string, unknown>
}

export interface UploadState {
    status: UploadStatus
    message?: string
    error?: UploadError
    debugInfo?: ResizeDebugInfo
    processedBlob?: Blob
}
