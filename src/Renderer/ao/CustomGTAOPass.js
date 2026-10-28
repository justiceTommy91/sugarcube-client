/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable no-underscore-dangle */
import {
	AddEquation,
	Color,
	CustomBlending,
	DataTexture,
	DepthTexture,
	DstAlphaFactor,
	DstColorFactor,
	HalfFloatType,
	MeshNormalMaterial,
	NearestFilter,
	NoBlending,
	RepeatWrapping,
	RGBAFormat,
	ShaderMaterial,
	UniformsUtils,
	UnsignedByteType,
	WebGLRenderTarget,
	ZeroFactor,
	DepthFormat,
	FrontSide,
	NotEqualStencilFunc,
	RedFormat,
	UnsignedInt248Type,
	DoubleSide,
} from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { mulberry32 } from '../utils/utils';
import { DEFAULT_THREE_NATIVE_LAYER, AO_LAYER, AO_PANO_LAYER } from '../constants';
import { GTAOShader, GTAODepthShader, GTAOBlendShader } from './shaders/GTAOShader.js';
import { generatePdSamplePointInitializer, PoissonDenoiseShader } from './shaders/PoissonDenoiseShader.js';

/**
 * A pass for an GTAO effect.
 *
 * `GTAOPass` provides better quality than {@link SSAOPass} but is also more expensive.
 *
 * ```js
 * const gtaoPass = new GTAOPass( scene, camera, width, height );
 * gtaoPass.output = GTAOPass.OUTPUT.Denoise;
 * composer.addPass( gtaoPass );
 * ```
 *
 * @augments Pass
 */
class CustomGTAOPass extends Pass {

