import * as THREE from 'three'
import {
  DISALLOWED_WALL_PLACEMENT_CLASSES,
  NYUD40_CLASSES,
  SENTRY_BREADCRUMB_CATEGORY,
} from 'Renderer/constants'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader'
import { PolygonType } from './assets/Types';
import { gvRenderLibrary } from './foundation/geom_app'
import { buildPlanePolygonsMesh } from './utils/debug_gl_viz';
import { RendererContextType } from './rendering/Enums';
import { RenderTargetHandler } from './rendering/rendering_utils'

// Basic copying vertex shader; for texture helper usage.
const copyTextureVertexshader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`

// Basic texture copying fragment shader; for texture helper usage.
const copyTextureFragmentshader = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(map, vUv);
  }
`

// A mapped version of the NYUD40 classes list; for texture helper usage.
const semanticClassification = NYUD40_CLASSES.map(semanticClass => 
  !DISALLOWED_WALL_PLACEMENT_CLASSES.includes(semanticClass)
)

export default class TextureHelper {
  // The full screen quad material, used to copy the pixels as is.
  private material = new THREE.ShaderMaterial({
    uniforms: { map: { value: null } },
    vertexShader: copyTextureVertexshader,
    // A tweak to workaround mismatching color spaces cause ThreeJS dropped support of WGL1 on r153.
    fragmentShader: gvRenderLibrary()?.getRendererContextType() === RendererContextType.WebGL1Context
      ? copyTextureFragmentshader.replace(`texture2D(map, vUv)`, `pow(texture2D(map, vUv), vec4(1.0 / 2.2))`)
      : copyTextureFragmentshader,
    side: THREE.DoubleSide,
  })

  // The full screen quad material, used to copy the pixels Y-flipped.
  // Rendertarget textures can't use the native `flipY` flag so a soft flipping
  // copy material is used in this case.
  private materialYFlipped = new THREE.ShaderMaterial({
    uniforms: { map: { value: null } },
    vertexShader: copyTextureVertexshader,
    // A tweak to workaround mismatching color spaces cause ThreeJS dropped support of WGL1 on r153.
    fragmentShader: (gvRenderLibrary()?.getRendererContextType() === RendererContextType.WebGL1Context
      ? copyTextureFragmentshader.replace(`texture2D(map, vUv)`, `pow(texture2D(map, vUv), vec4(1.0 / 2.2))`)
      : copyTextureFragmentshader)
      .replace(`(map, vUv)`, `(map, vec2(vUv.x, 1.0 - vUv.y))`),
    side: THREE.DoubleSide,
  })

