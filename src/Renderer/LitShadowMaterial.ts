import * as THREE from 'three'
import { DefaultAssetManager } from './rendering/rendering_utils'
import CustomStandardMaterial from './CustomStandardMaterial'
import { ToneMapType } from './geomviewer/geom_constants'
import { gvRenderLibrary } from './foundation/geom_app'

class LitShadowMaterial extends THREE.ShaderMaterial {

	isMeshStandardMaterial = true as const
	color: THREE.Color
	roughness: number
	metalness: number
	map: THREE.Texture | null
	lightMap: THREE.Texture | null
	lightMapIntensity: number
	aoMap: THREE.Texture | null
	aoMapIntensity: number
	emissive: THREE.Color
	emissiveIntensity: number
	emissiveMap: THREE.Texture | null
	bumpMap: THREE.Texture | null
	bumpScale: number
	normalMap: THREE.Texture | null
	normalMapType: THREE.NormalMapTypes
	normalScale: THREE.Vector2
	displacementMap: THREE.Texture | null
	displacementScale: number
	displacementBias: number
	roughnessMap: THREE.Texture | null
	metalnessMap: THREE.Texture | null
	alphaMap: THREE.Texture | null
	envMap: THREE.Texture | null
	envMapIntensity: number
	wireframeLinecap: string
	wireframeLinejoin: string
	flatShading: boolean
	refractionRatio: number

	constructor(parameters?: THREE.ShaderMaterialParameters) {
		super()

		this.type = `LitShadowMaterial`

		this.defines = { 'STANDARD': '' }
		this.color = new THREE.Color(0xffffff) // diffuse
		this.roughness = 1.0
		this.metalness = 0.0
		this.map = DefaultAssetManager.getWhiteTexture()
		this.lightMap = null
		this.lightMapIntensity = 1.0
		this.aoMap = DefaultAssetManager.getWhiteTexture()
		this.aoMapIntensity = 1.0
		this.emissive = new THREE.Color(0x000000)
		this.emissiveIntensity = 1.0
		this.emissiveMap = null
		this.bumpMap = null
		this.bumpScale = 1
		this.normalMap = DefaultAssetManager.getDefaultNormalMap()
		this.normalMapType = THREE.TangentSpaceNormalMap
		this.normalScale = new THREE.Vector2(1, 1)
		this.displacementMap = null
		this.displacementScale = 1
		this.displacementBias = 0
		this.roughnessMap = DefaultAssetManager.getWhiteTexture()
		this.metalnessMap = DefaultAssetManager.getWhiteTexture()
		this.alphaMap = null
		this.envMap = null
		this.envMapIntensity = 1.0
		this.wireframe = false
		this.wireframeLinewidth = 1
		this.wireframeLinecap = `round`
		this.wireframeLinejoin = `round`
		this.flatShading = false
		this.fog = true
		this.refractionRatio = 0
		this.setValues(parameters || {})

		this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms)
		this.vertexShader = `${THREE.ShaderLib.standard.vertexShader}`
		this.fragmentShader = `${THREE.ShaderLib.standard.fragmentShader}`

		this.applyToneMapping()
		this.applyShadowOverlayPatch()
		this.applyMaskFilterPatch()

		this.isMeshStandardMaterial = true
	}

	public setToneMapType(tonemapType: ToneMapType | undefined ) {
		if (tonemapType)
			this.uniforms.toneMapType.value = Object.values(ToneMapType).indexOf(tonemapType);
		else 
			this.uniforms.toneMapType.value = Object.values(ToneMapType).indexOf(ToneMapType.BlenderFilmic);
	}

	public setOutputSRGB(srgb: boolean) {
		this.uniforms.outputSRGB.value = srgb ? 1 : 0
	}

	public setFilteringTexture(texture: THREE.Texture | null, idx: number) {
		this.uniforms.useMaskFilter.value = !!texture
		this.uniforms.segmentationMap.value = texture
		this.uniforms.filteredIdx.value = texture ? idx : -1
	}

	// Apply a custom LUT pass patch into this instance's vertex and fragment shaders.
	private applyToneMapping() {
		this.uniforms.toneMapType = { value: 0 }
		this.uniforms.outputSRGB = { value: 1 }
		this.vertexShader = this.vertexShader.replace(
			`varying vec3 vViewPosition;`, `varying vec3 vViewPosition;
			varying float fovx;`
		).replace(
			`#include <project_vertex>`, `#include <project_vertex>
			float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
			float fovy = 2.0*atan( 1.0/projectionMatrix[1][1] );
			fovx = fovy * aspect;`
		)
		this.fragmentShader = CustomStandardMaterial.injectToneMapping(this.fragmentShader)
	}

	// Apply shadow material's patch to this instance's fragment shader.
	private applyShadowOverlayPatch() {
		this.fragmentShader = this.fragmentShader
		.replace(
			`#include <logdepthbuf_pars_fragment>`,
			`#include <logdepthbuf_pars_fragment>
			#include <shadowmask_pars_fragment>`
		).replace(
			`#include <dithering_fragment>`,
			`#include <dithering_fragment>
			// Brighten the actual shadows a little bit to accomodate for in-image real shadows.
			float biasShaded = 0.1;
			// Overblow the un-shaded areas to avoid unintended darkening in lit areas.
			float biasLit = 0.4;
			// Bias the shadow mask using an exponential curve from shadow to light to avoid hard edges.
			float mask = getShadowMask();
			float bias = 0.3022339 * pow(mask, 7.241636) + 0.1;
			vec3 biasedFragCol = gl_FragColor.rgb + vec3(bias);
			// Avoid overexposed fragments since shadow mask is used with multiply color blending equation.
			gl_FragColor.rgb = min(biasedFragCol, vec3(1.0));
			`
		)
	}

	// Apply a mask filter patch, to stencil this instance according
	// to the passed texture and selected mask id.
	private applyMaskFilterPatch() {
		this.uniforms.useMaskFilter = { value: false }
		this.uniforms.segmentationMap = { value: null }
		this.uniforms.filteredIdx = { value: -1 }

		const pixelRatio = gvRenderLibrary()?.renderer?.getPixelRatio() || 1
		const resolution = new THREE.Vector2()
		gvRenderLibrary()?.renderer?.getSize(resolution).multiplyScalar(pixelRatio)
		this.uniforms.resolution = { value : resolution }

        this.fragmentShader = this.fragmentShader.replace(
            `void main() {`,
            `
			uniform bool useMaskFilter;
            uniform sampler2D segmentationMap;
			uniform int filteredIdx; 

            uniform vec2 resolution;

			void main() {
				if (useMaskFilter) {
					vec2 uv = (gl_FragCoord.xy - 0.5) / resolution.xy;
                    vec2 flipUV = vec2(uv.x, 1.0 - uv.y);

                    vec4 segmentation = texture2D(segmentationMap, flipUV);
					int fragmentIdx = int((segmentation.r * 255.0) + 0.5);

                    if (fragmentIdx != filteredIdx) {
                        discard;
                    }
				}
            `
        )
	}
}

export default LitShadowMaterial
