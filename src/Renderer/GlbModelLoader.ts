/**
 * GlbModelLoader
 */
import * as THREE from 'three'

import CustomGLTFLoader from 'Renderer/gltf/CustomGLTFLoader'
import CustomDRACOLoader from 'Renderer/CustomDracoLoader'
import { SceneItemMetrics } from 'Renderer/geomviewer'

import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import CustomStandardMaterial from './CustomStandardMaterial'
import { setMaterialOnBeforeCompileCallback } from './rendering/rendering_utils'

export type ProgressCallback = (event: ProgressEvent) => void

export type OnUpdateCallback = () => void

// TODO(georges): For now the loader gets a straight connection to the renderer. This needs
// to be revisited when the renderer is re-architected. E.g. the env texture should probably
// come from the AssetManager.
export interface RenderEngineConnector {
    // Informed the renderer about model-loading status.
    beginLoadingModel(): void
    endLoadingModel(): void

    // Queries to renderer for assets or settings.
    getEnvCubeTexture(): THREE.Texture | null
    shouldUseFrontSideShadows(): boolean
    getEnvMapIntensity(): number
    shouldUseFilmicLUT(): boolean
    shouldUseXRay(): boolean
}

// Helper class for asynchronously loading GLB 3D model given a URL, including draco
// decompression.
export class GlbModelLoader {
    private gltfLoader: CustomGLTFLoader;

    private dracoLoader: CustomDRACOLoader;

    constructor() {
        this.gltfLoader = new CustomGLTFLoader()

        this.dracoLoader = new CustomDRACOLoader()
        // eslint-disable-next-line i18next/no-literal-string
        this.dracoLoader.setDecoderPath('//www.gstatic.com/draco/versioned/decoders/1.4.3/')
        this.dracoLoader.preload()

        this.gltfLoader.setDRACOLoader(this.dracoLoader)
    }

    // Initiate an asynchronous download, decompression and configuration of a GLB model.
    // This function returns a promise that, upon successful resolve, delivers a 3d model
    // hierarchy rooted at a THREE.Group node and which is fully configured and ready for
    // insertion into the scene graph.
    async loadModelFromUrl(
        url: string,
        onProgress: ProgressCallback,
        onUpdate: OnUpdateCallback,
        renderEngine: RenderEngineConnector,
        glbPlacingAllowedPromise: Promise<void>,
        metrics: SceneItemMetrics): Promise<THREE.Group> {

        renderEngine.beginLoadingModel();

        return new Promise<THREE.Group>((resolve, reject) => {
            const onError = (event: ErrorEvent) => {
                renderEngine.endLoadingModel();
                reject(event);
            }

            const loadingPromise: Promise<THREE.Group> = new Promise((loadResolve) => {
                this.gltfLoader.load(url, (gltf: GLTF) => {
                    loadResolve(gltf.scene);
                },
                    onProgress,
                    onError,
                    metrics
                );
            });
            loadingPromise.then(model =>
                glbPlacingAllowedPromise.then(() => {
                        GlbModelLoader.configureModel(model, renderEngine, onUpdate, metrics);
                        renderEngine.endLoadingModel();
                        resolve(model);
                    })
            )
        });
    }

    dispose() {
        if (this.dracoLoader && this.dracoLoader.dispose) {
            this.dracoLoader.dispose()
        }

        if (this.gltfLoader) {
            this.gltfLoader.dispose()
        }
    }

