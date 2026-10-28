import * as THREE from 'three'
import { gvCurrentScene, gvCurrentSettings, gvStartupWarden } from './foundation/geom_app'
import { defaultViewerDebugSettings } from './geomviewer/geom_viewer_settings'
import PCSSShadowMaterial from './PCSSShadowMaterial'
import { defaultViewerSettings } from './ui/settings'
import { DefaultAssetManager } from './rendering/rendering_utils'
import { ToneMapType } from './geomviewer/geom_constants'
import { ENVIRONMENT_MAP_READY } from './StartupWarden'

class CustomStandardMaterial extends THREE.ShaderMaterial {

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
	vignetteAO: boolean
	disableDirectSpecular: boolean
	reduceLightingEffects: boolean
	useSofterShadows: boolean

	constructor(parameters?: THREE.ShaderMaterialParameters & {
		color?: THREE.ColorRepresentation
		emissive?: THREE.ColorRepresentation
		vignetteAO?: boolean
		disableDirectSpecular?: boolean
		reduceLightingEffects?: boolean
		useSofterShadows?: boolean
	}) {
		super()

		this.type = `CustomStandardMaterial`

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
		this.vignetteAO = false
		this.disableDirectSpecular = false
		this.reduceLightingEffects = false
		this.useSofterShadows = false
		this.setValues(parameters || {})

		this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms)
		this.vertexShader = `${THREE.ShaderLib.standard.vertexShader}`
		this.fragmentShader = `${THREE.ShaderLib.standard.fragmentShader}`

		this.applyToneMapping()
		this.applyScreenDoorTransparencyPass()
		this.applyParallaxBoxMappingPass()
		this.applyEnvMapRotationPass()
		this.applyVignetteAOPass()
		this.applyDirectSpecularPass()
		this.applySpecularAlpha()
		this.applyPCSSShadowPass()
		this.applyLightCookiePass()
		this.applyRoomLightIntensityPass()

