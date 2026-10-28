import { isImageBlack } from 'Renderer/ImageUtils'

const generateThumbnailFromPreview = (scale = 1.0, quality = 0.92) =>
    new Promise((resolve, reject) => {
        try {
            // Temporarily increasing thumbnail telemetry to track errors
            const thumbTelemetry = {}
            thumbTelemetry.scale = scale
            thumbTelemetry.quality = quality
            thumbTelemetry.tabIsHidden = document.hidden

            const artCanvas = document.getElementById('PreviewCanvas')
            thumbTelemetry.artCanvasExists = !!artCanvas
            thumbTelemetry.artCanvasWidth = artCanvas?.width
            thumbTelemetry.artCanvasHeight = artCanvas?.height

            if (!artCanvas) {
                throw new Error('No canvas data sources')
            }

            const gl =
                artCanvas.getContext('webgl2') ||
                artCanvas.getContext('webgl') ||
                artCanvas.getContext('experimental-webgl')
            const artData = new Uint8Array(artCanvas.width * artCanvas.height * 4)
            gl?.readPixels(0, 0, artCanvas.width, artCanvas.height, gl.RGBA, gl.UNSIGNED_BYTE, artData)
            thumbTelemetry.artCanvasContextInitialized = !!gl
            thumbTelemetry.artCanvasIsBlack = isImageBlack(artData)

            const thumbCanvas = document.createElement('canvas')
            thumbCanvas.width = scale * artCanvas.width
            thumbCanvas.height = scale * artCanvas.height
            thumbTelemetry.thumbCanvasExists = !!thumbCanvas
            thumbTelemetry.thumbCanvasWidth = thumbCanvas?.width
            thumbTelemetry.thumbCanvasHeight = thumbCanvas?.height

            const thumbCanvasContext = thumbCanvas.getContext('2d')
            thumbTelemetry.thumbCanvasContextInitialized = !!thumbCanvasContext

            thumbCanvasContext.scale(scale, scale)
            thumbCanvasContext.drawImage(artCanvas, 0, 0)
            thumbCanvasContext.scale(1, 1)

            const imgData = thumbCanvasContext.getImageData(0, 0, thumbCanvas.width, thumbCanvas.height)
            const thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', quality)
            thumbTelemetry.imageIsBlack = isImageBlack(imgData.data)

            resolve({ thumbDataUrl, thumbTelemetry })
        } catch (error) {
            reject(error)
        }
    })

export default generateThumbnailFromPreview
