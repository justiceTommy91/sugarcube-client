/* eslint-disable no-restricted-globals */

import { gatherPolesOfInaccessibility } from 'Renderer/utils/pinManagerUtils'

self.onmessage = (e) => {
    const data = e.data

    const { pixelsBuffer, width, rasterizedCircles, options } = data
    const results = gatherPolesOfInaccessibility(pixelsBuffer, width, rasterizedCircles, options)
    self.postMessage({
        results,
        pixelsBuffer,
    }, [pixelsBuffer.buffer])
}