  // A full screen quad positioned directly in front of the local camera.
  private planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)

  // A camera that's pointed towards the full screen quad for local renders.
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.0, 1000)

  // A scene where the full screen quad is added and rendered.
  private scene = new THREE.Scene().add(this.planeMesh)

  private rtHandler = new RenderTargetHandler()

  getResizedCopy(texture: THREE.Texture, width: number, height: number, softFlip = false) {
    const threeRenderer = gvRenderLibrary()?.renderer
    if (!threeRenderer || !texture) {
      return null
    }

    this.planeMesh.material = softFlip ? this.materialYFlipped : this.material
    this.planeMesh.material.uniforms.map.value = texture

    const renderTarget = new THREE.WebGLRenderTarget(width, height)
    renderTarget.texture.name = `${texture.name}-resized`
    renderTarget.texture.colorSpace = texture.colorSpace

    const currentRenderTarget = threeRenderer.getRenderTarget()

    threeRenderer.setRenderTarget(renderTarget)
    threeRenderer.clear()

    threeRenderer.render(this.scene, this.camera)

    threeRenderer.setRenderTarget(currentRenderTarget)

    this.planeMesh.material.uniforms.map.value = null
    this.planeMesh.material = this.material

    // Add renderTarget to rtHandler for correct disposal
    this.rtHandler.addRenderTarget(renderTarget)

    return renderTarget.texture
  }

  // Provided the plane polygons list, projects their IDs on pano-sized map.
  // The projected map is a replica to the normals_segmentation mask
  // which maps each pixel to their corresponding plane polygon data.
  projectPolygonsOnTexture(width: number, height: number, camera: THREE.Camera,
    planePolygons: Array<PolygonType>, segmentationTexture?: THREE.Texture | null ) {
    // Get access to the active WebGL rendering context.
    const threeRenderer = gvRenderLibrary()?.renderer
    if (!threeRenderer) return null

    // Generate a Three.Mesh group for the plane polygons.
    const planePolygonsAsMeshGroup = buildPlanePolygonsMesh(planePolygons)

    // Initialize a render target whose texture will contain the projected map.
    const renderTarget = new THREE.WebGLRenderTarget(width, height)
    renderTarget.texture.name = `${planePolygonsAsMeshGroup.name}-projected`

    // Save the current renderTargets state.
    const currentRenderTarget = threeRenderer.getRenderTarget()

    // Create a material that renders a constant value, passed as a uniform to the shader.
    // This will be assigned as a temporary material to the polygon to render the polygon's ID.
    const polygonIdMaterial = new THREE.ShaderMaterial({
      vertexShader: copyTextureVertexshader,
      fragmentShader: /* glsl */ `
        uniform vec2 resolution;
        uniform float planeID;
        uniform sampler2D segmentationMap;
        uniform bool semanticsList[SEMANTIC_CLASSES_LENGTH];
        varying vec2 vUv;

        // Access the classification class using a searching loop as
        // dynamic index access is not supported in webgl1, i.e. Safari
        // Note the unrolling of the for loop using a preprocessor directive
        // https://threejs.org/docs/#api/en/materials/ShaderMaterial.
        bool getSemanticClassification(int index) {
            #pragma unroll_loop_start
            for (int i = 0; i < SEMANTIC_CLASSES_LENGTH; i++) {
                if (i == index) {
                    return semanticsList[i];
                }
            }
            #pragma unroll_loop_end
            return true;
        }

        void main() {
          float b = planeID / 255.0;

          #ifdef USE_SEMANTIC_SEGMENTATION
            vec2 uv = (gl_FragCoord.xy - 0.5) / resolution.xy;
            vec2 flipUV = vec2(uv.x, 1.0 - uv.y);
            float semanticValue = texture2D(segmentationMap, flipUV).r;
            int semanticID = int((semanticValue * 255.0) + 0.5);
            if (!getSemanticClassification(semanticID)) b = -1.0 / 255.0;
          #endif

          gl_FragColor = vec4(0.0, 0.0, b, 1.0);
        }
      `,
      uniforms: {
        planeID: { value: null },
        segmentationMap: { value: segmentationTexture },
        semanticsList: { value: semanticClassification },
        resolution: { value: new THREE.Vector2(width, height) },
      },
      defines: {
        ...segmentationTexture ? { USE_SEMANTIC_SEGMENTATION: '' } : {},
        SEMANTIC_CLASSES_LENGTH: semanticClassification.length,
      },
    })

    // Set the material per polygon mesh, assigning the corresponding polygon ID.
    planePolygonsAsMeshGroup.children.forEach((object) => {
      const polygonMesh = object as THREE.Mesh
      polygonMesh.material = polygonIdMaterial
      polygonMesh.onBeforeRender = (...args) => {
        const polygonShaderMaterial = args[4] as THREE.ShaderMaterial
        polygonShaderMaterial.uniforms.planeID.value = polygonMesh.userData.polygonID
        polygonShaderMaterial.uniformsNeedUpdate = true
      }
    })

    // Render the plane polygons into the render texture.
    threeRenderer.setRenderTarget(renderTarget)
    threeRenderer.clear()
    threeRenderer.render(planePolygonsAsMeshGroup, camera)

    // Reset the renderTargets/material state.
    threeRenderer.setRenderTarget(currentRenderTarget)
    polygonIdMaterial.dispose()

    // Add renderTarget to rtHandler for correct disposal
    this.rtHandler.addRenderTarget(renderTarget)

    // Return the projected texture.
    return renderTarget.texture
  }

  readPixels(texture: THREE.Texture, softFlip = false, ww? : number, hh? : number) {
    const threeRenderer = gvRenderLibrary()?.renderer
    if (!threeRenderer) {
      return null
    }

    this.planeMesh.material = softFlip ? this.materialYFlipped : this.material
    this.planeMesh.material.uniforms.map.value = texture
    this.planeMesh.material.blending = 0

    let width = 0
    let height = 0

    if(texture){
      width = texture.image.width
      height = texture.image.height
    }

    const retBuffer = new Uint8Array((ww || width) * (hh || height) * 4)

    const renderTarget = new THREE.WebGLRenderTarget(ww || width, hh || height)

    renderTarget.texture.name = `${texture.name}-resized`
    renderTarget.texture.colorSpace = texture.colorSpace
    renderTarget.texture.needsUpdate = true

    const currentRenderTarget = threeRenderer.getRenderTarget()

    threeRenderer.setRenderTarget(renderTarget)
    threeRenderer.clear()

    threeRenderer.render(this.scene, this.camera)

    threeRenderer.setRenderTarget(currentRenderTarget)

    this.planeMesh.material.uniforms.map.value = null
    this.planeMesh.material = this.material

    threeRenderer.readRenderTargetPixels(renderTarget, 0, 0, ww || width, hh || height, retBuffer)
    renderTarget.dispose()

    return { data: retBuffer, width, height }
  }

  testFloatRT() {
    const threeRenderer = gvRenderLibrary()?.renderer
    const context = threeRenderer?.getContext()
    if (!threeRenderer || !context) {
        return { floatRTresult: false }
    }

    const size = 2
    const renderTarget = new THREE.WebGLRenderTarget(size, size, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    })

    const material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: /* glsl */ `
        void main() {
          gl_FragColor = vec4(0.5, 0.125, 0.03, 0.03);
        }
      `,
      side: THREE.DoubleSide,
    })

    const currentRenderTarget = threeRenderer.getRenderTarget()
    const currentMaterial = this.planeMesh.material
    this.planeMesh.material = material

    const checkError = (where: string) => {
      const glError = context.getError()
      if (glError !== 0) {
        threeRenderer.setRenderTarget(currentRenderTarget)
        this.planeMesh.material = currentMaterial

        material.dispose()
        renderTarget.dispose()
        return {
          message: `GL Error in TAA check`,
          breadcrumbs: [
              {
                  type: `error`,
                  category: SENTRY_BREADCRUMB_CATEGORY,
                  data: {
                      errorCode: glError,
                      where,
                  }
              },
          ]
        }
      }
      return false
    }

    threeRenderer.setRenderTarget(renderTarget)
    const rendertargeterr = checkError(`setRenderTarget`)
    if (rendertargeterr) {
      return { floatRTresult: false, error: rendertargeterr }
    }

    threeRenderer.clear()
    threeRenderer.render(this.scene, this.camera)
    const rendererr = checkError(`render`)
    if (rendererr) {
      return { floatRTresult: false, error: rendererr }
    }

    const copyShader = CopyShader
    const copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms)
    const copyMaterial = new THREE.ShaderMaterial({
        uniforms: copyUniforms,
        vertexShader: copyShader.vertexShader,
        fragmentShader: copyShader.fragmentShader,
        premultipliedAlpha: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false
    })
    const data = new Float32Array(size * size * 4).fill(0)
    data[0] = 20; data[1] = 25; data[2] = 30; data[3] = 255;
    const dataTexture = new THREE.DataTexture(
        data, size, size,
        THREE.RGBAFormat,
        THREE.FloatType,
        THREE.UVMapping,
        THREE.RepeatWrapping,
        THREE.RepeatWrapping,
        THREE.LinearFilter,
        THREE.LinearFilter,
    )
    dataTexture.needsUpdate = true
    copyUniforms.opacity.value = 1 / 32
    copyUniforms.tDiffuse.value = dataTexture
    this.planeMesh.material = copyMaterial
    threeRenderer.render(this.scene, this.camera)
    const copyrendererr = checkError(`copyRender`)
    if (copyrendererr) {
      copyMaterial.dispose()
      return { floatRTresult: false, error: copyrendererr }
    }

    threeRenderer.setRenderTarget(currentRenderTarget)
    this.planeMesh.material = currentMaterial

    const bufferSize = size * size * 4
    const buffer = new Float32Array(bufferSize)
    threeRenderer.readRenderTargetPixels(renderTarget, 0, 0, size, size, buffer)
    const readpixelserr = checkError(`readRenderTargetPixels`)
    if (readpixelserr) {
      return { floatRTresult: false, error: readpixelserr }
    }

    let result = true;
    [1.125, 0.906, 0.967, 7.999, 0.5, 0.125, 0.03, 0.03]
      .forEach((val, i) => { result = result && parseFloat(buffer[i].toFixed(3)) === val })

    material.dispose()
    renderTarget.dispose()
    copyMaterial.dispose()
    dataTexture.dispose()

    return { floatRTresult: result }
  }

  dispose() {
    // Note every renderTarget is disposed by its own texture/material, no need to dispose here.
    this.material.dispose()
    this.materialYFlipped.dispose()
    this.planeMesh.geometry.dispose()
    this.planeMesh.material.dispose()
  }
}
