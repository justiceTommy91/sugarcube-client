/* eslint-disable no-bitwise */
import type { PoleOfInaccessibilitySearchResults } from 'Renderer/PinsManager'

export interface PixelAnalyzeOptions {
    maxCircleRadius: number
    minAcceptableRadius: number
    candidateRadiusTolerance: number
}

export const gatherPolesOfInaccessibility = (
    pixelsBuffer: Uint8Array,
    width: number,
    rasterizedCircles: Array<Array<Array<number>>>,
    options: PixelAnalyzeOptions): PoleOfInaccessibilitySearchResults => {

    const results: PoleOfInaccessibilitySearchResults = new Map()

    const {maxCircleRadius, minAcceptableRadius, candidateRadiusTolerance } = options

    // no copying here, data is shared between intBuffer and pixelsBuffer
    const intBuffer = new Uint32Array(pixelsBuffer.buffer)

    let x = -1
    let y = 0
    for (let i = 0; i < intBuffer.length; i += 1) {
        x += 1
        if (x >= width) {
            x = 0
            y += 1
        }

        const color = intBuffer[i]
        // Ignore black background or pixels with a non-zero red channel (occluded by walls).
        if ((color === 0xFF000000) || (color & 0x000000FF)) {
            // eslint-disable-next-line no-continue
            continue
        }

        // search circles from the biggest possible one to the smallest
        const maxPossibleRadius = Math.min(Math.min(x, y), maxCircleRadius)
        let foundRadius = 0
        for (let currentRadius = maxPossibleRadius; currentRadius > 0; currentRadius -= 1) {
            const circle = rasterizedCircles[maxCircleRadius - currentRadius]
            let fullCircle = true

            // follow the circle pixels and check if they're the same color as the central pixel:
            for (let circleIdx = 0; circleIdx < circle.length; circleIdx += 1) {
                const dx = circle[circleIdx][0]
                const circleX = x + dx
                if ((circleX >= width) || (circleX < 0)) {
                    fullCircle = false
                    foundRadius = 0
                    break
                }

                const dy = circle[circleIdx][1]
                const idx = i + (dx + dy * width)
                if (idx < 0 || idx >= intBuffer.length) {
                    fullCircle = false
                    foundRadius = 0
                    break
                }

                const circlePixelColor = intBuffer[idx]
                if ((circlePixelColor !== color)) {
                    fullCircle = false
                    foundRadius = 0
                    break
                }
            }
            // no breaking here, still need to check smaller circles, since there might be holes within this one
            if (fullCircle && foundRadius === 0) {
                foundRadius = currentRadius
            }
        }

        if (foundRadius > minAcceptableRadius) {
            if (!results.has(color)) {
                results.set(color, {
                    points: [],
                    radius: foundRadius,
                })
            }
            const existingResult = results.get(color)
            // accept greater radii or those within tolerance
            if (existingResult && ((foundRadius >= existingResult.radius)
                || Math.abs(foundRadius - existingResult.radius) <= candidateRadiusTolerance)) {
                if (foundRadius > existingResult.radius) {
                    // Throw away existing bad results, but allow some tolerance to what is considered a "good" result.
                    // That will allow to produce visually "better" final positions using points cluster averaging.
                    existingResult.points =
                        existingResult.points.filter(point => foundRadius - point.radius <= candidateRadiusTolerance)
                    existingResult.radius = foundRadius
                }
                existingResult.points.push({
                    radius: foundRadius, x, y,
                })
            }
        }
    }
    return results
}
