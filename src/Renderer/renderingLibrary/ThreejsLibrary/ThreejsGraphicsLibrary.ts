/* eslint-disable no-bitwise */
/* eslint-disable class-methods-use-this */
/* eslint-disable i18next/no-literal-string */


import * as THREE from 'three'
import { CustomShader, 
    RenderingParamters,
    LightType,
    MaterialTypes } from "Renderer/assets/Types";
import { PCSS_DEFAULT_FRUSTUM_WIDTH, PCSS_LIGHT_WORLD_SIZE } from 'Renderer/constants';
import PCSSShadowMaterial from 'Renderer/PCSSShadowMaterial'
import { getSafariVersion, isSafari } from 'utils/browser';
import { RendererContextType } from 'Renderer/rendering/Enums';
import { patchRendererForRenderTargets } from 'Renderer/rendering/rendering_utils';
import { gvCurrentSettings } from 'Renderer/foundation/geom_app';
import { GfxInterface } from "../gfxInterface";

let tonemappingEnvmapPbrPatched = false
let physicalFragPatched = false

export const patchThreeJSPbrShaders = () => {
    if (!tonemappingEnvmapPbrPatched) {
        THREE.ShaderChunk.envmap_physical_pars_fragment = THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
            'return PI * envMapColor.rgb * envMapIntensity;',
            `
                return PI * envMapColor.rgb * pow(2.0, envMapIntensity);
            `,
        )
        THREE.ShaderChunk.envmap_physical_pars_fragment = THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
            'return envMapColor.rgb * envMapIntensity;',
            `
                return envMapColor.rgb * pow(2.0, envMapIntensity);
            `,
        )
        // r160 wraps linear tone mapping in saturate(): match updated string
        THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
            'return saturate( toneMappingExposure * color );',
            `
                return pow(2.0, toneMappingExposure) * color;
            `,
        )
        for (let i = 0; i < 3; i += 1) {
            THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
                'color *= toneMappingExposure',
                `color = color * pow(2.0, toneMappingExposure)`,
            )
        }
        THREE.ShaderChunk.envmap_common_pars_fragment = THREE.ShaderChunk.envmap_common_pars_fragment.replace(
            'uniform float envMapIntensity;',
            `
                uniform float envMapIntensity;
                #ifndef ENV_MAP_ROTATION
                    #define ENV_MAP_ROTATION
                    uniform mat3 envMapRotation;
                #endif
            `,
        )
        THREE.ShaderLib.backgroundCube.fragmentShader = THREE.ShaderLib.backgroundCube.fragmentShader.replace(
            '#include <colorspace_fragment>',
            `
                #include <colorspace_fragment>
                gl_FragColor = LinearTosRGB( gl_FragColor );
            `,
        )
        
        THREE.ShaderLib.backgroundCube.vertexShader = THREE.ShaderLib.backgroundCube.vertexShader.replace(
            'varying vec3 vWorldDirection;',
            `
                varying vec3 vWorldDirection;
                #ifndef ENV_MAP_ROTATION
                    #define ENV_MAP_ROTATION
                    uniform mat3 envMapRotation;
                #endif
            `,
        )
        .replace(
            '#include <begin_vertex>',
            `
                vWorldDirection = envMapRotation * vWorldDirection;
                #include <begin_vertex>
            `
        )

		const rotation = gvCurrentSettings()?.debugSettings?.environmentRotation || 0
		const rotationInRadian = rotation * Math.PI / 180
        const mat4 = new THREE.Matrix4().makeRotationY(rotationInRadian)
        const mat3 = new THREE.Matrix3().setFromMatrix4(mat4).transpose()
        THREE.ShaderLib.backgroundCube.uniforms.envMapRotation = { value: mat3 }

        tonemappingEnvmapPbrPatched = true
    }
}

export default class ThreejsRenderingLibrary implements GfxInterface {
     public renderer: THREE.WebGL1Renderer | THREE.WebGLRenderer | null;
     public libraryName = 'Three.js';
     public version = THREE.REVISION;
     public basicUniforms = THREE.ShaderLib.basic.uniforms;
     public basicFragmentShader = THREE.ShaderLib.basic.fragmentShader;
     public basicVertexShader = THREE.ShaderLib.basic.vertexShader;
     public tmpMat4 = new THREE.Matrix4();
     public tmpXAxis = new THREE.Vector3();
     public tmpYAxis = new THREE.Vector3();
     public tmpZAxis = new THREE.Vector3();
     public constants = {
        PCFSoftShadowMap : THREE.PCFSoftShadowMap,
        PCFShadowMap : THREE.PCFShadowMap,
        SRGBColorSpace: THREE.SRGBColorSpace,
        RepeatWrapping : THREE.RepeatWrapping,
        RedFormat: THREE.RedFormat,
        RGBAFormat: THREE.RGBAFormat,
        LuminanceFormat:THREE.LuminanceFormat,
        UnsignedByteType: THREE.UnsignedByteType,
        UVMapping: THREE.UVMapping,
        ClampToEdgeWrapping: THREE.ClampToEdgeWrapping,
        LinearFilter: THREE.LinearFilter,
        NearestFilter: THREE.NearestFilter,
        DoubleSided: THREE.DoubleSide,
        FrontSide: THREE.FrontSide,
        AlwaysDepth: THREE.AlwaysDepth,
        NotEqualStencilFunc: THREE.NotEqualStencilFunc
    };

