import * as THREE from 'three'

export interface IOffscreenRenderContext {
    render(scene: THREE.Scene, camera: THREE.Camera): void;

    getRenderTarget(): THREE.WebGLRenderTarget | null;
    setRenderTarget(rt: THREE.WebGLRenderTarget | null): void;

    getSize(v: THREE.Vector2): THREE.Vector2;
    setSize(width: number, height: number): void; 

    getPixelRatio(): number;
    setPixelRatio(v: number): void;

    toneMapping: THREE.ToneMapping;

    readRenderTargetPixels(
        target: THREE.WebGLRenderTarget,
        x: number, y: number, w: number, h: number,
        buffer: Uint8Array | Uint8ClampedArray | Uint16Array
    ): void;
}
export class OffscreenRenderer {
    private renderer: THREE.WebGLRenderer
    private width: number
    private height: number
    private renderTarget: THREE.WebGLRenderTarget | null = null

    constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
        this.renderer = renderer
        this.width = width
        this.height = height
    }

    cleanup() {
        if (this.renderTarget) {
            this.renderTarget.dispose()
            this.renderTarget = null
        }
    }

    recreateRenderTarget() {
        if (this.renderTarget) {
            this.renderTarget.dispose()
            this.renderTarget = null
        }
        this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                colorSpace: THREE.LinearSRGBColorSpace,
                format: THREE.RGBAFormat,
                stencilBuffer: true,
            })
    }

    renderToCanvas(canvas: HTMLCanvasElement, renderFn: () => void ): void {
        if (!this.renderTarget) {
            this.recreateRenderTarget()
        }
        if (!this.renderTarget) {
            return
        }

        const { width, height } = canvas
        this.renderTarget.setSize(width, height)

        this.renderer.setRenderTarget(this.renderTarget)

        renderFn()

        // read pixels
        const buffer = new Uint8Array(width * height * 4)
        try {
            this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, this.renderTarget.width,
                this.renderTarget.height, buffer)
        } catch (err) {
            return
        }

        const context = canvas.getContext('2d')
        if (context) {
            const imageData = new ImageData(width, height)
            // Copy image data bottom to top, to flip the image vertically.
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                  const srcIndex = (y * width + x) * 4
                  const destIndex = ((height - y - 1) * width + x) * 4
                  imageData.data[destIndex] = buffer[srcIndex]
                  imageData.data[destIndex + 1] = buffer[srcIndex + 1]
                  imageData.data[destIndex + 2] = buffer[srcIndex + 2]
                  imageData.data[destIndex + 3] = buffer[srcIndex + 3]
                }
              }
            context.putImageData(imageData, 0, 0)
        }

        this.renderer.setRenderTarget(null)
    }
}
