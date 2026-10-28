/**
 * Downloads an image blob via a programmatic anchor-click.
 */
export function downloadImage(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    // Revoke after a brief delay to allow the browser to initiate the download
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