     constructor () {
        this.renderer = null
    }

    createVec3( x: number, y:number, z:number ) : THREE.Vector3 {
        return new THREE.Vector3(x, y, z)
    }

    createVec2(x: number, y:number) : THREE.Vector2 {
        return new THREE.Vector2(x, y)
    }

    createBox3(min?: THREE.Vector3, max?: THREE.Vector3) : THREE.Box3 {
        return new THREE.Box3(min, max)
    }

    createColor( value?: number | string | [number], useColorManager? : boolean) : THREE.Color {
        if(value instanceof Array){
            if(useColorManager) {
                return new THREE.Color(...value)
            } 
            
            // Moiz GFX-3914 -
            // We do a manual hex to rgb conversion here because in the r152, the colorManagement is enabled by default
            // this causes slight modifications in lighting for directional lights when converting from hex to rgb.
            // I believe it is because it get applied a linear filter before the color is returned 
            // but we dont want that.

            const hex = value[0]
            const r = ( hex >> 16 & 255 ) / 255;
		    const g = ( hex >> 8 & 255 ) / 255;
		    const b = ( hex & 255 ) / 255;

            return new THREE.Color(r, g, b)
        }
        return new THREE.Color(value)
    }

    createMat4() : THREE.Matrix4 {
        return new THREE.Matrix4()
    }

    createTextureLoader(manager?: THREE.LoadingManager) : THREE.TextureLoader {
        return new THREE.TextureLoader(manager)
    }

    createOrthoCamera(
        l? : number,
        r? : number,
        t? : number,
        b? : number,
        n? : number,
        f? : number) :  THREE.OrthographicCamera {
        return new THREE.OrthographicCamera(l, r, t, b, n, f)
    }

    createPerspCamera(
        fov? : number,
        aspect? : number,
        n? : number,
        f? : number
    ) : THREE.PerspectiveCamera {
        return new THREE.PerspectiveCamera(fov, aspect, n, f)
    }

    createBoxBufferGeometry(
        width? : number,
        height? : number,
        depth? : number,
        widthSegments? : number,
        heightSegments? : number,
        depthSegments? : number,
    ) : THREE.BoxGeometry {
        return new THREE.BoxGeometry(
            width,
            height,
            depth,
            widthSegments,
            heightSegments,
            depthSegments
        )
    }

    createLineSegment(geometry?: THREE.BufferGeometry, material?: THREE.Material) : THREE.LineSegments {
        return new THREE.LineSegments(geometry, material)
    }

    createLine(geometry?: THREE.BufferGeometry, material?: THREE.Material ) : THREE.Line {
        return new THREE.Line(geometry, material)
    }

    createEdgesGeometry(geometry?: THREE.BoxGeometry, angle?: number) : THREE.EdgesGeometry {
        return new THREE.EdgesGeometry(geometry, angle)
    }