    // Configure <model>, including all its children nodes, so that it is ready for
    // rendering.
    private static async configureModel(
        model: THREE.Group,
        renderEngine: RenderEngineConnector,
        onUpdate: () => void,
        metrics: SceneItemMetrics) {

        // Keep track of the minimum of all decopression start times and
        // maximum of all decompression end times. The difference is the total 
        // wall clock time time spent during draco decompression. 
        let minDecompressStartTime = Number.MAX_VALUE;
        let maxDecompressEndTime = 0;

        model.traverse((node) => {
            /* eslint-disable no-param-reassign */
            if (node.type === 'Mesh') {
                const child = node as THREE.Mesh

                // Use the customized standard material for the added customized features
                let material: THREE.MeshStandardMaterial | CustomStandardMaterial 
                    = child.material as THREE.MeshStandardMaterial
                if (renderEngine.shouldUseFilmicLUT()) {
                    const meshStandardMaterial = child.material as THREE.MeshStandardMaterial
                    material = new CustomStandardMaterial().copy(meshStandardMaterial)
                    child.material = material
                    meshStandardMaterial.dispose()

                    // enable fading out objects near camera
                    const customMaterial = material as CustomStandardMaterial
                    if (customMaterial.uniforms){
                        customMaterial.uniforms.enableXRay.value = renderEngine.shouldUseXRay()
                    }
                }

                // this could be used for future material texture overrides
                if (material.transparent /* && material.opacity < 0.4 */) {
                    child.castShadow = false
                    material.depthWrite = false
                } else {
                    child.castShadow = true
                }
                child.receiveShadow = true

                

                // This was introduced as a fix for the simplified items with no hidden faces
                material.shadowSide =
                    renderEngine.shouldUseFrontSideShadows() ? THREE.FrontSide : null

                if (material.map) {
                    // material.map.encoding = THREE.LinearEncoding
                    material.map.anisotropy = 8
                }
                if (material.emissiveMap) {
                    // material.emissiveMap.encoding = THREE.LinearEncoding
                    material.emissiveMap.anisotropy = 8
                }
                if (material.normalMap) {
                    material.normalMap.anisotropy = 8
                }
                if (material.metalnessMap) {
                    material.metalnessMap.anisotropy = 8
                }
                if (material.aoMap) {
                    material.aoMap.anisotropy = 8
                }
                if (material.alphaMap) {
                    material.alphaMap.anisotropy = 8
                }
                material.needsUpdate = true

                if (child.geometry) {
                    child.geometry.computeBoundingBox()
                    if (child.geometry.userData?.dracoDecompressStartTime) {
                        minDecompressStartTime = Math.min(minDecompressStartTime, 
                            child.geometry.userData.dracoDecompressStartTime)
                    }
                    if (child.geometry.userData?.dracoDecompressEndTime) {
                        maxDecompressEndTime = Math.max(maxDecompressEndTime, 
                            child.geometry.userData.dracoDecompressEndTime)
                    }
                }

                const envTexture = renderEngine.getEnvCubeTexture();
                const envTextureIntensity = renderEngine.getEnvMapIntensity();

                if (envTexture) {
                    material.envMap = envTexture;
                    material.envMapIntensity = envTextureIntensity;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (material.envMap as any).isCubeTexture = true
                    material.needsUpdate = true
                }

                if (renderEngine.shouldUseFilmicLUT() && envTexture) {
                    setMaterialOnBeforeCompileCallback(
                        material,
                        (shader: THREE.WebGLProgramParametersWithUniforms) => {
                            // eslint-disable-next-line i18next/no-literal-string
                            Object.defineProperty(child.material, 'envMapRotation',
                                {
                                    get: () => shader.uniforms.envMapRotation.value,
                                    set: (val) => { shader.uniforms.envMapRotation.value = val },
                                    configurable: true,
                                }
                            )
                            if ('smoothingFactor' in shader.uniforms) {
                                Object.defineProperty(child.material, `smoothingFactor`,
                                {
                                    get: () => shader.uniforms.smoothingFactor?.value,
                                    set: (val) => { shader.uniforms.smoothingFactor.value = val },
                                    configurable: true,
                                })
                            }
                        }
                    )
                }

                if (!renderEngine.shouldUseFilmicLUT()) {
                    setMaterialOnBeforeCompileCallback(
                        material,
                        ( shader: { fragmentShader: string } ) => {
                            // eslint-disable-next-line no-param-reassign
                            shader.fragmentShader = shader.fragmentShader.replace(
                            `#include <dithering_fragment>`,
                            `#include <dithering_fragment>
                            
                            gl_FragColor = LinearTosRGB( gl_FragColor );
                            
                            `
                            )
                        }
                    )
                }

                onUpdate();
            }

        });

        // we want the total wall clock time for all parallel decompression tasks.
        metrics.msDracoDecompress = maxDecompressEndTime - minDecompressStartTime
        model.matrixAutoUpdate = false
        model.castShadow = true
        model.receiveShadow = true
    }
}
