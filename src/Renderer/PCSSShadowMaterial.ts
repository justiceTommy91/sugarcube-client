import * as THREE from 'three';
import {
	SENTRY_BREADCRUMB_CATEGORY,
	PCSS_LIGHT_WORLD_SIZE,
	PCSS_DEFAULT_FRUSTUM_WIDTH,
} from 'Renderer/constants';

class PCSSShadowMaterial extends THREE.ShaderMaterial {

    isShadowMaterial: boolean;

    color: THREE.Color;

	static fragmentShaderString = /* glsl */ `
		#ifdef USE_SHADOWMAP
		#define NEAR_PLANE -10.0
		#ifndef NUM_SAMPLES
			#define NUM_SAMPLES 9
		#endif
		#define NUM_RINGS 11
		#define BLOCKER_SEARCH_NUM_SAMPLES NUM_SAMPLES
		vec2 poissonDisk[NUM_SAMPLES];
		uniform float lightSizeUV;
		uniform float blockerSearchRadiusMultiplier;
		uniform float pcfFilterRadiusMultiplier;
		void initPoissonSamples( const in vec2 randomSeed ) {
			// jsfiddle that shows sample pattern: https://jsfiddle.net/a16ff1p7/
			float angle = rand( randomSeed ) * PI2;
			const float RADIUS_STEP = 1.0 / float( NUM_SAMPLES );
			for( int i = 0; i < NUM_SAMPLES; i ++ ) {
				poissonDisk[i] = vec2( cos( angle ), sin( angle ) ) * pow( (float(i) + 1.0) * RADIUS_STEP, 0.75 );
				angle += PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );
			}
		}
		float penumbraSize( const in float zReceiver, const in float zBlocker ) { // Parallel plane estimation
			return (zReceiver - zBlocker) / zBlocker;
		}
		float findBlocker( sampler2D shadowMap, const in vec2 uv, const in float zReceiver ) {
			// This uses similar triangles to compute what
			// area of the shadow map we should search
			float searchRadius = blockerSearchRadiusMultiplier * lightSizeUV * ( zReceiver - NEAR_PLANE ) / zReceiver;
			float blockerDepthSum = 0.0;
			int numBlockers = 0;
			float depth;
			#pragma unroll_loop_start
			for( int i = 0; i < BLOCKER_SEARCH_NUM_SAMPLES; i++ ) {
				depth = unpackRGBAToDepth( texture2D( shadowMap, uv + poissonDisk[ i ] * searchRadius ) );
				if ( depth < zReceiver ) {
					blockerDepthSum += depth;
					numBlockers += 1;
				}
			}
			#pragma unroll_loop_end
			if ( numBlockers == 0 ) return -1.0;
			return blockerDepthSum / float( numBlockers );
		}
		float PCF_Filter( sampler2D shadowMap, vec2 uv, float zReceiver, float filterRadius ) {
			float sum = 0.0;
			float depth;
			#pragma unroll_loop_start
			for( int i = 0; i < NUM_SAMPLES; i ++ ) {
				depth = unpackRGBAToDepth( texture2D( shadowMap, uv + poissonDisk[ i ] * filterRadius ) );
				if ( zReceiver <= depth ) sum += 1.0;
			}
			#pragma unroll_loop_end
			#pragma unroll_loop_start
			for( int i = 0; i < NUM_SAMPLES; i ++ ) {
				depth = unpackRGBAToDepth( texture2D( shadowMap, uv + -poissonDisk[ i ].yx * filterRadius ) );
				if ( zReceiver <= depth ) sum += 1.0;
			}
			#pragma unroll_loop_end
			return sum / float(NUM_SAMPLES);
		}
		float PCSS ( sampler2D shadowMap, vec4 coords ) {
			vec2 uv = coords.xy;
			float zReceiver = coords.z; // Assumed to be eye-space z in this code
			initPoissonSamples( uv );
			// STEP 1: blocker search
			float avgBlockerDepth = findBlocker( shadowMap, uv, zReceiver );
			// There are no occluders so early out (this saves filtering)
			if ( avgBlockerDepth == -1.0 ) return 1.0;
			// STEP 2: penumbra size
			float penumbraRatio = penumbraSize( zReceiver, avgBlockerDepth );
			float filterRadius = penumbraRatio * lightSizeUV * pcfFilterRadiusMultiplier * NEAR_PLANE / zReceiver;
			// STEP 3: filtering
			// return avgBlockerDepth;
			return PCF_Filter( shadowMap, uv, zReceiver, filterRadius );
		}
	`;

    constructor(parameters: THREE.ShaderMaterialParameters = {}) {
        super();

        this.type = `PCSSShadowMaterial`;
        this.transparent = true;
        this.depthTest = true;
        this.depthWrite = false;
        this.color = new THREE.Color(0x000000);
        this.setValues(parameters);

        this.vertexShader = THREE.ShaderLib.shadow.vertexShader;
        this.fragmentShader = /* glsl */ `${THREE.ShaderLib.shadow.fragmentShader}`;

        this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.shadow.uniforms);

        // Replace the shadow map include with localized replica
        this.fragmentShader = this.fragmentShader.replace(
            `#include <shadowmap_pars_fragment>`,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            THREE.ShaderChunk.shadowmap_pars_fragment,
        );

        this.uniforms.lightSizeUV = { value: PCSS_LIGHT_WORLD_SIZE / PCSS_DEFAULT_FRUSTUM_WIDTH };
		this.uniforms.blockerSearchRadiusMultiplier = { value: 4.5 };
		this.uniforms.pcfFilterRadiusMultiplier = { value: 14.0 };

        // https://threejs.org/examples/webgl_shadowmap_pcss.html
        this.fragmentShader = this.fragmentShader.replace(
            `#ifdef USE_SHADOWMAP`,
            PCSSShadowMaterial.fragmentShaderString
        );
        this.fragmentShader = this.fragmentShader.replace(
            `#if defined( SHADOWMAP_TYPE_PCF )`,
            `
            return PCSS( shadowMap, shadowCoord );
            #if defined( SHADOWMAP_TYPE_PCF )
            `
        );

        this.isShadowMaterial = true;
    }

    copy(source: THREE.ShadowMaterial) {
        super.copy(source);
        this.color.copy(source.color);
        return this;
    }

	static testPCSSMaterial(threeRenderer: THREE.WebGLRenderer) : { PCSSMtlResult: boolean, error?: object } {
		if (!threeRenderer) {
			return { PCSSMtlResult: false };
		}
		const context = threeRenderer.getContext();
		if (!context) {
			return { PCSSMtlResult: false };
		}

		const scene = new THREE.Scene();
		const light = new THREE.DirectionalLight();
		const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
		const groundMaterial = new PCSSShadowMaterial();
		const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), groundMaterial);
		light.castShadow = true;
		scene.add(camera, light, ground);

		threeRenderer.clear();
		threeRenderer.render(scene, camera);
		const glError = context.getError();
		groundMaterial.dispose();
		ground.geometry.dispose();
		scene.clear();
  
		light.dispose()

		if (glError !== 0) {
			const error = {
				message: `GL Error in PCSS shader check`,
				breadcrumbs: [
					{
						type: `error`,
						category: SENTRY_BREADCRUMB_CATEGORY,
						data: {
							errorCode: glError,
							where: `PCSS material initialization`,
						}
					},
				]
			}
			return { PCSSMtlResult: false, error }
		}
		return { PCSSMtlResult: true }
	}
}

export default PCSSShadowMaterial;
