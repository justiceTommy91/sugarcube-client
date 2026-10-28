/**
 * Image processing utilities for client-side image optimization
 * Includes validation, resizing, filename normalization, and EXIF extraction
 */

// Strings are not user-facing, so disabling i18next rule
/* eslint-disable i18next/no-literal-string */

import type { ExifTags } from 'exif-js'
import * as EXIF from 'exif-js'
import * as Sentry from '@sentry/react'
import type { TFunction } from 'i18next'
import {
    MAX_IMAGE_PIXELS,
    MAX_IMAGE_SIZE_BYTES,
    MAX_IMAGE_SIZE_MB,
    SUPPORTED_IMAGE_TYPES,
    SUPPORTED_IMAGE_EXTENSIONS,
    JPEG_COMPRESSION_QUALITY,
    RESIZE_QUALITY,
} from './constants'
import type { UploadError } from './types'
import { UPLOAD_ERROR_FILE_TOO_LARGE, UPLOAD_ERROR_UNSUPPORTED_FORMAT } from './types'

export interface ValidationResult {
    valid: boolean
    error?: UploadError
}

export interface ResizeResult {
    blob: Blob
    originalDimensions: { width: number; height: number }
    finalDimensions: { width: number; height: number }
    originalSize: number
    finalSize: number
    wasResized: boolean
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File, t: TFunction): ValidationResult {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return {
            valid: false,
            error: {
                type: UPLOAD_ERROR_FILE_TOO_LARGE,
                message: `File size exceeds ${MAX_IMAGE_SIZE_MB}MB limit`,
                userMessage: t('design.kreativLite.upload.file size exceeded', {
                    maxSize: MAX_IMAGE_SIZE_MB,
                }) as string,
                details: { fileSize: file.size, maxSize: MAX_IMAGE_SIZE_BYTES },
            },
        }
    }

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
        // Fallback: check file extension if MIME type is missing
        const lastDotIndex = file.name.lastIndexOf('.')
        const ext = lastDotIndex !== -1 ? file.name.slice(lastDotIndex + 1).toLowerCase() : ''

        if (!ext || !SUPPORTED_IMAGE_EXTENSIONS.includes(ext as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])) {
            return {
                valid: false,
                error: {
                    type: UPLOAD_ERROR_UNSUPPORTED_FORMAT,
                    message: `Unsupported file format: ${file.type || ext}`,
                    userMessage: t('design.kreativLite.upload.unsupported format') as string,
                    details: { fileType: file.type, extension: ext },
                },
            }
        }
    }

    return { valid: true }
}

/**
 * Normalize filename: lowercase extension and convert formats to match content type
 *
 * @param filename - Original filename
 * @param blobType - Optional MIME type of the processed blob (e.g., 'image/jpeg')
 * @returns Normalized filename with lowercase extension matching content
 *
 * @example
 * normalizeFilename('MyPhoto.JPG') // returns 'MyPhoto.jpg'
 * normalizeFilename('image.JPEG') // returns 'image.jpg'
 * normalizeFilename('photo.heic', 'image/jpeg') // returns 'photo.jpg' (HEIC converted to JPEG)
 * normalizeFilename('photo.jpg', 'image/png') // returns 'photo.png' (content converted to PNG)
 * normalizeFilename('Room.PNG') // returns 'Room.png'
 */
export function normalizeFilename(filename: string, blobType?: string): string {
    const lastDotIndex = filename.lastIndexOf('.')
    if (lastDotIndex === -1) {
        // No extension found
        return filename
    }

    const baseName = filename.slice(0, lastDotIndex)
    let extension = filename.slice(lastDotIndex + 1).toLowerCase()

    // Convert .jpeg to .jpg (pipeline requirement)
    if (extension === 'jpeg') {
        extension = 'jpg'
    }

    // If blobType is provided and differs from current extension, update extension to match content
    if (blobType) {
        const blobExtension = blobType.split('/')[1]?.toLowerCase()

        if (
            blobExtension &&
            SUPPORTED_IMAGE_EXTENSIONS.includes(blobExtension as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])
        ) {
            // Normalize blob extension (jpeg → jpg)
            const normalizedBlobExt = blobExtension === 'jpeg' ? 'jpg' : blobExtension

            // Update extension if it doesn't match the blob type
            // This handles cases like HEIC→JPEG, or any format conversion during processing
            if (extension !== normalizedBlobExt) {
                extension = normalizedBlobExt
            }
        }
    }

    return `${baseName}.${extension}`
}

/**
 * Extract EXIF metadata from an image file
 *
 * @param file - Image file to extract EXIF from
 * @returns Promise resolving to EXIF tags object (empty if extraction fails)
 *
 * @example
 * const exifData = await extractExifData(file)
 * if (exifData.Make) {
 *   console.log('Camera:', exifData.Make)
 * }
 */
