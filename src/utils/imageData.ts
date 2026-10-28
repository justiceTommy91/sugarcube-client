export async function generateImageData(
        imageUrl: string,
    ): Promise<{ artImageData: ImageData; msFileDownloadTime: number }> {
        // Load wallart and return the resulting imageData
        const msStartLoad = Date.now()
        const artStagingCanvas = document.createElement('canvas')
        const artStagingContext = artStagingCanvas.getContext('2d')
        if (artStagingContext == null) {
            throw new Error('failed to acquire context')
        }
        const artImg = new Image()
        // eslint-disable-next-line i18next/no-literal-string
        artImg.crossOrigin = 'anonymous'
        artImg.src = imageUrl

        return new Promise((resolve) => {
            artImg.onload = () => {
                artStagingCanvas.width = artImg.width
                artStagingCanvas.height = artImg.height
                artStagingContext.drawImage(artImg, 0, 0)
                const artImageData = artStagingContext.getImageData(0, 0, artImg.width, artImg.height)
                const msFileDownloadTime = Date.now() - msStartLoad

                resolve({ artImageData, msFileDownloadTime })
            }
        })
    }