	/**
	 * Constructs a new GTAO pass.
	 *
	 * @param {Scene} scene - The scene to compute the AO for.
	 * @param {Camera} camera - The camera.
	 * @param {number} [width=512] - The width of the effect.
	 * @param {number} [height=512] - The height of the effect.
	 * @param {Object} [parameters] - The pass parameters.
	 * @param {Object} [aoParameters] - The AO parameters.
	 * @param {Object} [pdParameters] - The denoise parameters.
	 */
	constructor( scene, camera, width = 512, height = 512, parameters, aoParameters, pdParameters ) {

		super();

		/**
		 * The width of the effect.
		 *
		 * @type {number}
		 * @default 512
		 */
		this.width = width;

		/**
		 * The height of the effect.
		 *
		 * @type {number}
		 * @default 512
		 */
		this.height = height;

		/**
		 * Overwritten to perform a clear operation by default.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.clear = true;

		/**
		 * The camera.
		 *
		 * @type {Camera}
		 */
		this.camera = camera;

		/**
		 * The scene to render the AO for.
		 *
		 * @type {Scene}
		 */
		this.scene = scene;

		/**
		 * The output configuration.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.output = 0;
		this._renderGBuffer = true;
		this._visibilityCache = [];

		/**
		 * The AO blend intensity.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.blendIntensity = 1.;

		/**
		 * The number of Poisson Denoise rings.
		 *
		 * @type {number}
		 * @default 2
		 */
		this.pdRings = 2.;

		/**
		 * The Poisson Denoise radius exponent.
		 *
		 * @type {number}
		 * @default 2
		 */
		this.pdRadiusExponent = 2.;

		/**
		 * The Poisson Denoise sample count.
		 *
		 * @type {number}
		 * @default 16
		 */
		this.pdSamples = 16;

		this.occlusionScene = null;

		this.gtaoNoiseTextures = [];
		for (let n = 0; n < 32; n++){
			this.gtaoNoiseTextures.push(this._generateNoiseR2(32, n));
		}

		this.pdNoiseTextures = [this._generateNoise(64)];

		this.gtaoRenderTarget = new WebGLRenderTarget( this.width, this.height, { depthBuffer: false, format: RedFormat, type: UnsignedByteType } ); 
		this.pdRenderTarget = new WebGLRenderTarget( this.width, this.height, { depthBuffer: false, format: RedFormat, type: UnsignedByteType } );

		this.gtaoMaterial = new ShaderMaterial( {
			defines: {  ...GTAOShader.defines },
			uniforms: UniformsUtils.clone( GTAOShader.uniforms ),
			vertexShader: GTAOShader.vertexShader,
			fragmentShader: GTAOShader.fragmentShader,
			blending: NoBlending,
			depthTest: false,
			depthWrite: false,
		} );
		this.gtaoMaterial.defines.PERSPECTIVE_CAMERA = this.camera.isPerspectiveCamera ? 1 : 0;
		this.gtaoMaterial.uniforms.tNoise.value = this.gtaoNoiseTextures[0];
		this.gtaoMaterial.uniforms.resolution.value.set( this.width, this.height );
		this.gtaoMaterial.uniforms.cameraNear.value = this.camera.near;
		this.gtaoMaterial.uniforms.cameraFar.value = this.camera.far;

		this.normalMaterial = new MeshNormalMaterial();
		this.normalMaterial.blending = NoBlending;
		this.normalMaterial.clearColor = new Color(0, 0, 0)
		this.normalMaterial.clearAlpha = 0.0
		this.normalMaterial.side = DoubleSide

		this.pdMaterial = new ShaderMaterial( {
			defines: {  ...PoissonDenoiseShader.defines },
			uniforms: UniformsUtils.clone( PoissonDenoiseShader.uniforms ),
			vertexShader: PoissonDenoiseShader.vertexShader,
			fragmentShader: PoissonDenoiseShader.fragmentShader,
			depthTest: false,
			depthWrite: false,
		} );
		this.pdMaterial.uniforms.tDiffuse.value = this.gtaoRenderTarget.texture;
		this.pdMaterial.uniforms.tNoise.value = this.pdNoiseTextures[0];
		this.pdMaterial.uniforms.resolution.value.set( this.width, this.height );
		this.pdMaterial.uniforms.lumaPhi.value = 10;
		this.pdMaterial.uniforms.depthPhi.value = 2;
		this.pdMaterial.uniforms.normalPhi.value = 3;
		this.pdMaterial.uniforms.radius.value = 8;

		this.depthRenderMaterial = new ShaderMaterial( {
			defines: {  ...GTAODepthShader.defines },
			uniforms: UniformsUtils.clone( GTAODepthShader.uniforms ),
			vertexShader: GTAODepthShader.vertexShader,
			fragmentShader: GTAODepthShader.fragmentShader,
			blending: NoBlending,
			side: DoubleSide
		} );
		this.depthRenderMaterial.uniforms.cameraNear.value = this.camera.near;
		this.depthRenderMaterial.uniforms.cameraFar.value = this.camera.far;

		this.copyMaterial = new ShaderMaterial( {
			uniforms: UniformsUtils.clone( CopyShader.uniforms ),
			vertexShader: CopyShader.vertexShader,
			fragmentShader: CopyShader.fragmentShader,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			blendSrc: DstColorFactor,
			blendDst: ZeroFactor,
			blendEquation: AddEquation,
			blendSrcAlpha: DstAlphaFactor,
			blendDstAlpha: ZeroFactor,
			blendEquationAlpha: AddEquation
		} );

		this.blendMaterial = new ShaderMaterial( {
			uniforms: UniformsUtils.clone( GTAOBlendShader.uniforms ),
			vertexShader: GTAOBlendShader.vertexShader,
			fragmentShader: GTAOBlendShader.fragmentShader,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			blending: CustomBlending,
			blendSrc: DstColorFactor,
			blendDst: ZeroFactor,
			blendEquation: AddEquation,
			blendSrcAlpha: DstAlphaFactor,
			blendDstAlpha: ZeroFactor,
			blendEquationAlpha: AddEquation
		} );

		this._fsQuad = new FullScreenQuad( null );

		this._originalClearColor = new Color();

		this.setGBuffer( parameters ? parameters.depthTexture : undefined, parameters ? parameters.normalTexture : undefined );

		if ( aoParameters !== undefined ) {

			this.updateGtaoMaterial( aoParameters );

		}

		if ( pdParameters !== undefined ) {

			this.updatePdMaterial( pdParameters );

		}

		this.panoMaterial = new ShaderMaterial({
								vertexShader: /* glsl */ `
										void main() {
												vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
												gl_Position = projectionMatrix * mvPosition;
										}
								`,
								fragmentShader: /* glsl */ `
										void main() {
												gl_FragColor = vec4(0, 0, 0, 1.0);
										}
								`,
								depthWrite: true,
								colorWrite: false,
								side: FrontSide,
								stencilWrite: true,
								stencilFunc: NotEqualStencilFunc,
								stencilRef: 2,
						})
	}

