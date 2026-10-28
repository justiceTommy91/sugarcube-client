import Renderer from 'Renderer'

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
const dataUrlToFile = async (dataUrl, fileName, mimeType) => {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    return new File([blob], fileName, { type: mimeType })
}
// Note: commenting out parameters to quiet lint warning.
const uploadPreviewScreenshot = async (/* fileName, renderSessionId, metadata = {} */) => {
    /*
        Avoid taking a screenshot when the renderer is still not fully initialized. This can happen when:
        - the furnitureItems are loaded faster than the scene's metadata.
        - Some of the room manifest resources failed to load leading to non-initialized wall dimensions.
        - The renderer has lost or couldn't create the webgl context.
        - The tab is in the background.
    */

    // Avoid taking screenshots if the tab/window is in background
    if (document.visibilityState === 'hidden') {
        await new Promise((resolve) => {
            document.addEventListener('visibilitychange', resolve, { once: true })
        })
    }

    const renderer = Renderer.getInstance()
    const [width, height] = renderer.getWallDimensions()
    if (
        !renderer?.getThreeRenderer()?.getContext() ||
        renderer.getThreeRenderer().getContext().isContextLost() ||
        !renderer.canvas.width ||
        !renderer.canvas.height ||
        width === 1 ||
        height === 1 ||
        !renderer.getHasRendered()
    ) {
        return Promise.reject()
    }

    // TODO: (cang4d) Enable screenshot upload when CORS issue is fixed.
    // const mimeType = 'image/jpeg'
    // const file = await dataUrlToFile(thumb.thumbDataUrl, fileName, mimeType)
    // const uuid = await uploadScreenshot(file, renderSessionId, metadata)
    return new Promise((resolve, reject) => {
        renderer.takeRoomScreenshot(
            (thumb) => {
                resolve({
                    uuid: '', // TODO: Set to upload UUID.
                    thumbTelemetry: thumb.thumbTelemetry,
                })
            },
            (error) => {
                reject(error)
            },
            'uploadPreviewScreenshot',
        )
    })
}

export default uploadPreviewScreenshot
