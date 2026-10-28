import * as THREE from 'three'
import Fading from 'utils/fading'

import isMobile from 'utils/isMobile'

import {
    DEFAULT_MOBILE_TEXTURE_SIZE,
    SHADING_INPAINT_MAP_ASSET_NAME,
    SHADING_MAP_ASSET_NAME,
    RESIDUAL_INPAINT_MAP_ASSET_NAME,
    RESIDUAL_MAP_ASSET_NAME,
    SEGMENTATION_ASSET_NAME,
    SEGM_INPAINT_ASSET_NAME,
    NORM_SEGM_INPAINT_ASSET_NAME,
    NORMALS_SEGM_ASSET_NAME,
} from 'Renderer/constants'
import { gvGeomModel, gvViewManager } from 'Renderer/foundation/geom_app'
import type { AssetManager } from 'Renderer/assets/AssetManager'
import type { BaseRenderEngine } from 'Renderer/rendering/BaseRenderEngine'
import type { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'
import type { AssetsList } from 'Renderer/assets/AssetsList'
import TextureHelper from 'Renderer/TextureHelper'
import WallspiceWebgl from 'Renderer/WallspiceWebgl'
import type { MultiSceneViewManager } from 'Renderer/multiview/multiscene_view_manager'
import type { ColorRepresentation } from 'Renderer/geomviewer/geom_types'
import { RenderTargetHandler, disposeMeshes } from './rendering/rendering_utils'


const fadingTime = 0.25 // seconds
const maxWallsCount = 16

type MaterialDefines = {
    MAX_WALLS_COUNT: number,
    WALL_NYU40d: number,
    INPAINT?: '',
    USE_OLD_SEGMENTATION?: '',
    SEGMENTATION_AA_DISABLED?: '',
    KERNELSIZE?: number,
}

class CompositeBackground {
    private assetManager: AssetManager
    private renderEngine: BaseRenderEngine<GeomBaseScene>
    private fullscreenQuad: THREE.Mesh | null
    private material: THREE.ShaderMaterial | null
    private textures: THREE.Texture[]
    private colorFading: Fading | null
    private fadingStartColor: THREE.Color | null
    private fadingTargetColor: THREE.Color | null
    private isReady: boolean
    private wallsIndices: number[]
    private isInpaint: boolean
    private antialiasEnabled: boolean
    private originalSegmentationMap: THREE.Texture | null
    private useOldSegmentation: boolean
    private width: number
    private height: number
    private cameraIndex: number

    constructor(assetManager: AssetManager, renderEngine: BaseRenderEngine<GeomBaseScene>,
        wallsIndices: number[], isInpaint: boolean, antialiasEnabled: boolean, cameraIndex = 0) {
        this.assetManager = assetManager
        this.renderEngine = renderEngine
        this.fullscreenQuad = null
        this.material = null
        this.textures = []
        this.colorFading = null
        this.fadingStartColor = null
        this.fadingTargetColor = null
        this.isReady = false
        this.wallsIndices = wallsIndices || []
        this.isInpaint = isInpaint
        this.antialiasEnabled = antialiasEnabled
        this.originalSegmentationMap = null
        this.useOldSegmentation = false
        this.width = 0
        this.height = 0
        this.cameraIndex = cameraIndex
    }

    // Return the full-screen quad build by createFullscreenQuad.
    getFullScreenQuad() {
        return this.fullscreenQuad
    }

    // Create a full-screen quad to host the composite background and then asynchronously
    // download the assets that are needed to render that background. Returns a promise
    // that resolves to the quad when successful. Note that the quad is ready as soon as
    // this function returns, although it will not be ready to fully render the background
    // until the asset have finished downloading.
    createFullscreenQuad(intrinsics: number[], width: number, height: number, manifest: AssetsList,
        panoTexture: THREE.Texture) {
        this.width = width
        this.height = height

        const defaultUniforms = {
            shadingMap: { value: null },
            residualMap: { value: null },
            segmentationMap: { value: null },
            panoMap: { value: null },
            alphaMap: { value: null },

            customColor: { value: new THREE.Vector4(...Array(4).fill(255)) },
            prevColor: { value: new THREE.Vector4(...Array(4).fill(255)) },
            colorAssigned: { value: 0.0 },
            colorLerp: { value: 0.0 },
            colorHasPrev: { value: 0.0 },
            wallsIndices: {
                value: [
                    ...this.wallsIndices.map((index) => index + 1), // wall indices are 1 based.
                    ...Array(maxWallsCount - this.wallsIndices.length).fill(-10),
                ],
            },
        }
        const defines: MaterialDefines = {
            MAX_WALLS_COUNT: maxWallsCount,
            WALL_NYU40d: 1,
        }
        if (this.isInpaint) {
            defines.INPAINT = ''
        }
        this.useOldSegmentation = !manifest.hasAssetName(SEGMENTATION_ASSET_NAME)
        let segmentationMapName = this.isInpaint ? SEGM_INPAINT_ASSET_NAME : SEGMENTATION_ASSET_NAME
        if (this.useOldSegmentation) {
            defines.USE_OLD_SEGMENTATION = ''
            segmentationMapName = this.isInpaint ? NORM_SEGM_INPAINT_ASSET_NAME : NORMALS_SEGM_ASSET_NAME
        }
        if (!this.antialiasEnabled) {
            defines.SEGMENTATION_AA_DISABLED = ''
        }

        this.material = new THREE.ShaderMaterial({
            uniforms: defaultUniforms,
            defines,
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform sampler2D shadingMap;
                uniform sampler2D panoMap;
                uniform sampler2D residualMap;
                uniform sampler2D segmentationMap;
                uniform sampler2D alphaMap;
                uniform int wallsIndices[MAX_WALLS_COUNT];

                uniform vec4 customColor;
                uniform vec4 prevColor;
                uniform float colorAssigned;
                uniform float colorLerp;
                uniform float colorHasPrev;

                varying vec2 vUv;

                #ifdef SEGMENTATION_AA_DISABLED
                bool planeIdxIsWall(int index) {
                    for (int i = 0; i < MAX_WALLS_COUNT; i++) {
                        if (wallsIndices[i] == index) {
                            return true;
                        }
                    }
                    return false;
                }
                #endif

                void main() {
                    vec4 shading = texture2D(shadingMap, vUv);
                    vec4 residual = texture2D(residualMap, vUv);
                    vec4 segmentation = texture2D(segmentationMap, vUv);
                    vec4 panoColor = texture2D(panoMap, vUv, -1.0); // added bias for sharper backgrounds.

                    #ifdef SEGMENTATION_AA_DISABLED
                        #ifdef USE_OLD_SEGMENTATION
                            float segmentationValue = segmentation.b;
                            int planeIdx = int((segmentationValue * 255.0) + 0.5);
                        #else
                            float segmentationValue = segmentation.r;
                            int NYU40Idx = int((segmentationValue * 255.0) + 0.5);
                        #endif

                    #endif

                    vec4 wallColor = vec4(0.0);
                    vec4 finalColor = vec4(0.0);
                    bool applyColor = segmentation.a > 0.0;
                   
                    #ifdef SEGMENTATION_AA_DISABLED
                        #ifdef USE_OLD_SEGMENTATION     
                            applyColor = planeIdxIsWall(planeIdx);
                        #else
                            applyColor = (NYU40Idx == 1);
                        #endif
                    #endif
 
                    float segmentationLerp = segmentation.a;
                    #ifdef SEGMENTATION_AA_DISABLED
                        segmentationLerp = 1.0;
                    #endif
                    if (applyColor && colorAssigned >= 1.0) {
                        if (colorLerp >= 1.0) {
                            wallColor = LinearTosRGB(vec4(customColor.rgb, 0.0));
                            finalColor = mix(panoColor, wallColor * shading + residual, segmentationLerp);
                        } else if (colorHasPrev > 0.0) {
                            wallColor = LinearTosRGB(mix(prevColor, customColor, colorLerp));
                            finalColor = mix(panoColor, wallColor * shading + residual, segmentationLerp);
                        } else {
                            wallColor = LinearTosRGB(customColor);
                            finalColor = mix(panoColor, wallColor * shading + residual, segmentationLerp);
                            finalColor = mix(panoColor, finalColor, colorLerp);
                        }
                    } else if (applyColor && colorHasPrev > 0.0) {
                        vec4 prevFinalColor = mix(panoColor, prevColor * shading + residual, segmentationLerp);
                        finalColor = mix(prevFinalColor, panoColor, colorLerp);
                    } else {
                        finalColor = panoColor;
                    }

                    gl_FragColor = vec4(finalColor.rgb, 1.0);
                    #ifdef INPAINT
                        gl_FragColor.a *= texture2D(alphaMap, vUv).r;
                    #endif
                }
            `,
            transparent: this.isInpaint,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
        })

        if (this.isInpaint) {
            Object.defineProperty(this.material, `alphaMap`, {
                set: (value) => {
                    if (!this.material) {
                        return
                    }
                    this.material.uniforms.alphaMap.value = value
                },
            })
        }

        const rect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height)
        this.fullscreenQuad = new THREE.Mesh(rect, this.material)

        /* eslint-disable no-param-reassign */
        const onMapLoad = (texture: THREE.Texture, uniformName: string) => {
            if (!this.material) {
                return
            }
            let processedTexture = texture
            if (uniformName === 'segmentationMap') {
                this.originalSegmentationMap = texture
                if (this.antialiasEnabled) {
                    const aaTexture = this.applyAntiAliasPass(texture, width, height, this.useOldSegmentation)
                    if (aaTexture) {
                        processedTexture = aaTexture
                    }
                }
            }
            const resizedTexture = this.checkAndResizeMapOnMobile(processedTexture)
            if (resizedTexture) {
                processedTexture = resizedTexture
            }
            this.material.uniforms[uniformName].value = processedTexture
            this.material.needsUpdate = true

            // Track new texture for correct disposal
            this.textures.push(processedTexture)
        }
        /* eslint-disable no-param-reassign */

        const result = new Promise((resolve, reject) => {
            Promise.all([
                this.assetManager.getTextureOrNull(
                    this.isInpaint ? SHADING_INPAINT_MAP_ASSET_NAME : SHADING_MAP_ASSET_NAME,
                ),
                this.assetManager.getTextureOrNull(
                    this.isInpaint ? RESIDUAL_INPAINT_MAP_ASSET_NAME : RESIDUAL_MAP_ASSET_NAME,
                ),
                this.assetManager.getTextureOrNull(segmentationMapName),
            ]).then(([shadingMapRecord, residualMapRecord, segmentationMapRecord]) => {
                let numMapsLoaded = 0
                const shadingMap = shadingMapRecord?.texture
                const residualMap = residualMapRecord?.texture
                const segmentationMap = segmentationMapRecord?.texture
                if (shadingMap) {
                    onMapLoad(shadingMap, `shadingMap`)
                    numMapsLoaded += 1
                }
                if (residualMap) {
                    onMapLoad(residualMap, `residualMap`)
                    numMapsLoaded += 1
                }
                if (segmentationMap) {
                    onMapLoad(segmentationMap, `segmentationMap`)
                    numMapsLoaded += 1
                }

                if (numMapsLoaded === 3) {
                    this.isReady = true

                    const initialWallColor = gvGeomModel()?.retrieveWallColor()
                    if (initialWallColor) {
                        this.setColor(initialWallColor, true)
                    }

                    resolve(this.fullscreenQuad)
                } else {
                    reject()
                }
            })
        })

        this.material.uniforms.panoMap.value = panoTexture
        this.fullscreenQuad.name = `background image`

        return result
    }

    // eslint-disable-next-line class-methods-use-this
    checkAndResizeMapOnMobile(texture: THREE.Texture | null) {
        if (!texture) {
            return null
        }
        let resultTex = texture
        const resizeTexture = isMobile()
        if (resizeTexture) {
            const textureHelper = new TextureHelper()
            const newWidth = Math.round(0.5 * (texture.image && texture.image.width)) || DEFAULT_MOBILE_TEXTURE_SIZE
            const newHeight = Math.round(0.5 * (texture.image && texture.image.height)) || DEFAULT_MOBILE_TEXTURE_SIZE
            const resized = textureHelper.getResizedCopy(texture, newWidth, newHeight)
            if (resized) {
                resultTex = resized
                texture.dispose()
                textureHelper.dispose()
            }
        }
        return resultTex
    }

    applyAAEnable(shouldEnable: boolean) {
        if (this.antialiasEnabled === shouldEnable) {
            return
        }
        this.antialiasEnabled = shouldEnable
        if (this.material) {
            if (this.antialiasEnabled) {
                delete this.material.defines.SEGMENTATION_AA_DISABLED
            } else {
                this.material.defines.SEGMENTATION_AA_DISABLED = ''
            }
            if (this.originalSegmentationMap) {
                const newSegmentationMap = this.antialiasEnabled
                    ? this.applyAntiAliasPass(
                        this.originalSegmentationMap,
                        this.width,
                        this.height,
                        this.useOldSegmentation,
                    )
                    : this.originalSegmentationMap
                const resizedSegmentationMap = this.checkAndResizeMapOnMobile(newSegmentationMap)
                this.material.uniforms.segmentationMap.value = resizedSegmentationMap

                // Track new texture for correct disposal
                if (resizedSegmentationMap) {
                    this.textures.push(resizedSegmentationMap)
                }
            }
            this.material.needsUpdate = true
        }
    }

    startInterpolation(targetColor: THREE.Color | null) {
        if (!this.isReady || !this.material) {
            return
        }
        const currentTarget = this.material.uniforms.customColor.value
        const isSameTarget = targetColor && currentTarget.x === targetColor.r &&
            currentTarget.y === targetColor.g &&
            currentTarget.z === targetColor.b
        if (this.colorFading && this.material.uniforms.colorAssigned.value > 0.0 && isSameTarget) {
            return
        }

        if (this.colorFading) {
            this.colorFading.stop()
        }

        if (this.material.uniforms.colorAssigned.value > 0.0) {
            this.material.uniforms.prevColor.value.copy(this.material.uniforms.customColor.value)
            this.material.uniforms.colorHasPrev.value = 1.0
        } else {
            this.material.uniforms.colorHasPrev.value = 0.0
        }

        if (targetColor) {
            this.material.uniforms.customColor.value.set(...targetColor.toArray(), 255)
            this.material.uniforms.colorAssigned.value = 1.0
        } else {
            this.material.uniforms.colorAssigned.value = 0.0
        }
        this.material.uniforms.colorLerp.value = 0.0

        this.colorFading = new Fading(
            fadingTime,
            (t) => {
                if (!this.material) {
                    return
                }
                this.material.uniforms.colorLerp.value = t
                this.renderEngine?.setDirty()
            },
            () => {
                if (!this.material) {
                    return
                }
                this.colorFading = null
                this.material.uniforms.colorHasPrev.value = 0.0
            },
        )

        this.renderEngine?.setDirty()
    }

    setColor(color: ColorRepresentation | THREE.Color | undefined | null, interpolate = false) {
        if (!this.isReady) {
            return
        }
        if (!color) {
            this.unsetColor(interpolate)
            return
        }
        const targetColor = new THREE.Color()
        if (Array.isArray(color)) {
            const hexColor = `#${color.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`;
            targetColor.set(hexColor)
        } else if (typeof color === 'string') {
            targetColor.set(color)
        } else if (color instanceof THREE.Color) {
            targetColor.copy(color)
        }

        if (interpolate) {
            this.startInterpolation(targetColor)
        } else if (this.material) {
            // indices in the segmentation are 1 based
            this.material.uniforms.customColor.value.set(...targetColor.toArray(), 255)
            this.material.uniforms.colorLerp.value = 1.0
            this.material.uniforms.colorAssigned.value = 1.0
            this.renderEngine?.setDirty()
        }
    }

    unsetColor(interpolate: boolean) {
        if (!this.isReady) {
            return
        }
        if (interpolate) {
            this.startInterpolation(null)
        } else if (this.material) {
            this.material.uniforms.customColor.value.set(...Array(4).fill(255))
            this.material.uniforms.colorAssigned.value = 0.0
            this.renderEngine?.setDirty()
        }
    }

    applyAntiAliasPass(texture: THREE.Texture, width: number, height: number, useOldSegmentation: boolean) {
        if (!this.fullscreenQuad) {
            return null
        }
        const threeRenderer = this.renderEngine?.getThreeRenderer()
        if (!threeRenderer) {
            return null
        }
        // Create antialiased material
        // This material consists of multiple steps as explained below
        // - initially, an intersection layer is generated from wall areas and wall mask (G and R).
        // - a 3x3 dilate pass is applied over the SegmentationResult mask, let's call the output D3x3.
        // - in parallel, another 5x5 dilate is pass is applied over the SegmentationResult, let's call it D5x5.
        // - edgeMask1 is generated by applying bitwise XOR of SegmentationResult and D3x3.
        // - edgeMask2 also is generated by applying bitwise XOR of D3x3 and D5x5.
        // - the final result is generate by applying the following equation:
        //   (SegmentationResult) + (180/255.0) * edgeMask1 + (100/255.0) * edgeMask2
        const uniforms = {
            segmentationMap: { value: texture },
            WALL_NYU40d: { value: 1 },
            width: { value: width },
            height: { value: height },
            wallsIndices: {
                value: [
                    ...this.wallsIndices.map((index) => index + 1), // wall indices are 1 based.
                    ...Array(maxWallsCount - this.wallsIndices.length).fill(-10),
                ],
            },
            d3x3Kernel: { value: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
            d5x5Kernel: { value: [0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0] },
        }
        const defines: MaterialDefines = {
            MAX_WALLS_COUNT: maxWallsCount,
            WALL_NYU40d: 1,
            KERNELSIZE: 25,
        }
        if (useOldSegmentation) {
            defines.USE_OLD_SEGMENTATION = ''
        }
        const vertexShader = /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
        `
        const fragmentShader = /* glsl */ `
            uniform sampler2D segmentationMap;
            uniform float width;
            uniform float height;
            uniform int wallsIndices[MAX_WALLS_COUNT];
            uniform int d3x3Kernel[KERNELSIZE];
            uniform int d5x5Kernel[KERNELSIZE];

            varying vec2 vUv;

            bool planeIdxIsWall(int index) {
                for (int i = 0; i < MAX_WALLS_COUNT; i++) {
                    if (wallsIndices[i] == index) {
                        return true;
                    }
                }
                return false;
            }

            void main() {
                float D3x3 = 0.0;
                float D5x5 = 0.0;
                vec4 segmentation0x0;
                float SegmentationResult0x0 = 0.0;
                // by default, texture wrap setting is clamp to edge,
                // allowing to handle negative indices automatically
                for (int j = -2; j <= 2; j++) {
                    for (int i = -2; i <= 2; i++) {
                        // Read the mask values
                        vec2 texOffset = vUv + vec2(ivec2(j, i)) / vec2(width, height);
                        vec4 segmentationMaskValues = texture2D(segmentationMap, vec2(texOffset.x, 1.0 - texOffset.y));

                        float SegmentationResult = 0.0;
                        #ifdef USE_OLD_SEGMENTATION
                            // Use the plane index from the segmentation mask
                            int planeIdx = int((segmentationMaskValues.b * 255.0) + 0.5);
                            if (planeIdxIsWall(planeIdx)) {
                                SegmentationResult = 1.0;
                                if (j == 0 && i == 0) {
                                    // Save the value of the actual current segmentation fragment
                                    SegmentationResult0x0 = 1.0;
                                    segmentation0x0 = segmentationMaskValues;        
                                }
                            }
                        #else
                            // Value of the segmentation map r channel to check if it is wall.
                            int NYU40Idx = int((segmentationMaskValues.r * 255.0) + 0.5);
                            if (NYU40Idx == WALL_NYU40d) {
                                SegmentationResult = 1.0;
                                if (j == 0 && i == 0) {
                                    // Save the value of the actual current segmentation fragment
                                    SegmentationResult0x0 = 1.0;
                                    segmentation0x0 = segmentationMaskValues;        
                                }
                            }
                        #endif

                        // Calculate dialation values of both 3x3 and 5x5 kernels
                        int kernel3x3 = d3x3Kernel[(i + 2) + ((j + 2) * 5)];
                        int kernel5x5 = d5x5Kernel[(i + 2) + ((j + 2) * 5)];
                        D3x3 = max(D3x3, SegmentationResult * float(kernel3x3));
                        D5x5 = max(D5x5, SegmentationResult * float(kernel5x5));
                    }
                }

                // Calculate the XOR operation values of the calculated masks
                float edgeMask1 = mod(SegmentationResult0x0 + D3x3, 2.0);
                float edgeMask2 = mod(D3x3 + D5x5, 2.0);

                // Calculate the mask alpha value
                float maskAlpha = SegmentationResult0x0 + (180.0 / 255.0) * edgeMask1 + (100.0 / 255.0) * edgeMask2;

                // Append the mask alpha to the segmentation mask instead of the dilated 
                // object mask already existing in the alpha channel
                gl_FragColor = vec4(segmentation0x0.r, segmentation0x0.g, segmentation0x0.b, maskAlpha);
            }
        `
        this.fullscreenQuad.material = new THREE.ShaderMaterial({
            defines,
            uniforms,
            vertexShader,
            fragmentShader,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
        })

        const aaRT = new THREE.WebGLRenderTarget(width, height)
        aaRT.texture.generateMipmaps = false
        aaRT.texture.magFilter = THREE.NearestFilter
        aaRT.texture.minFilter = THREE.NearestFilter

        const currentRenderTarget = threeRenderer.getRenderTarget()
        const currentQuadVisibility = this.fullscreenQuad.visible
        threeRenderer.setRenderTarget(aaRT)
        this.fullscreenQuad.visible = true

        const viewManager = gvViewManager()
        if (!viewManager) {
            return null
        }
        // Composite background used only in legacy rooms.
        const multisceneViewManager = viewManager as MultiSceneViewManager
        const camera = multisceneViewManager.getCameraByIndex(this.cameraIndex)?.getThreeCamera() ||
            this.renderEngine.getStandbyCamera()
        threeRenderer.render(this.fullscreenQuad, camera)

        threeRenderer.setRenderTarget(currentRenderTarget)

        // Handle the disposing of the render target.
        const rtHandler = new RenderTargetHandler()
        rtHandler.addRenderTarget(aaRT)

        this.fullscreenQuad.visible = currentQuadVisibility
        if (this.material) {
            this.fullscreenQuad.material = this.material
        }

        return aaRT.texture
    }

    dispose() {
        this.originalSegmentationMap?.dispose()
        this.material?.dispose()
        this.textures.forEach(texture => { texture.dispose() })

        disposeMeshes(this.fullscreenQuad)

        this.originalSegmentationMap = null
        this.material = null
        this.fullscreenQuad = null
        this.textures = []
    }
}

export default CompositeBackground