export async function extractExifData(file: File): Promise<ExifTags> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve({}), 3000)
        const done = (tags: ExifTags) => {
            clearTimeout(timer)
            resolve(tags)
        }

        const img = new Image()
        img.onload = () => {
            EXIF.getData(img, function getExifData() {
                done(EXIF.getAllTags(this))
            })
        }
        img.onerror = () => done({})
        img.src = URL.createObjectURL(file)
    })
}

/**
 * Resize HEIC image using HTMLImageElement (Safari-only)
 * Falls back to returning original if browser doesn't support HEIC
 */
async function resizeHEICImage(file: File, maxPixels: number): Promise<ResizeResult> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = async () => {
            URL.revokeObjectURL(url)

            const { width, height } = img
            const originalDimensions = { width, height }
            const originalSize = file.size

            // Calculate if resize is needed
            const currentPixels = width * height
            let targetWidth = width
            let targetHeight = height
            let wasResized = false

            if (currentPixels > maxPixels) {
                const factor = Math.sqrt(maxPixels / currentPixels)
                targetWidth = Math.round(width * factor)
                targetHeight = Math.round(height * factor)
                wasResized = true
            }

            // Create canvas and draw resized image
            const canvas = document.createElement('canvas')
            canvas.width = targetWidth
            canvas.height = targetHeight
            const ctx = canvas.getContext('2d')

            if (!ctx) {
                reject(new Error('Failed to get canvas context'))
                return
            }

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

            // Convert to JPEG (HEIC -> JPEG conversion for compatibility)
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve({
                            blob,
                            originalDimensions,
                            finalDimensions: { width: targetWidth, height: targetHeight },
                            originalSize,
                            finalSize: blob.size,
                            wasResized,
                        })
                    } else {
                        reject(new Error('Failed to convert canvas to blob'))
                    }
                },
                'image/jpeg',
                JPEG_COMPRESSION_QUALITY,
            )
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to load HEIC image'))
        }

        img.src = url
    })
}

/**
 * Resize an image file to fit within maximum dimensions while preserving aspect ratio
 * Uses createImageBitmap for better performance and quality, with fallback to HTMLImageElement for HEIC on Safari
 */
export async function resizeImage(file: File, maxPixels: number = MAX_IMAGE_PIXELS): Promise<ResizeResult> {
    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif'

    try {
        // Try createImageBitmap first (works for all formats except HEIC)
        const bitmap = await createImageBitmap(file)
        const { width, height } = bitmap

        // Store original dimensions
        const originalDimensions = { width, height }
        const originalSize = file.size

        // Step 2: Calculate if resize is needed
        const currentPixels = width * height
        let targetWidth = width
        let targetHeight = height
        let wasResized = false

        if (currentPixels > maxPixels) {
            const factor = Math.sqrt(maxPixels / currentPixels)
            targetWidth = Math.round(width * factor)
            targetHeight = Math.round(height * factor)
            wasResized = true
        }

        // If no resize needed, return original file to preserve original compression
        if (!wasResized) {
            bitmap.close()
            return {
                blob: file,
                originalDimensions,
                finalDimensions: originalDimensions,
                originalSize,
                finalSize: file.size,
                wasResized: false,
            }
        }

        // Step 3: Create resized bitmap
        const resizedBitmap = await createImageBitmap(bitmap, {
            resizeWidth: targetWidth,
            resizeHeight: targetHeight,
            resizeQuality: RESIZE_QUALITY,
        })

        // Step 4: Convert to canvas and export as Blob
        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            throw new Error('Failed to get canvas context')
        }

        ctx.drawImage(resizedBitmap, 0, 0)

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'

        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (result: Blob | null) => {
                    if (result) {
                        resolve(result)
                    } else {
                        reject(new Error('Failed to convert canvas to blob'))
                    }
                },
                mimeType,
                JPEG_COMPRESSION_QUALITY,
            )
        })

        // Clean up
        bitmap.close()
        resizedBitmap.close()

        return {
            blob,
            originalDimensions,
            finalDimensions: { width: targetWidth, height: targetHeight },
            originalSize,
            finalSize: blob.size,
            wasResized,
        }
    } catch (error) {
        // createImageBitmap failed - try HTMLImageElement fallback for HEIC on Safari
        if (isHEIC) {
            try {
                return await resizeHEICImage(file, maxPixels)
            } catch (heicError) {
                // HEIC resize failed on non-Safari browser - return original file
                // eslint-disable-next-line no-console
                console.warn('HEIC resize not supported, returning original file')
                return {
                    blob: file,
                    originalDimensions: { width: 0, height: 0 },
                    finalDimensions: { width: 0, height: 0 },
                    originalSize: file.size,
                    finalSize: file.size,
                    wasResized: false,
                }
            }
        }

        // Unexpected error for non-HEIC files
        // eslint-disable-next-line no-console
        console.error('Image resize failed:', error)
        Sentry.captureException(error, {
            contexts: {
                imageResize: {
                    fileType: file.type,
                    fileSize: file.size,
                    isHEIC,
                },
            },
        })
        throw new Error('Failed to process image')
    }
}
