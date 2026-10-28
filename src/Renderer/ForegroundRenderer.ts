import * as THREE from 'three'

import { isSkySphereObj } from './rendering/rendering_types'
import { createFlatColorMaterial } from './ColorIdRenderer'

export class ForegroundRenderer {
    private scene: THREE.Scene | undefined | null
    private renderer: THREE.WebGLRenderer | THREE.WebGL1Renderer | undefined | null
    private camera: THREE.Camera | undefined | null

    private rtWidth = 0
    private rtHeight = 0

    constructor(
        scene: THREE.Scene | undefined | null,
        renderer: THREE.WebGLRenderer | THREE.WebGL1Renderer | undefined | null,
        camera: THREE.Camera | undefined | null,
    ) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
    }

    setSize(rtWidth: number, rtHeight: number) {
        this.rtWidth = rtWidth
        this.rtHeight = rtHeight
    }

    private static createWhiteMaterial(): THREE.ShaderMaterial {
        const whiteMaterial = createFlatColorMaterial(0.0, 1.0)
        whiteMaterial.uniforms.diffuse.value = new THREE.Color(1.0, 1.0, 1.0)
        return whiteMaterial
    }

    /**
     * Renders the whole scene with every item coloured solid white (background stays black),
     * then returns the ratio of pixels that are white to the total pixel count.
     */
    public computeForegroundRatio(): number {
        if (this.rtWidth === 0 || this.rtHeight === 0) {
            return 0
        }

        if (
            !this.scene || 
            !this.camera || 
            !this.renderer) {
            return 0
        }

        const tempRenderTarget = new THREE.WebGLRenderTarget(
            this.rtWidth,
            this.rtHeight,
            {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                colorSpace: THREE.LinearSRGBColorSpace,
                stencilBuffer: true,
            },
        )

        const prevOverride = this.scene.overrideMaterial
        this.scene.overrideMaterial = ForegroundRenderer.createWhiteMaterial()

        // Render into the temporary target
        const prevRenderTarget = this.renderer.getRenderTarget()
        const prevClearColor = this.renderer.getClearColor(new THREE.Color())
        const prevClearAlpha = this.renderer.getClearAlpha()
        const prevEncoding = this.renderer.outputColorSpace

        this.renderer.setClearColor(new THREE.Color(0.0, 0.0, 0.0))
        this.renderer.setClearAlpha(1.0)
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
        this.renderer.setRenderTarget(tempRenderTarget)
        this.renderer.clear()

        // Temporarily hide skysphere object so is doesn't appear as white
        const hiddenObjects: THREE.Object3D[] = []
        this.scene.traverse((obj) => {
            if (isSkySphereObj(obj) && obj.visible) {
                obj.visible = false
                hiddenObjects.push(obj)
            }
        })

        this.renderer.render(this.scene, this.camera)

        hiddenObjects.forEach((obj) => { obj.visible = true })

        this.renderer.setClearColor(prevClearColor)
        this.renderer.setClearAlpha(prevClearAlpha)
        this.renderer.outputColorSpace = prevEncoding
        this.renderer.setRenderTarget(prevRenderTarget)

        this.scene.overrideMaterial = prevOverride

        // Read pixels and count any non-black pixel
        const pixelCount = this.rtWidth * this.rtHeight
        const buffer = new Uint8Array(pixelCount * 4)
        let count = 0
        try {
            this.renderer.readRenderTargetPixels(tempRenderTarget, 0, 0, this.rtWidth, this.rtHeight, buffer)

            for (let i = 0; i < pixelCount; i += 1) {
                if (buffer[i * 4] > 0 || buffer[i * 4 + 1] > 0 || buffer[i * 4 + 2] > 0) {
                    count += 1
                }
            }
        } catch (err) {
            // ignore read errors; count stays 0
        }
        tempRenderTarget.dispose()
        return count / pixelCount
    }
}
