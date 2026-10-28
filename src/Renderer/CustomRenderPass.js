import { Color } from 'three'
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'

// YP: Based on RenderPass
class CustomRenderPass extends Pass {
    constructor(renderFunc, clearColor = false, clearAlpha = false) {
        super()

        this.renderFunc = renderFunc

        this.clearColor = clearColor
        this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 0

        this.clear = true
        this.clearDepth = false
        this.needsSwap = false
        this.oldClearColor = new Color()
    }

    /* eslint-disable no-param-reassign */
    render( renderer, writeBuffer, readBuffer /* , deltaTime, maskActive */ ) {
        const oldAutoClear = renderer.autoClear
        renderer.autoClear = false

        let oldClearAlpha

        if ( this.clearColor ) {
            renderer.getClearColor(this.oldClearColor)
            oldClearAlpha = renderer.getClearAlpha()

            renderer.setClearColor(this.clearColor, this.clearAlpha)
        }

        if ( this.clearDepth ) {
            renderer.clearDepth()
        }

        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer)

        // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
        if (this.clear) {
            renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil)
        }

        if (this.renderFunc) {
            this.renderFunc()
        }

        if (this.clearColor) {
            renderer.setClearColor(this.oldClearColor, oldClearAlpha)
        }

        renderer.autoClear = oldAutoClear
    }
    /* eslint-enable no-param-reassign */
}

export default CustomRenderPass
