import * as THREE from 'three';
import type { AssetManager } from 'Renderer/assets/AssetManager';
import PCSSShadowMaterial from 'Renderer/PCSSShadowMaterial';
import * as constants from 'Renderer/constants'

// TODO(georges): For now the material gets a straight connection to the renderer. This needs
// to be revisited when the renderer is re-architected. E.g. the texture should probably
// come from the AssetManager.
interface ThreeRendererConnector {
    // A Threejs webgl renderer instance
    getThreeRenderer(): THREE.WebGLRenderer;
    // An asset manager instance
    assetManager: AssetManager;
}

class MaskedPCSSShadowMaterial extends PCSSShadowMaterial {

    renderer: ThreeRendererConnector;

    constructor(
        renderer: ThreeRendererConnector,
        index: number,
        inpaintIndex: number,
        parameters: THREE.ShaderMaterialParameters,
    ) {
        super(parameters);

        this.type = `MaskedPCSSShadowMaterial`;
        this.renderer = renderer;

        this.uniforms = THREE.UniformsUtils.clone(this.uniforms)
        this.uniforms.mux = { value: null }
        this.defines.PLANE_INDEX = index
        this.defines.PLANE_INDEX_INPAINT = inpaintIndex

        this.fragmentShader = this.fragmentShader.replace(
            `void main() {`,
            `
            uniform vec2 resolution;
            uniform sampler2D segmentationMap;
            uniform sampler2D segmentationMapInpaint;
            uniform sampler2D mux;

            void main() {
                #ifdef USE_SEGMENTATION
                    vec2 uv = (gl_FragCoord.xy - 0.5) / resolution.xy;
                    vec2 flipUV = vec2(uv.x, 1.0 - uv.y);

                    vec4 segmentation = texture2D(segmentationMap, flipUV);
                    vec4 segmentationInpaint = texture2D(segmentationMapInpaint, flipUV);

                    vec4 inpaintMux = texture2D(mux, flipUV);
                    int planeIdx = inpaintMux.r < 0.5
                        ? int((segmentation.b * 255.0) + 0.5)
                        : int((segmentationInpaint.b * 255.0) + 0.5);
                    int refPlaneIdx = inpaintMux.r < 0.5
                        ? int(PLANE_INDEX)
                        : int(PLANE_INDEX_INPAINT);
                    if (planeIdx != refPlaneIdx + 1) {
                        discard;
                    }
                #endif
            `
        )

        // Apply a customized smoothing equation to MaskedPCSS since it's only used for walls.
        // A small constant factor is applied as a minimun, also the smoothness factor is positively scaled.
        this.fragmentShader = this.fragmentShader.replace(
            `return PCF_Filter( shadowMap, uv, zReceiver, filterRadius * smoothingFactor );`,
            `return PCF_Filter( shadowMap, uv, zReceiver, 0.002 + (abs(filterRadius) * (smoothingFactor * 1.5)) );`
        )

        this.loadAdditionalMaps()
    }

    async loadAdditionalMaps() {
        if (!this.renderer) {
            return
        }
        const segmentationMap = await this.renderer.assetManager.getTextureOrNull(constants.NORMALS_SEGM_ASSET_NAME)
        const segmentationMapInpaint =
            await this.renderer.assetManager.getTextureOrNull(constants.NORM_SEGM_INPAINT_ASSET_NAME)

        if (!this.renderer.getThreeRenderer() || !segmentationMap?.texture) {
            return
        }

        this.refreshResolution()
        this.uniforms.segmentationMap = { value: segmentationMap?.texture }
        this.uniforms.segmentationMapInpaint = { value: segmentationMapInpaint?.texture }
        this.defines.USE_SEGMENTATION = ''
        this.needsUpdate = true
    }

    refreshResolution() {
        const resolution = new THREE.Vector2()
        this.renderer.getThreeRenderer().getSize(resolution)
        this.uniforms.resolution = {
            value: resolution,
        }
    }
}

export default MaskedPCSSShadowMaterial