	/**
	 * Sets the size of the pass.
	 *
	 * @param {number} width - The width to set.
	 * @param {number} height - The width to set.
	 */
	setSize( width, height ) {

		this.width = width;
		this.height = height;

		const gtaoScale = 1.0 / window.devicePixelRatio;

		this.gtaoRenderTarget.setSize( this.width * gtaoScale, this.height * gtaoScale);
		this.normalRenderTarget.setSize( this.width * gtaoScale, this.height * gtaoScale);
		this.pdRenderTarget.setSize(this.width * gtaoScale, this.height * gtaoScale);

		this.gtaoMaterial.uniforms.resolution.value.set( this.width * gtaoScale, this.height * gtaoScale);
		this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy( this.camera.projectionMatrix );
		this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy( this.camera.projectionMatrixInverse );

		this.pdMaterial.uniforms.resolution.value.set( this.width * gtaoScale, this.height * gtaoScale );
		this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy( this.camera.projectionMatrixInverse );
	}

	setOcclusionScene(scene, occlusionScene) {
			this.scene = scene;
			this.occlusionScene = occlusionScene;
	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever the pass is no longer used in your app.
	 */
	dispose() {
		this.gtaoNoiseTextures.forEach(i => i.dispose());
		this.pdNoiseTextures.forEach(i => i.dispose());
		this.normalRenderTarget.dispose();
		this.gtaoRenderTarget.dispose();
		this.pdRenderTarget.dispose();
		this.normalMaterial.dispose();
		this.pdMaterial.dispose();
		this.copyMaterial.dispose();
		this.depthRenderMaterial.dispose();
		this._fsQuad.dispose();
	}

	/**
	 * A texture holding the computed AO.
	 *
	 * @type {Texture}
	 * @readonly
	 */
	get gtaoMap() {
		return this.pdRenderTarget.texture;
	}

	/**
	 * Configures the GBuffer of this pass. If no arguments are passed,
	 * the pass creates an internal render target for holding depth
	 * and normal data.
	 *
	 * @param {DepthTexture} [depthTexture] - The depth texture.
	 * @param {DepthTexture} [normalTexture] - The normal texture.
	 */
	setGBuffer( depthTexture, normalTexture ) {

		if ( depthTexture !== undefined ) {

			this.depthTexture = depthTexture;
			this.normalTexture = normalTexture;
			this._renderGBuffer = false;

		} else {
			this.depthTexture = new DepthTexture();
			this.depthTexture.format = DepthFormat;
			this.depthTexture.type = UnsignedInt248Type;
			this.depthTexture.minFilter = NearestFilter;
			this.depthTexture.magFilter = NearestFilter;
			this.normalRenderTarget = new WebGLRenderTarget( this.width, this.height, {
				minFilter: NearestFilter,
				magFilter: NearestFilter,
				type: HalfFloatType,
				depthTexture: this.depthTexture,
				depthBuffer: true
			} );
			this.normalTexture = this.normalRenderTarget.texture;
			this._renderGBuffer = true;

		}

		const normalVectorType = ( this.normalTexture ) ? 1 : 0;
		const depthValueSource = ( this.depthTexture === this.normalTexture ) ? 'w' : 'x';

		this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE = normalVectorType;
		this.gtaoMaterial.defines.DEPTH_SWIZZLING = depthValueSource;
		this.gtaoMaterial.uniforms.tNormal.value = this.normalTexture;
		this.gtaoMaterial.uniforms.tDepth.value = this.depthTexture;

		this.pdMaterial.defines.NORMAL_VECTOR_TYPE = normalVectorType;
		this.pdMaterial.defines.DEPTH_SWIZZLING = depthValueSource;
		this.pdMaterial.uniforms.tNormal.value = this.normalTexture;
		this.pdMaterial.uniforms.tDepth.value = this.depthTexture;

		this.depthRenderMaterial.uniforms.tDepth.value = this.normalRenderTarget.depthTexture;

	}

	/**
	 * Updates the GTAO material from the given paramter object.
	 *
	 * @param {Object} parameters - The GTAO material parameters.
	 */
	updateGtaoMaterial( parameters ) {

		if ( parameters.radius !== undefined ) {

			this.gtaoMaterial.uniforms.radius.value = parameters.radius;

		}

		if ( parameters.distanceExponent !== undefined ) {

			this.gtaoMaterial.uniforms.distanceExponent.value = parameters.distanceExponent;

		}

		if ( parameters.scale !== undefined ) {

			this.gtaoMaterial.uniforms.scale.value = parameters.scale;

		}

		if ( parameters.samples !== undefined && parameters.samples !== this.gtaoMaterial.defines.SAMPLES ) {

			this.gtaoMaterial.defines.SAMPLES = parameters.samples;
			this.gtaoMaterial.needsUpdate = true;

		}

	}

	/**
	 * Updates the Denoise material from the given paramter object.
	 *
	 * @param {Object} parameters - The denoise parameters.
	 */
	updatePdMaterial( parameters ) {

		let updateShader = false;

		if ( parameters.lumaPhi !== undefined ) {

			this.pdMaterial.uniforms.lumaPhi.value = parameters.lumaPhi;

		}

		if ( parameters.depthPhi !== undefined ) {

			this.pdMaterial.uniforms.depthPhi.value = parameters.depthPhi;

		}

		if ( parameters.normalPhi !== undefined ) {

			this.pdMaterial.uniforms.normalPhi.value = parameters.normalPhi;

		}

		if ( parameters.radius !== undefined && parameters.radius !== this.radius ) {

			this.pdMaterial.uniforms.radius.value = parameters.radius;

		}

		if ( parameters.radiusExponent !== undefined && parameters.radiusExponent !== this.pdRadiusExponent ) {

			this.pdRadiusExponent = parameters.radiusExponent;
			updateShader = true;

		}

		if ( parameters.rings !== undefined && parameters.rings !== this.pdRings ) {

			this.pdRings = parameters.rings;
			updateShader = true;

		}

		if ( parameters.samples !== undefined && parameters.samples !== this.pdSamples ) {

			this.pdSamples = parameters.samples;
			updateShader = true;

		}

		if ( updateShader ) {

			this.pdMaterial.defines.SAMPLES = this.pdSamples;
			this.pdMaterial.defines.SAMPLE_VECTORS = generatePdSamplePointInitializer( this.pdSamples, this.pdRings, this.pdRadiusExponent );
			this.pdMaterial.needsUpdate = true;

		}

	}

	/**
	 * Performs the GTAO pass.
	 *
	 * @param {WebGLRenderer} renderer - The renderer.
	 * @param {WebGLRenderTarget} writeBuffer - The write buffer. This buffer is intended as the rendering
	 * destination for the pass.
	 * @param {WebGLRenderTarget} readBuffer - The read buffer. The pass can access the result from the
	 * previous pass from this buffer.
	 * @param {number} deltaTime - The delta time in seconds.
	 * @param {boolean} maskActive - Whether masking is active or not.
	 */
	render( renderer, writeBuffer, readBuffer /* , deltaTime, maskActive */ ) {

		if (!this.scene) {
			return;
		}

		// render normals and depth (honor only meshes, points and lines do not contribute to AO)

		if ( this._renderGBuffer ) {

			this._overrideVisibility();
			this._renderOverride( renderer, this.normalMaterial, this.normalRenderTarget, 0x7777ff, 1.0 );
			this._restoreVisibility();
		}

		// render AO
		this.camera.updateMatrix();
		this.gtaoMaterial.uniforms.cameraNear.value = this.camera.near;
		this.gtaoMaterial.uniforms.cameraFar.value = this.camera.far;
		this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy( this.camera.projectionMatrix );
		const invProj = this.camera.projectionMatrix.clone().invert();
		this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy( invProj );
		this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy( this.camera.matrixWorld );
		this._renderPass( renderer, this.gtaoMaterial, this.gtaoRenderTarget, 0xffffff, 1.0 );

		// render poisson denoise

		this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy( invProj );
		this._renderPass( renderer, this.pdMaterial, this.pdRenderTarget, 0xffffff, 1.0 );

		// output result to screen

		switch ( this.output ) {

			case CustomGTAOPass.OUTPUT.Off:
				break;

			case CustomGTAOPass.OUTPUT.Diffuse:

				this.copyMaterial.uniforms.tDiffuse.value = readBuffer.texture;
				this.copyMaterial.blending = NoBlending;
				this._renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );

				break;

			case CustomGTAOPass.OUTPUT.AO:

				this.copyMaterial.uniforms.tDiffuse.value = this.gtaoRenderTarget.texture;
				this.copyMaterial.blending = NoBlending;
				this._renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );

				break;

			case CustomGTAOPass.OUTPUT.Denoise:

				this.copyMaterial.uniforms.tDiffuse.value = this.pdRenderTarget.texture;
				this.copyMaterial.blending = NoBlending;
				this._renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );

