// Strings are not user-facing, so disabling i18next rule
/* eslint-disable i18next/no-literal-string */

import type { ExifTags } from 'exif-js'
import {
    KREATIVLITE_ORIENTATION_PORTRAIT,
    KREATIVLITE_ORIENTATION_LANDSCAPE,
    KREATIVLITE_ORIENTATION_SQUARE,
    KREATIVLITE_ERROR_UNKNOWN,
} from 'models/tracking/constants'

/**
 * Calculate image orientation based on dimensions
 */
export function getOrientation(width: number, height: number): string {
    if (width === height) return KREATIVLITE_ORIENTATION_SQUARE
    return height > width ? KREATIVLITE_ORIENTATION_PORTRAIT : KREATIVLITE_ORIENTATION_LANDSCAPE
}

/**
 * Filter null/undefined values from EXIF data
 */
export function filterNullValues<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Partial<T> = {}
    Object.entries(obj).forEach(([key, value]) => {
        if (value != null) {
            result[key as keyof T] = value as T[keyof T]
        }
    })
    return result
}

/**
 * Get error tracking data for upload errors
 */
export function getErrorTracking(error: unknown): { ErrorCode?: string; ErrorMessage: string } {
    const err = error as { response?: { status?: number }; message?: string }
    return {
        ErrorCode: err.response?.status ? String(err.response.status) : undefined,
        ErrorMessage: err.message || KREATIVLITE_ERROR_UNKNOWN,
    }
}

/**
 * Extract file extension from filename (lowercase, without dot)
 */
export function getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.')
    if (lastDotIndex === -1) {
        return 'unknown'
    }
    return filename.slice(lastDotIndex + 1).toLowerCase()
}

/**
 * Convert EXIF tags to a clean metadata object with non-null values only
 */
export function formatExifMetadata(exifData: ExifTags): Record<string, unknown> | undefined {
    const filtered = filterNullValues(exifData)
    return Object.keys(filtered).length > 0 ? filtered : undefined
}