		this.isMeshStandardMaterial = true
	}

	copy(source: THREE.MeshStandardMaterial | CustomStandardMaterial) {
		// MOIZ: The MeshStandardMaterial doesnt have the unifromsGroups, which was introduced in r143 in ShaderMaterial.js
		// We're using this as a temporary solution to be able to add the property in 
		// manually until they add it to the MeshStandardMaterial.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(source as any).uniformsGroups = []
		const vertexShaderBackup = this.vertexShader
		const fragmentShaderBackup = this.fragmentShader
		const uniformsBackup = this.uniforms
		const definesBackup = this.defines

		super.copy(source)
		this.vertexShader = vertexShaderBackup
		this.fragmentShader = fragmentShaderBackup
		this.uniforms = uniformsBackup
		this.defines = definesBackup
		this.color.copy(source.color)
		this.roughness = source.roughness
		this.metalness = source.metalness
		this.map = source.map ? source.map : DefaultAssetManager.getWhiteTexture()
		this.lightMap = source.lightMap
		this.lightMapIntensity = source.lightMapIntensity
		this.aoMap = source.aoMap ? source.aoMap : DefaultAssetManager.getWhiteTexture()
		this.aoMapIntensity = source.aoMapIntensity
		this.emissive.copy(source.emissive)
		this.emissiveMap = source.emissiveMap
		this.emissiveIntensity = source.emissiveIntensity
		this.bumpMap = source.bumpMap
		this.bumpScale = source.bumpScale
		if (source.normalMap) {
			this.normalMap = source.normalMap
			this.normalMapType = source.normalMapType
			this.normalScale.copy(source.normalScale)
		} else {
			this.normalMap = DefaultAssetManager.getDefaultNormalMap()
			this.normalMapType = THREE.TangentSpaceNormalMap
			this.normalScale = new THREE.Vector2(1, 1);
		}
		this.displacementMap = source.displacementMap
		this.displacementScale = source.displacementScale
		this.displacementBias = source.displacementBias
		this.roughnessMap = source.roughnessMap ? source.roughnessMap : DefaultAssetManager.getWhiteTexture()
		this.metalnessMap = source.metalnessMap ? source.metalnessMap : DefaultAssetManager.getWhiteTexture()
		this.alphaMap = source.alphaMap
		this.envMap = source.envMap
		this.envMapIntensity = source.envMapIntensity
		this.wireframe = source.wireframe
		this.wireframeLinewidth = source.wireframeLinewidth
		this.wireframeLinecap = source.wireframeLinecap
		this.wireframeLinejoin = source.wireframeLinejoin
		this.flatShading = source.flatShading
		this.fog = source.fog
		if (source instanceof CustomStandardMaterial) {
			this.vignetteAO = source.vignetteAO
			this.disableDirectSpecular = source.disableDirectSpecular
			this.reduceLightingEffects = source.reduceLightingEffects
			this.uniforms = source.uniforms
		}
		return this
	}

	// Apply specular luminance to the final alpha value
	// This is needed for specular reflections on transparent glass surfaces
	private applySpecularAlpha() {
		this.fragmentShader = this.fragmentShader.replace(
			`#include <opaque_fragment>`,
			`#include <opaque_fragment>
			 #ifndef OPAQUE
			 	vec3 RGB_To_Luminance = vec3(0.2126, 0.7152, 0.0722);
			 	float specularLuminance = saturate(dot(totalSpecular, RGB_To_Luminance));
			 	gl_FragColor.a = saturate(diffuseColor.a + specularLuminance);
			 #endif`
		)
	}

	public static injectToneMapping(input: string) {
		return input.replace(
			`uniform float opacity;`, /* glsl */ `
			uniform float opacity;
			uniform int toneMapType;
			uniform int outputSRGB;

			// General tone mapping curve function used to fit the 1d LUT.
			// This function is a standard function designed for fitting 
			// a tonemapping LUT because it allows flexible shaping with 
			// shoulder and toe behavior.  
			highp vec3 toneMapCurve(
				highp vec3 x, highp float a, highp float b, highp float c, highp float d, highp float e, highp float f) {
				return (x * (a * (x * x) + b * x + c)) / (d * (x * x) + e * x + f + 1e-6);
			}

			// Converts from linear space to logarithmic space with the same dynamic 
			// range as defined by the Blender configuration.
			highp vec3 linToLog(highp vec3 lin) {
				// From Blender OCIO config
				highp float logmin = 12.473931188;
				highp float logmax = 12.526068812;
				return (log2(lin) + logmin) / (logmax + logmin);
			}

			// The parameters of this curve are obtained by feeding the values in 
			// filmic_to_0-70_1-03.spi1d to SciPy's curve_fit function together 
			// with the toneMapCurve() base function above. The resulting function 
			// matches the sampled values in filmic_to_0-70_1-03.spi1d. 
			// Note that this curve outputs a color in sRGB, so no gamma correction is required.
			highp vec3 applyFilmicCurve70(highp vec3 color, float exposure) {
				color *= exposure;
				highp vec3 mapped =
					toneMapCurve(
						color, 
						6.23717931e+01, -7.44229138e-02,  9.50394205e+00,  2.57406294e+02, -3.30888400e+02,  1.45257893e+02);
				return mapped;
			}

			// Approximation of filmic_desat65cube.spi3d, which aims to smoothly desaturate highlights as analog film would. 
			// The smoothing saturation factor is based on the luminance of the input color. 
			// Using a smoothstep to give a smoother desaturation difference. 
			// Desaturation is applied to the range from 0.9 to 1.0 luminance. 
			vec3 desat(vec3 color) {
				float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
				float factor = clamp(smoothstep(0.9, 1.0, luma), 0.0, 1.0);
				return mix(color, vec3(luma), factor);
			}

			// Applies Khronos PBR neutral tone mapping
			// Note that this function outputs a linear color.
			vec3 applyPbrNeutral(vec3 colorIn, float exposureScale) {
				const float startCompression = 0.8 - 0.04;
				const float desaturation = 0.15;

				vec3 color = colorIn * exposureScale;

				float x = min(color.r, min(color.g, color.b));
				float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
				color -= offset;

				float peak = max(color.r, max(color.g, color.b));
				if (peak < startCompression) return color;

				const float d = 1. - startCompression;
				float newPeak = 1. - d * d / (peak + d - startCompression);
				color *= newPeak / peak;

				float g = 1. - 1. / (desaturation * (peak - newPeak) + 1.);
				return mix(color, vec3(newPeak), g);
			}

			vec3 applyBlenderFilm(vec3 x, float exposure) {
				vec3 result = linToLog(x * exposure);
			 	result = clamp(result / 0.66, 0.0, 1.0);
			 	result = desat(result);
			 	result = applyFilmicCurve70(result,  1.0);
				return result;
			}

			// Applies an approximation of ACES filmic tone mapping.
			// See https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/.
			// Note that this function outputs a linear color.
			vec3 applyACESFilm(vec3 x, float exposure)
			{
				x *= exposure;
				const float a = 2.51;
				const float b = 0.03;
				const float c = 2.43;
				const float d = 0.59;
				const float e = 0.14;
				return (x*(a*x+b))/(x*(c*x+d)+e);
			}

			vec3 linearToSRGB(vec3 linearRGB) {
				vec3 srgbLo = linearRGB * 12.92;
				vec3 srgbHi = 1.055 * pow(linearRGB, vec3(1.0/2.4)) - 0.055;
				return clamp(mix(srgbLo, srgbHi, step(0.0031308, linearRGB)), 0.0, 1.0);
			}

			vec3 sRGBToLinear(vec3 srgb) {
				vec3 linearLo = srgb / 12.92;
				vec3 linearHi = pow((srgb + 0.055) / 1.055, vec3(2.4));
				return clamp(mix(linearLo, linearHi, step(0.04045, srgb)), 0.0, 1.0);
			}
			`
		).replace(
			`#include <tonemapping_fragment>`,
			/* glsl */`
			// _PATCHED_ <tonemapping_fragment>
			// Custom LUT was generated by a custom colorspace 'SugarCube sRGB' combining
			// both 'Desat_65', 'Filmic_basic' LUTs and their uniform allocation settings (0.66 factor)
			// .ocio
			// 	from_reference: !<GroupTransform>
			//		children:
			// 			- !<FileTransform {src: filmic_desat65cube.spi3d, interpolation: best}
			//			- !<AllocationTransform> {allocation: uniform, vars: [0, 0.66]}
			//			- !<FileTransform> {src: filmic_to_0-70_1-03.spi1d, interpolation: linear}
			// then baked it using 
			// $ ociobakelut --inputspace 'Linear' --outputspace 'SugarCube sRGB' --format iridas_cube --cubesize 16
			//
			// The input of this baked lut has been converted to a set of functions based on the above mentioned transforms 
			// used for baking the LUT:
			// - Convert linear to logarithmic space
			// - Desaturate highlights to approximate analog film response to highlights (filmic_desat65cube.spi3d)
			// - Scale using rgb *  1 / 0.66 to determine dynamic range
			// - The filmic curve function used here closely matches the filmic_to_0-70_1-03.spi1d lut.
			// Note that the filmic curve includes display gamma correction. 

			#if defined(TONE_MAPPING)
			if (toneMapType == 0) {
			 	gl_FragColor.rgb = applyBlenderFilm(gl_FragColor.rgb, toneMappingExposure);
				// Because the blender filmic curve outputs sRGB, convert to linear
				if (outputSRGB == 0) {
					gl_FragColor.rgb = sRGBToLinear(gl_FragColor.rgb);
				}
			} else if (toneMapType == 1) {
				gl_FragColor.rgb = clamp(applyPbrNeutral(gl_FragColor.rgb, toneMappingExposure), 0.0, 1.0);
			} else if (toneMapType == 2) {
				gl_FragColor.rgb = clamp(applyACESFilm(gl_FragColor.rgb, toneMappingExposure), 0.0, 1.0);
			} else { // If there is no match, disable tone mapping, still apply exposure
				gl_FragColor.rgb = gl_FragColor.rgb * toneMappingExposure;
			}

			if (toneMapType != 0 && outputSRGB > 0) {
				gl_FragColor.rgb = linearToSRGB(gl_FragColor.rgb);
			}
			#endif
			`
		)
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

	// Apply our custom tone mapping into this instance's vertex and fragment shaders.
	private applyToneMapping() {
		this.uniforms.toneMapType = { value: 0 }
		this.uniforms.outputSRGB = { value: 1 }

		const toneMapType = gvCurrentSettings()?.debugSettings?.toneMapCurve
		this.setToneMapType(toneMapType)

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

	// Apply a screendoor transparency patch to this instance's fragment shader.
	private applyScreenDoorTransparencyPass() {
		this.fragmentShader = this.fragmentShader.replace(
			`varying vec3 vViewPosition;`, `varying vec3 vViewPosition;
			varying float fovx;
			varying vec3 vWorldPos;
			uniform bool enableXRay;
			uniform float ditheredOpacity;

			// from: https://www.shadertoy.com/view/ltsyWl
			float bayer2  (vec2 a){a=floor(a);return fract(dot(a,vec2(.5, a.y*.75)));}
			float bayer4  (vec2 a){return bayer2 (  .5*a)*.25    +bayer2(a);}
			float bayer8  (vec2 a){return bayer4 (  .5*a)*.25    +bayer2(a);}`
		).replace(
			`#include <opaque_fragment>`, `#include <opaque_fragment>
			float byr = min(1.0, bayer8(vec2(gl_FragCoord)));
			if (ditheredOpacity < 1.0 && ditheredOpacity < byr) {
				discard;
			}
			float t = 3.4 / fovx; // magic threshold dist that gives good results.
			float s = 0.05; // smoothing factor.
			float al = max(0.25, smoothstep(t*(1.0-s), t, vViewPosition.z));
			if (enableXRay &&  al < byr){
				discard;
			}`
		)

		this.uniforms.enableXRay = { value: false }
		this.uniforms.ditheredOpacity = { value: 1.0 }
	}

	// Apply a vignette filter over the material surface simulating a simple AO pass.
	private applyVignetteAOPass() {		
		// Note that we always have vAOCoords attribute present in the vertex shader - even when
		// it is not set for the input geometry. In this case webgl uses default (zeroed) value
		// for vAOCoords and it is hidded by vVignetteAOEnabled in the fragment shader.
		this.vertexShader = this.vertexShader.replace(
			`#include <clipping_planes_pars_vertex>`,
			`#include <clipping_planes_pars_vertex>
				attribute vec2 vAOCoords;
				varying vec2 vAOuv;`
		).replace(
			`#include <uv_vertex>`,
			`#include <uv_vertex>
				vAOuv = vAOCoords;`
		)
		this.fragmentShader = this.fragmentShader.replace(
			`#include <clipping_planes_pars_fragment>`,
			`
			#include <clipping_planes_pars_fragment>

			varying vec2 vAOuv;
			uniform bool vVignetteAOEnabled;
			uniform float vAOintensity;
			uniform float vAOdarkest;
			uniform float vAOreach;
			uniform float vAOleft;
			uniform float vAOright;
			uniform bool vAOdirectDiffuse;
			uniform bool vAOindirectDiffuse;
			uniform bool vAOdirectSpecular;
			uniform bool vAOindirectSpecular;`
		).replace(
			`#include <aomap_fragment>`,
			`#include <aomap_fragment>

			if (vVignetteAOEnabled) {

				// Applying a vignette effect for 3d room geometries (floor, walls, ceiling).
				vec2 uvVignette = vAOuv;
				uvVignette *=  1.0 - uvVignette.yx;
				float vig = uvVignette.x * uvVignette.y * vAOintensity; // multiply with sth for intensity
				vig += vAOdarkest; // change min value to modify darkest area intensity
				vig = pow(vig, vAOreach); // change pow for modifying the extend of the  vignette
				float interpAngle = mix(vAOleft, vAOright, vAOuv.x);
				float clampedAngle = max(0.0, min(interpAngle, 180.0)); // Clamp to 0..180 deg.
				// spatialInensity changes from 0 to 2 as angle changes from 180 to 0.
				float spatialInensity = 2.0 * (1.0 - clampedAngle / 180.0);

				reflectedLight.directDiffuse = mix(reflectedLight.directDiffuse,
					reflectedLight.directDiffuse * pow(vig, spatialInensity), float(vAOdirectDiffuse));
				reflectedLight.indirectDiffuse = mix(reflectedLight.indirectDiffuse,
					reflectedLight.indirectDiffuse * pow(vig, spatialInensity), float(vAOindirectDiffuse));
				reflectedLight.directSpecular = mix(reflectedLight.directSpecular,
					reflectedLight.directSpecular * pow(vig, spatialInensity), float(vAOdirectSpecular));
				reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular,
					reflectedLight.indirectSpecular * pow(vig, spatialInensity), float(vAOindirectSpecular));

			}`
		)

		const debugSettings = gvCurrentSettings()?.debugSettings || defaultViewerDebugSettings
		this.uniforms.vVignetteAOEnabled = { value: this.vignetteAO }
		this.uniforms.vAOintensity = { value: debugSettings?.vAOlightIntensity }
		this.uniforms.vAOdarkest = { value: debugSettings?.vAOdarkIntesity }
		this.uniforms.vAOreach = { value: debugSettings?.vAOcontrast }
		this.uniforms.vAOdirectDiffuse = { value: debugSettings?.vAOdirectDiffuse }
		this.uniforms.vAOindirectDiffuse = { value: debugSettings?.vAOindirectDiffuse }
		this.uniforms.vAOdirectSpecular = { value: debugSettings?.vAOdirectSpecular }
		this.uniforms.vAOindirectSpecular = { value: debugSettings?.vAOindirectSpecular }
		this.uniforms.vAOleft = { value: 90.0 }
		this.uniforms.vAOright = { value: 90.0 }
	}

	// Apply a parallax box mapping patch to this instance's vertex and fragment shaders.
	private applyParallaxBoxMappingPass() {
		const disableParallaxMapping = gvCurrentSettings()?.debugSettings?.disableParallaxMapping
		const saturationDampIntensity = gvCurrentSettings()?.debugSettings?.saturationDampIntensity || 0.0
		const sceneCenter = gvCurrentScene()?.getSceneCenter()
		const sceneSize = gvCurrentScene()?.getSceneSize()
		if (!sceneCenter || !sceneSize) {
			return
		}

		this.vertexShader = this.vertexShader.replace(
			`#include <worldpos_vertex>`,
			`// _PATCHED_ <worldpos_vertex>\n${THREE.ShaderChunk.worldpos_vertex}`
		).replace(
			`defined ( USE_TRANSMISSION )`,
            `defined ( USE_TRANSMISSION ) || ( BOX_PROJECTED_ENV_MAP == 1 )`
		).replace(
			`#ifdef USE_TRANSMISSION`,
			`#define BOX_PROJECTED_ENV_MAP ${disableParallaxMapping ? 0 : 1}
			#if defined( USE_TRANSMISSION ) || ( BOX_PROJECTED_ENV_MAP == 1 )`
		).replace(
			`#ifdef USE_TRANSMISSION`,
			`#if defined( USE_TRANSMISSION ) || ( BOX_PROJECTED_ENV_MAP == 1 )`
		)
		this.fragmentShader = this.fragmentShader
		.replace(
			`#include <envmap_physical_pars_fragment>`,
			`// _PATCHED_ <envmap_physical_pars_fragment>\n${THREE.ShaderChunk.envmap_physical_pars_fragment}`
		)
		.replace(
			`vec3 getIBLIrradiance( const in vec3 normal ) {`,
			/* glsl */ `
			#define BOX_PROJECTED_ENV_MAP ${disableParallaxMapping ? 0 : 1}

			uniform vec3 fixedEnvMapColor;
			uniform int useFixedEnvMapColor;

			#if ( BOX_PROJECTED_ENV_MAP == 1 )
				uniform vec3 cubeMapSize;
				uniform vec3 cubeMapPos;
				#ifndef vWorldPosition
					#define v_WORLD_POS 1
					varying vec3 vWorldPosition;
				#endif
				uniform float satMin;
				vec3 parallaxCorrectNormal( vec3 v, vec3 cubeSize, vec3 cubePos ) {
					vec3 nDir = normalize( v );
					vec3 rbmax = ( .5 * cubeSize + cubePos - vWorldPosition ) / nDir;
					vec3 rbmin = ( -.5 * cubeSize + cubePos - vWorldPosition ) / nDir;
					vec3 rbminmax = max(rbmax, rbmin);
					float closestDistance = min( min( rbminmax.x, rbminmax.y ), rbminmax.z );
					vec3 boxIntersection = vWorldPosition + nDir * closestDistance;
					return boxIntersection - cubePos;
				}
				vec3 dampIrradiance( vec3 irradiance, vec3 normal, vec3 cubeSize, vec3 cubePos ) {
					vec3 halfS = 0.5 * cubeSize;
					vec3 nDir = normalize( normal );

					vec3 rbmax = (  halfS + cubePos - vWorldPosition ) / nDir;
					vec3 rbmin = ( -halfS + cubePos - vWorldPosition ) / nDir;
					vec3 rbminmax = max( rbmax, rbmin );
					float dist = max( 0.0, min( min( rbminmax.x, rbminmax.y ), rbminmax.z ) );

					vec3 tCenter3 = halfS / max( abs(nDir), vec3(1e-6) );
					float dMax = min( min( tCenter3.x, tCenter3.y ), tCenter3.z );
					
					float sat = mix( 1.0, satMin, smoothstep( 0.0, dMax, dist ) );

					float Y = dot(irradiance, vec3(0.2126, 0.7152, 0.0722));
					return mix(vec3(Y), irradiance, sat);
				}
			#endif
			vec3 getIBLIrradiance( const in vec3 normal ) {`,
		)
		.replace(
			`vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );`,
			/* glsl */ `
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			#if ( BOX_PROJECTED_ENV_MAP == 1 )
			envMapColor = vec4(dampIrradiance( envMapColor.rgb, worldNormal, cubeMapSize, cubeMapPos), envMapColor.a );
			#endif
			if (useFixedEnvMapColor != 0) {
				envMapColor = vec4(fixedEnvMapColor, 1.0);
			}
			`,
		)
		// Parallax correction is only applied to radiance component, see radiance vs. irradiance docs.
		.replace(
			`reflectVec = inverseTransformDirection( reflectVec, viewMatrix );`,
			`reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			#if ( BOX_PROJECTED_ENV_MAP == 1 )
			reflectVec = parallaxCorrectNormal( reflectVec, cubeMapSize, cubeMapPos );
			#endif`,
		)

		this.uniforms.cubeMapSize = { value: sceneSize }
		this.uniforms.cubeMapPos = { value: sceneCenter }
		this.uniforms.satMin = { value: 1.0 - saturationDampIntensity }
		this.uniforms.useFixedEnvMapColor = { value: 0 }
		this.uniforms.fixedEnvMapColor = { value: new THREE.Color(3.0, 3.0, 3.0) }
	}

	// Apply direct specular patch into this instance's fragment shader.
	private applyDirectSpecularPass() {
		this.fragmentShader = this.fragmentShader.replace(
			`#define STANDARD`,
			`#define STANDARD
			 uniform bool disableDirectSpecular;`
		)

		this.fragmentShader = this.fragmentShader.replace(
			`vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;`,
			`vec3 totalSpecular = reflectedLight.indirectSpecular;
			 if ( !disableDirectSpecular ) {
				totalSpecular += reflectedLight.directSpecular;
			 }`
		)

		this.uniforms.disableDirectSpecular = { value: this.disableDirectSpecular }
	}	

	// Apply envMap rotation pass patch into this instance's fragment shader.
	private applyEnvMapRotationPass() {
		this.fragmentShader = this.fragmentShader
		.replace(
			`#include <envmap_physical_pars_fragment>`,
			`// _PATCHED_ <envmap_physical_pars_fragment>\n${THREE.ShaderChunk.envmap_physical_pars_fragment}`
		)
		.replace(
			`vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );`,
			`\tvec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );\n`,
		).replace(
			`vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );`,
			`\tvec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );\n`,
		)

		const rotation = gvCurrentSettings()?.debugSettings?.environmentRotation || 0
		const rotationInRadian = rotation * Math.PI / 180
		const mat4 = new THREE.Matrix4().makeRotationY(rotationInRadian)
		const mat3 = new THREE.Matrix3().setFromMatrix4(mat4).transpose()
		this.uniforms.envMapRotation = { value: mat3 }
	}

	// Apply PCSS shadow pass patch into this instance's fragment shader.
	private applyPCSSShadowPass() {
		// Replace the shadow map include with localized replica
		this.fragmentShader = this.fragmentShader.replace(
			`#include <shadowmap_pars_fragment>`,
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			THREE.ShaderChunk.shadowmap_pars_fragment,
		);
		// https://threejs.org/examples/webgl_shadowmap_pcss.html
		this.fragmentShader = this.fragmentShader.replace(
			`#ifdef USE_SHADOWMAP`,
			PCSSShadowMaterial.fragmentShaderString
		);
		this.fragmentShader = this.fragmentShader.replace(
			`#if defined( SHADOWMAP_TYPE_PCF )`,
			`
			#if defined ( SHADOWMAP_TYPE_PCSS )
			return PCSS( shadowMap, shadowCoord );
			#endif
			
			#if defined( SHADOWMAP_TYPE_PCF )
			`
		);
		this.uniforms.lightSizeUV = { value: 0.0005 };
		this.uniforms.blockerSearchRadiusMultiplier = { value: 4.5 };
		this.uniforms.pcfFilterRadiusMultiplier = { value: 14.0 };

		// Initialize the shadow behavior to the correct state based on scene settings.
		const debugSettings = gvCurrentSettings()?.debugSettings || defaultViewerDebugSettings
		const viewerSettings = gvCurrentSettings()?.viewerSettings || defaultViewerSettings
		if (viewerSettings.isRoomBuilderScene || this.useSofterShadows) {
			this.defines.NUM_SAMPLES = debugSettings.poissonKernelSize
			this.uniforms.blockerSearchRadiusMultiplier.value = debugSettings.blockerSearchRadiusMultiplier
			this.uniforms.pcfFilterRadiusMultiplier.value = debugSettings.pcfFilterRadiusMultiplier		
		}
		if ((debugSettings.keepLocallyGeneratedLights && viewerSettings.isRoomBuilderScene)
			|| this.useSofterShadows) {
			this.defines.SHADOWMAP_TYPE_PCSS = ''
		}
	}

	public applyLightCookiePass() {
		const viewerSettings = gvCurrentSettings()?.viewerSettings || defaultViewerSettings
		if (!viewerSettings.isRoomBuilderScene) {
			return
		}

		this.vertexShader = this.vertexShader
		.replace(
			`#define STANDARD`,
			`#define STANDARD
			#define USE_LIGHTCOOKIE
			`,
		)
		.replace(
			`defined ( USE_TRANSMISSION )`,
			`defined ( USE_TRANSMISSION ) || defined ( USE_LIGHTCOOKIE )`
		)
		if(this.vertexShader.includes(`#ifdef USE_TRANSMISSION`)) {
			this.vertexShader = this.vertexShader
			.replace(
				`#ifdef USE_TRANSMISSION`,
				`#if defined( USE_TRANSMISSION ) || defined( USE_LIGHTCOOKIE )`
			).replace(
				`#ifdef USE_TRANSMISSION`,
				`#if defined( USE_TRANSMISSION ) || defined( USE_LIGHTCOOKIE )`
			)
		} else {
			this.vertexShader = this.vertexShader
			.replace(
				`#if defined( USE_TRANSMISSION )`,
				`#if defined( USE_TRANSMISSION ) || defined( USE_LIGHTCOOKIE )`
			).replace(
				`#if defined( USE_TRANSMISSION )`,
				`#if defined( USE_TRANSMISSION ) || defined( USE_LIGHTCOOKIE )`
			)
		}

		this.fragmentShader = this.fragmentShader
		.replace(
			`#include <lights_pars_begin>`,
			THREE.ShaderChunk.lights_pars_begin,
		)
		.replace(
			`#if NUM_DIR_LIGHTS > 0`,
			`#if NUM_DIR_LIGHTS > 0
			uniform mat4 uLightMatrix;
			uniform bool uCookieEnabled;
			uniform sampler2D uCookieTex;
			#ifndef v_WORLD_POS
			varying vec3 vWorldPosition;
			#endif
			`
		)
		.replace(
			`#include <lights_fragment_begin>`,
			THREE.ShaderChunk.lights_fragment_begin,
		)
		.replace(
			`#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )`,
			`
			if (uCookieEnabled) {
				vec4 localToLightProjectedPos = uLightMatrix * vec4( vWorldPosition, 1.0 );
				vec2 lightUV = localToLightProjectedPos.xy;
				float cookie = texture2D( uCookieTex, clamp(lightUV, 0.0, 1.0) ).r;
				directLight.color *= vec3(cookie);
				directLight.visible = directLight.visible && cookie > 0.01;
			}
			#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )`
		)

		// Set the material uniforms to disable the cookie behavior until the custom
		// generated lights are initialized.
		this.uniforms.uCookieEnabled = { value: false }
		this.uniforms.uLightMatrix = { value: new THREE.Matrix4() }

		// Wait till the mesh scene's custom lights are generated before updating material uniforms.
		gvStartupWarden()?.registerCallback(ENVIRONMENT_MAP_READY, () => {
			const directionalLightCookie = gvCurrentScene()?.getDirectionalLightCookie()
			const lightProjectionMatrix = directionalLightCookie?.getLightMatrix()
			const cookieMap = directionalLightCookie?.getLightCookieMap()
			if (!directionalLightCookie || !cookieMap || !lightProjectionMatrix) {
				return
			}

			this.uniforms.uCookieEnabled = { value: true }
			this.uniforms.uLightMatrix = { value: lightProjectionMatrix }
			this.uniforms.uCookieTex = { value: cookieMap }
		})
	}

	public applyRoomLightIntensityPass() {
		const viewerSettings = gvCurrentSettings()?.viewerSettings || defaultViewerSettings
		if (!viewerSettings.is3dMeshScene && !this.reduceLightingEffects) {
			return
		}

		this.fragmentShader = this.fragmentShader
		.replace(
			`#include <lights_pars_begin>`,
			THREE.ShaderChunk.lights_pars_begin,
		)
		.replace(
			`#define STANDARD`,
			`#define STANDARD
			uniform float ceilingPointLightMultiplier;
			uniform float ceilingSkyLightMultiplier;`
		)
		.replace(
			`light.color = pointLight.color;`,
			`light.color = pointLight.color;
			light.color *= ceilingPointLightMultiplier;`
		)
		.replace(
			`vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );`,
			`vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
			irradiance *= ceilingSkyLightMultiplier;`
		)

		this.uniforms.ceilingPointLightMultiplier = { value: 1.0 }
		this.uniforms.ceilingSkyLightMultiplier = { value: 0.25 }
	}

	public updatePoissonKernelSize(poissonKernelSize: number) {
		this.defines.NUM_SAMPLES = poissonKernelSize
		this.needsUpdate = true
	}

	public switchParallaxMapping(disableParallaxMapping: boolean) {
		this.vertexShader = this.vertexShader.replace(
			`#define BOX_PROJECTED_ENV_MAP ${disableParallaxMapping ? 1 : 0}`,
			`#define BOX_PROJECTED_ENV_MAP ${disableParallaxMapping ? 0 : 1}`
		)
		this.fragmentShader = this.fragmentShader.replace(
			`#define BOX_PROJECTED_ENV_MAP ${disableParallaxMapping ? 1 : 0}`,
			`#define BOX_PROJECTED_ENV_MAP ${disableParallaxMapping ? 0 : 1}`
		)
		this.needsUpdate = true
	}

	public switchDirectSpecular(disableDirectSpecular: boolean) {
		this.uniforms.disableDirectSpecular = { value: disableDirectSpecular }
	}

	/**
	 * Applies a generic, subtle sheen to material to be used for fabric/textile
	 * items. Sheen should ideally be set in the model's material definition but since
	 * these channels are not used by any asset at the moment, this will be used to 
	 * experiment and add a subtle effect to some select items. Values chosen empirically.
	 */
	public applySheen() {
		this.uniforms.sheenColor = { value: new THREE.Color(0.15, 0.15, 0.15) }
		this.uniforms.sheenRoughness = { value: 0.3 }
		this.defines.USE_SHEEN = ``
	}
}

export default CustomStandardMaterial
