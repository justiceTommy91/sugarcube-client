import * as THREE from 'three'
import { IUniform } from 'three'
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader'

// YP: Based three's TAARenderPass, which in turn is based on SSAARenderPass, with customization required for
// SugarCube (e.g. multiple scenes rendering):
// three/examples/jsm/postprocessing/TAARenderPass.js
// three/examples/jsm?postprocessing/SSAARenderPass.js
// https://en.wikipedia.org/wiki/Supersampling


const jitterVectors = [
    [
        [0, 0]
    ],
    [
        [4, 4], [-4, -4]
    ],
    [
        [-2, -6], [6, -2], [-6, 2], [2, 6]
    ],
    [
        [1, -3], [-1, 3], [5, 1], [-3, -5],
        [-5, 5], [-7, -1], [3, 7], [7, -7],
    ],
    [
        [1, 1], [-1, -3], [-3, 2], [4, -1],
        [-5, -2], [2, 5], [5, 3], [3, -5],
        [-2, 6], [0, -7], [-4, -6], [-6, 4],
        [-8, 0], [7, -4], [6, 7], [-7, -8],
    ],
    [
        [-4, -7], [-7, -5], [-3, -5], [-5, -4],
        [-1, -4], [-2, -2], [-6, -1], [-4, 0],
        [-7, 1], [-1, 2], [-6, 3], [-3, 3],
        [-7, 6], [-3, 6], [-5, 7], [-1, 7],
        [5, -7], [1, -6], [6, -5], [4, -4],
        [2, -3], [7, -2], [1, -1], [4, -1],
        [2, 1], [6, 2], [0, 4], [4, 4],
        [2, 5], [7, 5], [5, 6], [3, 7],
    ]
]
interface ExtendedCamera extends THREE.Camera {
    setViewOffset(fullWidth: number, fullHeight: number, x: number,
        y: number, width: number, height: number): void
    clearViewOffset() : void
    view: {
        enabled: boolean
        fullWidth: number
        fullHeight: number
        offsetX: number
        offsetY: number
        width: number
        height: number
    }
}

// (Can4dp: Added accumulateIndex to render func, so that some render passes can 
// leverage per acummulation step variation in sampling. eg. GTAO noise.)
type RenderFunction = (renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget, accumulateIndex: number) => void
class CustomTAARenderPass extends Pass {
    camera: ExtendedCamera

    sampleLevel: number

    accumulate: boolean

    accumulateIndex: number

    holdRenderTarget: THREE.WebGLRenderTarget | null

    sampleRenderTarget: THREE.WebGLRenderTarget | null

    copyUniforms: { [uniform: string]: IUniform }

    fsQuad: FullScreenQuad

    renderFunction: RenderFunction

    unbiased: boolean

    clearColor: THREE.ColorRepresentation

    clearAlpha: number

    oldClearColor: THREE.Color

    copyMaterial: THREE.ShaderMaterial

    isCustomTAARenderPass: boolean

    internalEncoding: THREE.ColorSpace | undefined

    constructor(camera: THREE.Camera, renderFunction: RenderFunction) {

        super()

        this.isCustomTAARenderPass = true

        this.camera = camera as ExtendedCamera

        this.accumulateIndex = -1
        this.sampleLevel = 0
        this.accumulate = false

        this.holdRenderTarget = null
        this.sampleRenderTarget = null

        this.renderFunction = renderFunction

        this.unbiased = true

        // as we need to clear the buffer in this pass, clearColor must be set to something, defaults to black.
        this.clearColor = 0x000000
        this.clearAlpha = 0
        this.oldClearColor = new THREE.Color()

        const copyShader = CopyShader
        this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms)

        this.copyMaterial = new THREE.ShaderMaterial({
            uniforms: this.copyUniforms,
            vertexShader: copyShader.vertexShader,
            fragmentShader: copyShader.fragmentShader,
            premultipliedAlpha: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false
        })

