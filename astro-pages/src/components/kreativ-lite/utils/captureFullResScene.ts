// eslint-disable-next-line i18next/no-literal-string
const JPEG_MIME_TYPE = 'image/jpeg'

/**
 * Captures the full-resolution WebGL canvas as a JPEG Blob.
 * Unlike captureCanvasThumbnail (in useCompositionSave), this preserves
 * the full canvas dimensions without cropping.
 * Returns undefined if the canvas is unavailable or toBlob fails.
 */
export function captureFullResScene(canvas: HTMLCanvasElement): Promise<Blob | undefined> {
    return new Promise((resolve) => {
        try {
            canvas.toBlob((blob) => resolve(blob ?? undefined), JPEG_MIME_TYPE, 0.92)
        } catch {
            resolve(undefined)
        }
    })
}