    createSphereGeometry (radius?: number,
        widthSegments?: number,
        heightSegments?: number,
        phiStart?: number,
        phiLength?: number,
        thetaStart?: number,
        thetaLength?: number) {
        return new THREE.SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength,
            thetaStart, thetaLength)
    }

    createPlaneGeometry ( w : number, h: number, wsegs : number, hsegs: number ) : THREE.PlaneGeometry {
        return new THREE.PlaneGeometry(w, h, wsegs, hsegs)
    }

    createPlaneBufferGeometry( w : number, h: number, wsegs : number, hsegs: number ) : THREE.PlaneGeometry {
        return new THREE.PlaneGeometry(w, h, wsegs, hsegs)
    }

    translateGeometry( geometry: THREE.BoxGeometry, pos: {x: number, y: number, z: number}) {
        geometry.translate(pos.x, pos.y, pos.z)
    }

    createMesh( geometry: THREE.PlaneGeometry, material?: THREE.Material) : THREE.Mesh {
        return new THREE.Mesh(geometry, material)
    }

    createWebGLRenderTarget(width: number, height: number, options: object) : THREE.WebGLRenderTarget {
        return new THREE.WebGLRenderTarget(width, height, options)
    }

    createPMREMGenerator() : THREE.PMREMGenerator | undefined{
        if(this.renderer){
            return new THREE.PMREMGenerator(this.renderer)        
        }
        return undefined
    }

    createDataTexture(        
        data?: BufferSource | null,
        width?: number,
        height?: number,
        format?: THREE.PixelFormat,
        type?: THREE.TextureDataType,
        mapping?: THREE.Mapping,
        wrapS?: THREE.Wrapping,
        wrapT?: THREE.Wrapping,
        magFilter?: THREE.MagnificationTextureFilter,
        minFilter?: THREE.MinificationTextureFilter,
        anisotropy?: number,
        encoding?: THREE.ColorSpace) {
            return new THREE.DataTexture (
                data,
                width,
                height,
                format,
                type,
                mapping,
                wrapS,
                wrapT,
                magFilter,
                minFilter,
                anisotropy,
                encoding
            )
        }

    createMaterial( materialType : MaterialTypes, params?: THREE.MeshBasicMaterialParameters 
        | THREE.MeshStandardMaterialParameters
        | THREE.LineBasicMaterialParameters
        | THREE.ShadowMaterialParameters) : 
        THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | THREE.LineBasicMaterial | THREE.ShadowMaterial |
        undefined  {
        if( materialType === MaterialTypes.Standard )
            { return new THREE.MeshStandardMaterial(params) }
        
        if( materialType === MaterialTypes.Basic )
            { return new THREE.MeshBasicMaterial(params) }

        if( materialType === MaterialTypes.Line )
            { return new THREE.LineBasicMaterial(params) }
        
        if( materialType === MaterialTypes.Shadow )
            { return new THREE.ShadowMaterial(params) }

        // eslint-disable-next-line no-console
        console.error("Cannot create material type")
        return undefined
    }

    createPointLight(color?: string | number, intensity?: number, distance?: number, decay?: number) 
    : THREE.PointLight {
       return new THREE.PointLight(color, intensity, distance, decay)
    }

    createDirectionLight(color?: number | string, intensity?: number) 
    : THREE.DirectionalLight {
        return new THREE.DirectionalLight(color, intensity)
    }

    createSpotLight(color?: number | string,
        intensity?: number,
        distance?: number,
        angle?: number,
        penumbra?: number,
        decay?: number,) : THREE.SpotLight {
            return new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay)
        }
    
    createRectAreaLight(color?: number | string, intensity?: number, width?: number, height?: number)
    : THREE.RectAreaLight {
        return new THREE.RectAreaLight(color, intensity, width, height)
    }

    createCustomShaderMaterial(params: THREE.ShaderMaterialParameters) {
    const material = new THREE.ShaderMaterial(params)
    return material            
    }

    cloneUniform(uniform_src : THREE.Uniform) {
        return  THREE.UniformsUtils.clone(uniform_src as unknown as { [uniform: string]: THREE.IUniform })
    }

    replaceShader(shader: string, search: string, replace: string) {
       shader.replace(search, replace)
        return shader
    }


    createBufferGeometry() : THREE.BufferGeometry {
        return new THREE.BufferGeometry()
    }

    createFloat32BufferAttribute( array: Iterable<number> | ArrayLike<number> | ArrayBuffer | number,
        itemSize: number,
        normalized?: boolean) : THREE.Float32BufferAttribute {
            return new THREE.Float32BufferAttribute(array, itemSize, normalized)
        } 

    setBufferGeometryAttribute(buffGeom : THREE.BufferGeometry, name: string,
    buffAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
        buffGeom.setAttribute(name, buffAttribute)
        return buffGeom
    }

    /**
   * Intializes and sets up the Threejs webgl renderer. The intial settings
   * for the renderer can be set through the params which are passed in.
   * 
   * @param params { RenderingParamters } The initial parameters to apply.
   * @property useWebGL1 { boolean } Whether to use webGL1 or not.
   * @property software { boolean } Whether to use software or not.
   * @property isMobile { boolean } Is mobile based or not.
   * @property downrez { number } If we wish downscale the canvas with/height based on if running on software.
   * @property usePBR { boolean } Whether to use physically based rendering.
   * @property canvas { HTMLCanvasObject } Base HTML canvas object.'
   * @property antialias { boolean } Turn on/off antialiasing.
   * @property preserveDrawingBuffer { boolean } Whether To preserve the drawing buffer or not.
   * @property powerPreference { string } Defines the renderer's preferred power settings.
   * @property alpha { boolean } Whether to enable alpha or not.
   * 
   * @returns Threejs.WebGLRenderer or Threejs.WebGL1Renderer based on the parameters provided.
   */

    createRenderer(params: RenderingParamters) : THREE.WebGLRenderer | THREE.WebGL1Renderer {
        const webGLParams = {
            canvas: params.canvas,
            alpha: params.alpha,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
            antialias: params.antialias,
            useWebGL1:  isSafari() && (getSafariVersion() < 16.4),
            context: params.context
        }
        this.renderer = webGLParams.useWebGL1 ?
            new THREE.WebGL1Renderer(webGLParams) :
            new THREE.WebGLRenderer(webGLParams)

        patchRendererForRenderTargets(this.renderer)

        return this.renderer
    }

    getRenderer() : THREE.WebGLRenderer | THREE.WebGL1Renderer | null {
        return this.renderer
    }

    getRendererContextType(): RendererContextType {
        if (this.renderer) {
            return this.renderer.capabilities.isWebGL2
                ? RendererContextType.WebGL2Context
                : RendererContextType.WebGL1Context
        }
        return RendererContextType.UndefinedContext
    }

    /**
   * Inject custom shaderchunk based on the provided customShader parameter. Currently we 
   * have only three custom shaders being applied in the wallspiceWebGL which are env, pbr and standardMaterial.
   * 
   * @param customShader { CustomShader } Enum object for declaring what shaderchunk to change.
   * @type env - For applying env map custom shader chunk
   * @type pbr - For applying pbr custom shader chunk
   * @type standard - For applying standard Material Custom Shader chunk.
   */

    applyCustomShaders ( customShader: CustomShader ) : void {
    if ( customShader === CustomShader.Pbr ) {
        patchThreeJSPbrShaders()
    }

    if ( customShader === CustomShader.Standard ) {
        if (!physicalFragPatched) {
            ['standard', 'physical'].forEach((shaderType) => {
                THREE.ShaderLib[shaderType].fragmentShader = THREE.ShaderLib[shaderType].fragmentShader.replace(
                    `#include <shadowmap_pars_fragment>`,
                    THREE.ShaderChunk.shadowmap_pars_fragment,
                )
                THREE.ShaderLib[shaderType].fragmentShader = THREE.ShaderLib[shaderType].fragmentShader.replace(
                    `#ifdef USE_SHADOWMAP`,
                    PCSSShadowMaterial.fragmentShaderString,
                )
                // Apply a constant minimum smoothing scaling factor to 
                // reduce glitches caused by shadows high proximity
                THREE.ShaderLib[shaderType].fragmentShader = THREE.ShaderLib[shaderType].fragmentShader.replace(
                    `return PCF_Filter( shadowMap, uv, zReceiver, filterRadius * smoothingFactor );`,
                    `return PCF_Filter( shadowMap, uv, zReceiver, 0.0015 + (abs(filterRadius)*smoothingFactor) );`,
                )
                THREE.ShaderLib[shaderType].fragmentShader = THREE.ShaderLib[shaderType].fragmentShader.replace(
                    `#if defined( SHADOWMAP_TYPE_PCF )`,
                    `
                    return PCSS( shadowMap, shadowCoord );
                    #if defined( SHADOWMAP_TYPE_PCF )
                    `,
                )
                THREE.ShaderLib[shaderType].uniforms = THREE.UniformsUtils.merge([
                    THREE.ShaderLib[shaderType].uniforms,
                    {
                        lightSizeUV: { value: PCSS_LIGHT_WORLD_SIZE / PCSS_DEFAULT_FRUSTUM_WIDTH },
                    },
                ])
            })
            physicalFragPatched = true
        }
    }

    }

    /**
   * This returns a Threejs Scene.
   * 
   * @return Returns a Threejs Scene object.
   */

  createScene(): THREE.Scene {
    return new THREE.Scene()
    }
    
    /**
   * Creates a light source in the scene.
   * 
   * @param { LightType } lightType Enum object, type of light which you want to create.
   * @type Directional
   * @type Spot
   * @type Point
   * @type Area
   * 
   * @param { object } params parameters for light object to be created.
   * 
   * @return Returns a Threejs light object.
   */

    createLight( type: LightType, 
        color:string | number, 
        intensity?: number, 
        distance?: number, 
        decay?: number,
        angle?: number,
        penumbra?: number,
        width?: number, 
        height?: number ) : THREE.PointLight | THREE.DirectionalLight | 
        THREE.SpotLight | THREE.RectAreaLight | undefined {
            
            if(type === LightType.Point) {
               return new THREE.PointLight(color, intensity, distance, decay)
            }
            
            if(type === LightType.Directional) {
               return new THREE.DirectionalLight(color, intensity)
            }
            
            if(type === LightType.Spot) {
               return new THREE.SpotLight(color, intensity, 
                   distance, angle, penumbra, decay)
            }
            
            if(type === LightType.Area) {
               return new THREE.RectAreaLight(color, intensity, width, height) 
            }

            // eslint-disable-next-line no-console
            console.error("Cannot create light type")
            return undefined
        }
}