        this.fsQuad = new FullScreenQuad(this.copyMaterial)
    }

    render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget,
        readBuffer: THREE.WebGLRenderTarget) {

        if (!this.sampleRenderTarget) {
            this.sampleRenderTarget = new THREE.WebGLRenderTarget(readBuffer.width, readBuffer.height, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType,
            })
            this.sampleRenderTarget.texture.name = `SSAARenderPass.sample`
        }

        if (!this.accumulate) {
            this.renderInternal(renderer, writeBuffer, readBuffer)
            this.accumulateIndex = - 1
            return
        }

        const jitterOffsets = jitterVectors[5]

        if (!this.holdRenderTarget) {
            this.holdRenderTarget = new THREE.WebGLRenderTarget(readBuffer.width, readBuffer.height, {
                colorSpace: this.internalEncoding,
                stencilBuffer: true,
            })
            this.holdRenderTarget.texture.name = `TAARenderPass.hold`
        }

        if (this.accumulate && this.accumulateIndex === - 1) {
            this.renderInternal(renderer, this.holdRenderTarget, readBuffer)
            this.accumulateIndex = 0
        }

        const oldRT = renderer.getRenderTarget()
        const autoClear = renderer.autoClear
        // eslint-disable-next-line no-param-reassign
        renderer.autoClear = false

        const sampleWeight = 1.0 / (jitterOffsets.length)

        if (this.accumulateIndex >= 0 && this.accumulateIndex < jitterOffsets.length) {

            this.copyUniforms.opacity.value = sampleWeight
            this.copyUniforms.tDiffuse.value = writeBuffer.texture

            // render the scene multiple times, each slightly jitter offset from the last and accumulate the results.
            const numSamplesPerFrame = 2 ** this.sampleLevel
            for (let i = 0; i < numSamplesPerFrame; i += 1) {
                const j = this.accumulateIndex
                const jitterOffset = jitterOffsets[j]

                if (this.camera.setViewOffset) {
                    this.camera.setViewOffset( readBuffer.width, readBuffer.height,
                        jitterOffset[0] * 0.0625, jitterOffset[1] * 0.0625, // 0.0625 = 1 / 16
                        readBuffer.width, readBuffer.height )
                }

                renderer.setRenderTarget(writeBuffer)
                renderer.clear()
                // renderer.render(this.scene, this.camera)
                this.renderFunction(renderer, readBuffer, writeBuffer, this.accumulateIndex)

                renderer.setRenderTarget(this.sampleRenderTarget)
                if (this.accumulateIndex === 0) {
                    renderer.clear()
                }

                this.fsQuad.render(renderer)

                this.accumulateIndex += 1

                if (this.accumulateIndex >= jitterOffsets.length) {
                    break;
                }
            }

            if (this.camera.clearViewOffset) {
                this.camera.clearViewOffset()
            }
        }
        const accumulationWeight = this.accumulateIndex * sampleWeight
        if (accumulationWeight > 0) {
            this.copyUniforms.opacity.value = 1.0
            this.copyUniforms.tDiffuse.value = this.sampleRenderTarget.texture
            renderer.setRenderTarget(writeBuffer)
            renderer.clear()
            this.fsQuad.render(renderer)
        }
        if ( accumulationWeight < 1.0 ) {
            this.copyUniforms.opacity.value = 1.0 - accumulationWeight
            this.copyUniforms.tDiffuse.value = this.holdRenderTarget.texture
            renderer.setRenderTarget(writeBuffer)
            if (accumulationWeight === 0) {
                renderer.clear()
            }
            this.fsQuad.render(renderer)
        }

        // eslint-disable-next-line no-param-reassign
        renderer.autoClear = autoClear
        renderer.setRenderTarget(oldRT)
    }

    renderInternal(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget,
        readBuffer: THREE.WebGLRenderTarget) {
        if (!this.sampleRenderTarget) {
            return
        }

        const jitterOffsets = jitterVectors[Math.max(0, Math.min(this.sampleLevel, 5))]

        const oldRT = renderer.getRenderTarget()
        const autoClear = renderer.autoClear
        // eslint-disable-next-line no-param-reassign
        renderer.autoClear = false

        renderer.getClearColor(this.oldClearColor)
        const oldClearAlpha = renderer.getClearAlpha()

        const baseSampleWeight = 1.0 / jitterOffsets.length
        const roundingRange = 1 / 32
        this.copyUniforms.tDiffuse.value = this.sampleRenderTarget.texture

        const viewOffset = {
            fullWidth: readBuffer.width,
            fullHeight: readBuffer.height,
            offsetX: 0,
            offsetY: 0,
            width: readBuffer.width,
            height: readBuffer.height
        }

        const originalViewOffset = {  ...this.camera.view }

        if (originalViewOffset.enabled) {
            Object.assign(viewOffset, originalViewOffset)
        }

        // render the scene multiple times, each slightly jitter offset from the last and accumulate the results.
        for (let i = 0; i < jitterOffsets.length; i += 1) {
            const jitterOffset = jitterOffsets[i]
            if (this.camera.setViewOffset) {
                this.camera.setViewOffset(
                    viewOffset.fullWidth,
                    viewOffset.fullHeight,
                    viewOffset.offsetX + jitterOffset[0] * 0.0625, // 0.0625 = 1 / 16
                    viewOffset.offsetY + jitterOffset[1] * 0.0625,
                    viewOffset.width,
                    viewOffset.height
                )
            }

            let sampleWeight = baseSampleWeight

            if (this.unbiased) {
                // the theory is that equal weights for each sample lead to an accumulation of rounding errors.
                // The following equation varies the sampleWeight per sample so that it is uniformly distributed
                // across a range of values whose rounding errors cancel each other out.
                const uniformCenteredDistribution = (-0.5 + (i + 0.5) / jitterOffsets.length)
                sampleWeight += roundingRange * uniformCenteredDistribution
            }

            this.copyUniforms.opacity.value = sampleWeight
            renderer.setClearColor(this.clearColor, this.clearAlpha)
            renderer.setRenderTarget(writeBuffer)
            renderer.clear()
            // renderer.render(this.scene, this.camera)
            this.renderFunction(renderer, readBuffer, writeBuffer, this.accumulateIndex)

            // renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)

            // if (i === 0) {
            //     renderer.setClearColor(0x000000, 0.0)
            //    renderer.clear()
            // }

            // this.fsQuad.render(renderer)
        }

        if (this.camera.setViewOffset && originalViewOffset.enabled) {
            this.camera.setViewOffset(
                originalViewOffset.fullWidth, originalViewOffset.fullHeight,
                originalViewOffset.offsetX, originalViewOffset.offsetY,
                originalViewOffset.width, originalViewOffset.height
            )
        } else if ( this.camera.clearViewOffset ) {
            this.camera.clearViewOffset()
        }

        renderer.setRenderTarget(oldRT)
        // eslint-disable-next-line no-param-reassign
        renderer.autoClear = autoClear
        renderer.setClearColor(this.oldClearColor, oldClearAlpha)
    }

    setEncoding(encoding: THREE.ColorSpace) {
        this.internalEncoding = encoding
        if (this.holdRenderTarget) this.holdRenderTarget.texture.colorSpace = encoding
    }

    dispose() {
        if (this.holdRenderTarget) {
            this.holdRenderTarget.dispose()
        }
        if (this.sampleRenderTarget) {
            this.sampleRenderTarget.dispose()
        }
    }

    setSize(width: number, height: number): void {
        if (this.holdRenderTarget) {
            this.holdRenderTarget.setSize(width, height)
        }
        if (this.sampleRenderTarget) {
            this.sampleRenderTarget.setSize(width, height)
        }
    }

    setCamera(camera: THREE.Camera) {
        this.camera = camera as ExtendedCamera
    }
}

export default CustomTAARenderPass