				break;

			case CustomGTAOPass.OUTPUT.Depth:

				this.depthRenderMaterial.uniforms.cameraNear.value = this.camera.near;
				this.depthRenderMaterial.uniforms.cameraFar.value = this.camera.far;
				this._renderPass( renderer, this.depthRenderMaterial, this.renderToScreen ? null : writeBuffer );

				break;

			case CustomGTAOPass.OUTPUT.Normal:

				this.copyMaterial.uniforms.tDiffuse.value = this.normalRenderTarget.texture;
				this.copyMaterial.blending = NoBlending;
				this._renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );

				break;

			case CustomGTAOPass.OUTPUT.Default:

				if (readBuffer !== writeBuffer) {
					this.copyMaterial.uniforms.tDiffuse.value = readBuffer.texture;
					this.copyMaterial.blending = NoBlending;
					this._renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
				}

				this.blendMaterial.uniforms.intensity.value = this.blendIntensity;
				this.blendMaterial.uniforms.tDiffuse.value = this.pdRenderTarget.texture;
				this._renderPass( renderer, this.blendMaterial, this.renderToScreen ? null : writeBuffer );

				break;

			default:
				console.warn( 'THREE.GTAOPass: Unknown output type.' );

		}

	}

	// internals

	_renderPass( renderer, passMaterial, renderTarget, clearColor, clearAlpha ) {

		// save original state
		renderer.getClearColor( this._originalClearColor );
		const originalClearAlpha = renderer.getClearAlpha();
		const originalAutoClear = renderer.autoClear;

		renderer.setRenderTarget( renderTarget );

		// setup pass state
		renderer.autoClear = false;
		if ( ( clearColor !== undefined ) && ( clearColor !== null ) ) {

			renderer.setClearColor( clearColor );
			renderer.setClearAlpha( clearAlpha || 0.0 );
			renderer.clear();

		}

		this._fsQuad.material = passMaterial;
		this._fsQuad.render( renderer );

		// restore original state
		renderer.autoClear = originalAutoClear;
		renderer.setClearColor( this._originalClearColor );
		renderer.setClearAlpha( originalClearAlpha );

	}

	_renderOverride( renderer, overrideMaterial, renderTarget, clearColor ) {

		renderer.getClearColor( this._originalClearColor );
		const originalClearAlpha = renderer.getClearAlpha();
		const originalAutoClear = renderer.autoClear;

		renderer.setRenderTarget( renderTarget );
		renderer.autoClear = false;

		clearColor = overrideMaterial.clearColor || clearColor;

		if ( ( clearColor !== undefined ) && ( clearColor !== null ) ) {
			renderer.setClearColor( clearColor );
		}

		renderer.setClearAlpha( 0.0 );
		renderer.clear();

		// Render occlusion scene - no self-shadow
		if (this.occlusionScene) {
			renderer.render( this.occlusionScene, this.camera);
		}

		// Render pano - (no self-shadow for walls)
		this.scene.overrideMaterial = this.panoMaterial;
		this.camera.layers.set(AO_PANO_LAYER);
		renderer.render( this.scene, this.camera );

		// Render objects
		this.scene.overrideMaterial = overrideMaterial;
		this.camera.layers.set(AO_LAYER);
		renderer.render( this.scene, this.camera );
		this.camera.layers.set(DEFAULT_THREE_NATIVE_LAYER)
		this.scene.overrideMaterial = null;

		renderer.autoClear = originalAutoClear;
		renderer.setClearColor( this._originalClearColor );
		renderer.setClearAlpha( originalClearAlpha );
	}

	_overrideVisibility() {

		const scene = this.scene;
		const cache = this._visibilityCache;

		scene.traverse( ( object ) => {

			if ( ( object.isPoints || object.isLine || object.isLine2 ) && object.visible ) {
				object.visible = false;
				cache.push( object );
			}

			// Hide meshes whose material has colorWrite disabled (e.g. backfacing wall elements
			// hidden by hideViewObstructingGeometries). Without this, the override material used
			// by the GTAO depth/normal pass would bypass the colorWrite flag and create ghost AO.
			if ( object.isMesh && object.visible && object.material && !object.material.colorWrite ) {
				object.visible = false;
				cache.push( object );
			}

		} );

	}

	_restoreVisibility() {
		const cache = this._visibilityCache;

		for ( let i = 0; i < cache.length; i ++ ) {
			cache[ i ].visible = true;
		} 
		cache.length = 0;
	}

	_generateNoise( size = 64 ) {

		const simplex = new SimplexNoise();

		const arraySize = size * size * 4;
		const data = new Uint8Array( arraySize );

		for ( let i = 0; i < size; i ++ ) {

			for ( let j = 0; j < size; j ++ ) {

				const x = i;
				const y = j;

				data[ ( i * size + j ) * 4 ] = ( simplex.noise( x, y ) * 0.5 + 0.5 ) * 255;
				data[ ( i * size + j ) * 4 + 1 ] = ( simplex.noise( x + size, y ) * 0.5 + 0.5 ) * 255;
				data[ ( i * size + j ) * 4 + 2 ] = ( simplex.noise( x, y + size ) * 0.5 + 0.5 ) * 255;
				data[ ( i * size + j ) * 4 + 3 ] = ( simplex.noise( x + size, y + size ) * 0.5 + 0.5 ) * 255;

			}

		}

		const noiseTexture = new DataTexture( data, size, size, RGBAFormat, UnsignedByteType );
		noiseTexture.wrapS = RepeatWrapping;
		noiseTexture.wrapT = RepeatWrapping;
		noiseTexture.needsUpdate = true;

		return noiseTexture;

	}

	_generateNoiseR2(size = 64, index = 0) {
		const rng = mulberry32(index)
		// Random offset for dithering
		const noiseOffX = rng() * 1000;
		const noiseOffY = rng() * 1000;
	
		const arraySize = size * size * 4;
		const data = new Uint8Array(arraySize);
	
	
		function fract(v) {
			return v - Math.floor(v);
		}

		// R2 noise functions
		function R2Noise(x, y) {
			// dot(p, vec2)
			const dot = x * 0.754877669 + y * 0.569840296;
			return fract(dot);
		}
	
		// eslint-disable-next-line @typescript-eslint/naming-convention
		function R2Noise_rgb(x, y) {
			const h1 = R2Noise(x, y);
			const h2 = R2Noise(x + 53.0, y + 53.0);
			const h3 = R2Noise(x + 49.0, y + 49.0);
			return [h1, h2, h3];
		}
	
		function triwave(z) {
			// z is array of three values in [0..1]
			return z.map(v => (v < 0.5 ? 2.0 * v : 2.0 - 2.0 * v));
		}
	
		// Fill data
		for (let i = 0; i < size; i++) {
			for (let j = 0; j < size; j++) {
				// floor coordinates plus offset
				const nx = Math.floor(i + noiseOffX);
				const ny = Math.floor(j + noiseOffY);
	
				let [r, g, b] = R2Noise_rgb(nx, ny);
				[r, g, b] = triwave([r, g, b]);
	
				const idx = (i * size + j) * 4;
				data[idx]     = Math.floor(r * 255);
				data[idx + 1] = Math.floor(g * 255);
				data[idx + 2] = Math.floor(b * 255);
				data[idx + 3] = 255;
			}
		}
	
		// Create texture
		const noiseTexture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
		noiseTexture.wrapS = RepeatWrapping;
		noiseTexture.wrapT = RepeatWrapping;
		noiseTexture.needsUpdate = true;
	
		return noiseTexture;
	}

	updateNoise(accumulateIndex){
		const idx = Math.max(0, accumulateIndex % this.gtaoNoiseTextures.length);
		const idx2 =  Math.max(0, accumulateIndex % this.pdNoiseTextures.length);
		this.gtaoMaterial.uniforms.tNoise.value = this.gtaoNoiseTextures[idx];
		this.pdMaterial.uniforms.tNoise.value = this.pdNoiseTextures[idx2];
	}

}

CustomGTAOPass.OUTPUT = {
	'Off': - 1,
	'Default': 0,
	'Diffuse': 1,
	'Depth': 2,
	'Normal': 3,
	'AO': 4,
	'Denoise': 5,
};

export { CustomGTAOPass };
