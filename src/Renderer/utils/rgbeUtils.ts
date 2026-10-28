/* eslint-disable no-continue */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable no-bitwise */

import * as THREE from 'three'
import { EnvMapProjectionMaterial } from 'Renderer/EnvMapProjectionMaterial'
import { IOffscreenRenderContext } from 'Renderer/rendering/OffscreenRenderer'

const MIN_RUN_LENGTH = 4
const MAX_RUN_LENGTH = 127
const MAX_LITERAL = 128

const MAX_HDR_FILE_SIZE = 716800
const MIN_HDR_FILE_SIZE = 51200

export interface HDRValidationResult {
    valid: boolean
    error?: string
}

function decodeHalfFloat(value: number): number {
  const exponent = (value >> 10) & 0x1F
  const fraction = value & 0x3FF
  if (exponent === 0) {
      return (fraction / 1024) * (2 ** -14)
  }
  if (exponent === 31) {
      return fraction ? NaN : Infinity
  }
  return (1 + fraction / 1024) * (2 ** (exponent - 15))
}

function fillRLEChannel(channel: Uint8Array, compressedChannel: Uint8Array,
  writeIndex: number): number {
  let readIndex = 0
  while (readIndex < channel.length) {
    // Try to detect a run starting at readIndex.
    let currentRunLength = 1
    let currentRunValue = channel[readIndex]
    while (
      readIndex + currentRunLength < channel.length
      && currentRunLength < MAX_RUN_LENGTH
      && channel[readIndex + currentRunLength] === currentRunValue
    ) {
      currentRunLength += 1
    }

    // Emit run: [128 + runLen][value].
    if (currentRunLength >= MIN_RUN_LENGTH) {
      compressedChannel[writeIndex++] = 128 + currentRunLength
      compressedChannel[writeIndex++] = currentRunValue
      readIndex += currentRunLength
      continue
    }

    // Otherwise, emit a literal block.
    let literalCount = 0
    const literalStart = readIndex
    while (readIndex < channel.length && literalCount < MAX_LITERAL) {
      currentRunValue = channel[readIndex]
      currentRunLength = 1
      while (
        readIndex + currentRunLength < channel.length
        && currentRunLength < MAX_RUN_LENGTH
        && channel[readIndex + currentRunLength] === currentRunValue
      ) {
        currentRunLength += 1
      }

      // stop literal here; let the next loop encode the run.
      if (currentRunLength >= MIN_RUN_LENGTH) {
        break
      }

      readIndex += 1
      literalCount += 1
    }

    // Emit literal packet: [count][bytes...].
    compressedChannel[writeIndex++] = literalCount
    for (let j = 0; j < literalCount; j++) {
      compressedChannel[writeIndex++] = channel[literalStart + j]
    }
  }

  return writeIndex
}

export function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i += 1) {
    const code = s.charCodeAt(i)
    out[i] = code
  }
  return out
}

export function encodeRLE(data: Uint8Array, width: number, height: number): Uint8Array {
  // Pre-allocate output buffer with a safe upper bound.
  const perScan = 4 + 4 * (width + Math.ceil(width / 128))
  const maxSize = perScan * height

  let writeIndex = 0
  const compressedData = new Uint8Array(maxSize)
  const channel = new Uint8Array(width)
  for (let y = 0; y < height; y += 1) {
    const scanlineOffset = y * width * 4

    // RLE compression requires a scanline start marker formated as below.
    // byte 0: 0x02
    // byte 1: 0x02
    // byte 2: width_hi   (high 8 bits of the scanline width)
    // byte 3: width_lo   (low 8 bits of the scanline width)
    /* eslint-disable no-plusplus */
    compressedData[writeIndex++] = 0x02
    compressedData[writeIndex++] = 0x02
    compressedData[writeIndex++] = (width >> 8) & 0xff
    compressedData[writeIndex++] = width & 0xff
    /* eslint-enable no-plusplus */

    // Encode each channel separately (R, G, B, E).
    for (let c = 0; c < 4; c += 1) {
      for (let x = 0; x < width; x += 1) {
        channel[x] = data[scanlineOffset + 4 * x + c]
      }

      writeIndex = fillRLEChannel(channel, compressedData, writeIndex)
    }
  }

  // Slice to the actual used size.
  return compressedData.subarray(0, writeIndex)
}

export function halfFloatToFloat32Array(halfFloatArray: Uint16Array): Float32Array {
  const float32Array = new Float32Array(halfFloatArray.length)
  for (let i = 0; i < halfFloatArray.length; i += 1) {
      float32Array[i] = decodeHalfFloat(halfFloatArray[i])
  }
  return float32Array
}

export function encodeRGBE(data: Float32Array, width: number, height: number): Uint8Array {
  const hdrData = new Uint8Array(width * height * 4)

  for (let i = 0; i < width * height; i += 1) {
      const r = data[i * 4 + 0]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]

      const maxRGB = Math.max(r, g, b)
      if (maxRGB < 1e-32) {
          hdrData.set([0, 0, 0, 0], i * 4)
      } else {
          const exponent = Math.ceil(Math.log2(maxRGB))
          const scale = (2 ** -exponent) * 255
          hdrData.set([r * scale, g * scale, b * scale, exponent + 128], i * 4)
      }
  }

  return hdrData
}

export function exportHDRblobFromPixelData(pixelArr: Uint16Array,
  width: number, height: number): Blob {
  const float16Buff = halfFloatToFloat32Array(pixelArr)
  const rgbeData = encodeRGBE(float16Buff, width, height)
  const compressedRgbeData = encodeRLE(rgbeData, width, height) as BlobPart
  const header = `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`
  const asciiHeader = asciiBytes(header) as BlobPart
  const hdrBlob = new Blob([asciiHeader, compressedRgbeData], { type: `application/octet-stream` })
  return hdrBlob
}

export function projectEquirectRTfromMipmaps(offscreenRenderCtx: IOffscreenRenderContext,
  map: THREE.Texture): THREE.WebGLRenderTarget {
  
  const originalRenderTarget = offscreenRenderCtx.getRenderTarget()
  const originalToneMapping = offscreenRenderCtx.toneMapping

  const panoProjectionMaterial = new EnvMapProjectionMaterial(map)
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), panoProjectionMaterial)
  const scene = new THREE.Scene()
  scene.add(quad)

  const camera = new THREE.OrthographicCamera(-1, 1, 0.5, -0.5, 0, 1)

  const width = 512
  const height = 256
  const panoRenderTarget = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.LinearSRGBColorSpace,
  })

  offscreenRenderCtx.setRenderTarget(panoRenderTarget)
  offscreenRenderCtx.toneMapping = THREE.NoToneMapping

  offscreenRenderCtx.render(scene, camera)

  offscreenRenderCtx.toneMapping = originalToneMapping
  offscreenRenderCtx.setRenderTarget(originalRenderTarget)

  quad.material.dispose()
  quad.geometry.dispose()

  return panoRenderTarget
}

export function validateHDRfile(file: Blob | null | undefined): HDRValidationResult {
  if (!file) {
    return {
      valid: false,
      error: `HDR file not generated.`
    }
  }
  if (file.size > MAX_HDR_FILE_SIZE) {
    return {
      valid: false,
      error: `HDR file size too large.`
    }
  }
  if (file.size < MIN_HDR_FILE_SIZE) {
    return {
      valid: false,
      error: `HDR file is empty.`,
    }
  }

  return { valid: true }    
}
