/* This code is a browser customized version of https://www.npmjs.com/package/@cwasm/lodepng */

import axios from 'axios'
import { getE2ETestingEnv, getTestingEnv } from './environment'

const lpng = { code: null, module: null, instance: null }

// eslint-disable-next-line @typescript-eslint/naming-convention
export const initialize_lpng = async () => {
    // Get the wasm binary
    try {
        const isTestingEnv = getTestingEnv() || getE2ETestingEnv()
        lpng.code = await axios({
            method: 'GET',
            url: `${isTestingEnv ? '' : process.env.GATSBY_ASSET_BUCKET}/wasm/lodepng.wasm`,
            responseType: 'arraybuffer',
        })
    } catch (err) {
        return false
    }

    // Instantiate the wasm instance and set the instance state for future access
    try {
        const returnedWasm = await WebAssembly.instantiate(lpng.code.data)
        lpng.module = returnedWasm.module
        lpng.instance = returnedWasm.instance
    } catch {
        return false
    }

    // Success signal
    return true
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const is_lpng_initialized = () => lpng.code && lpng.module && lpng.instance

export const decode = (input) => {
    // Allocate memory to hand over the input data to WASM
    const inputPointer = lpng.instance.exports.malloc(input.byteLength)
    const targetView = new Uint8Array(lpng.instance.exports.memory.buffer, inputPointer, input.byteLength)

    // Copy input data into WASM readable memory
    targetView.set(input)

    // Allocate metadata (outputPointer, width, and height)
    const metadataPointer = lpng.instance.exports.malloc(12)

    // Decode input data
    const error = lpng.instance.exports.lodepng_decode32(
        metadataPointer,
        metadataPointer + 4,
        metadataPointer + 8,
        inputPointer,
        input.byteLength,
    )

    // Free the input data in WASM land
    lpng.instance.exports.free(inputPointer)

    // Guard return value for NULL pointer
    if (error !== 0) {
        lpng.instance.exports.free(metadataPointer)
        return null
    }

    // Read returned metadata
    const metadata = new Uint32Array(lpng.instance.exports.memory.buffer, metadataPointer, 3)
    const [outputPointer, width, height] = metadata

    // Free the metadata in WASM land
    lpng.instance.exports.free(metadataPointer)

    // Create an empty buffer for the resulting data
    const outputSize = width * height * 4
    const output = new Uint8ClampedArray(outputSize)

    // Copy decoded data from WASM memory to JS
    output.set(new Uint8Array(lpng.instance.exports.memory.buffer, outputPointer, outputSize))

    // Free WASM copy of decoded data
    lpng.instance.exports.free(outputPointer)

    // Return decoded image data
    return { output, width, height }
}

export const encode = (input) => {
    // Allocate memory to hand over the input data to WASM
    const inputPointer = lpng.instance.exports.malloc(input.data.byteLength)
    const targetView = new Uint8Array(lpng.instance.exports.memory.buffer, inputPointer, input.data.byteLength)

    // Copy input data into WASM readable memory
    targetView.set(input.data)

    // Allocate metadata (outputPointer, outputSize)
    const metadataPointer = lpng.instance.exports.malloc(8)

    // Encode input data
    const error = lpng.instance.exports.lodepng_encode32(
        metadataPointer,
        metadataPointer + 4,
        inputPointer,
        input.width,
        input.height,
    )

    // Free the input data in WASM land
    lpng.instance.exports.free(inputPointer)

    // Guard return value for NULL pointer
    if (error !== 0) {
        lpng.instance.exports.free(metadataPointer)
        return null
    }

    // Read returned metadata
    const metadata = new Uint32Array(lpng.instance.exports.memory.buffer, metadataPointer, 2)
    const [outputPointer, outputSize] = metadata

    // Free the metadata in WASM land
    lpng.instance.exports.free(metadataPointer)

    // Create an empty buffer for the resulting data
    const output = new Uint8Array(outputSize)

    // Copy encoded data from WASM memory to JS
    output.set(new Uint8Array(lpng.instance.exports.memory.buffer, outputPointer, outputSize))

    // Free WASM copy of encoded data
    lpng.instance.exports.free(outputPointer)

    // Return encoded image as raw data
    return output
}
