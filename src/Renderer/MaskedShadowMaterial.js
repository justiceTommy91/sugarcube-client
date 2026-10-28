import * as THREE from 'three'
import * as constants from 'Renderer/constants'

class MaskedShadowMaterial extends THREE.ShaderMaterial {
    constructor(renderer, index, inpaintIndex, parameters) {
        super()

        this.renderer = renderer

        this.type = 'MaskedShadowMaterial'

        this.color = new THREE.Color(0x000000)
        this.transparent = true
        this.depthTest = true
        this.depthWrite = false

        this.setValues(parameters)

        this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.shadow.uniforms)
        this.uniforms.mux = { value: null }
        this.defines.PLANE_INDEX = index
        this.defines.PLANE_INDEX_INPAINT = inpaintIndex

        this.vertexShader = /* glsl */ `${THREE.ShaderLib.shadow.vertexShader}`
        this.fragmentShader = /* glsl */ `${THREE.ShaderLib.shadow.fragmentShader}`.replace(
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
            `,
        )
        this.isShadowMaterial = true

        this.loadAdditionalMaps()
    }

    async loadAdditionalMaps() {
        if (!this.renderer) {
            return
        }
        const segmentationMap = await this.renderer.assetManager.getTextureOrNull(constants.NORMALS_SEGM_ASSET_NAME)
        const segmentationMapInpaint = await this.renderer.assetManager.getTextureOrNull(
            constants.NORM_SEGM_INPAINT_ASSET_NAME,
        )

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

    copy(source) {
        super.copy(source)
        this.color.copy(source.color)
        return this
    }
}

export default MaskedShadowMaterial
