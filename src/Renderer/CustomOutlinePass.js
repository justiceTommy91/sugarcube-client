/* eslint-disable no-underscore-dangle */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */

import * as THREE from 'three'

import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { DEFAULT_THREE_NATIVE_LAYER } from 'Renderer/constants'
import { BakedShadowPlane } from './ShadowBaker'

class CustomOutlinePass extends OutlinePass {

    constructor(resolution, scene, camera, selectedObjects, occlusionScene) {
        super(resolution, scene, camera, selectedObjects)
        this.occlusionScene = occlusionScene

        this.selectedEdgeColor = new THREE.Color(1.0, 0.0, 0.0)
        this.selectedEdgeStrength = 3.0

        this.sceneOriginalVisibility = new Map()
        // To make objects visible/invisible we use this auxiliar material instance instead of changing the material visibility property.
        // This is to be able to set visibility of meshes independently. If we'd set the material properties directly, changes would propagete
        // to all meshes sharing the same material instance.
        this.auxInvisibleMaterial = new THREE.MeshBasicMaterial()
        this.auxInvisibleMaterial.visible = false

        this.separableBlurMaterial1 = this.getSeperableBlurMaterial1()
        this.separableBlurMaterial2 = this.getSeperableBlurMaterial2()
    }

    setScene(scene, occlusionScene) {
        this.renderScene = scene;
        this.occlusionScene = occlusionScene;
    }

    setCamera(camera) {
        this.renderCamera = camera
    }

    render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {
        if (this.selectedObjects.length > 0) {
            // Enable all camera layers as static stackables are on a different layer
            this.renderCamera.layers.enableAll()

            // eslint-disable-next-line no-underscore-dangle
            renderer.getClearColor(this._oldClearColor)
            this.oldClearAlpha = renderer.getClearAlpha()
            const oldAutoClear = renderer.autoClear

            renderer.autoClear = false

            if ( maskActive ) renderer.state.buffers.stencil.setTest( false )

            renderer.setClearColor( 0xffff00, 1 )

            // Make selected objects invisible
            this.changeVisibilityOfSelectedObjects( false )

            renderer.setRenderTarget( this.renderTargetDepthBuffer )
            renderer.clear()

            if (this.occlusionScene) {
                this.occlusionScene.traverse((object) => {
                    if (object.isMesh && object.depthPackMaterial) {
                        object.originalMaterial = object.material
                        object.material = object.depthPackMaterial
                    }
                })
                renderer.render(this.occlusionScene, this.renderCamera)
                this.occlusionScene.traverse((object) => {
                    if (object.isMesh && object.depthPackMaterial && object.originalMaterial) {
                        object.material = object.originalMaterial
                        delete(object.originalMaterial)
                    }
                })
            }

            const currentBackground = this.renderScene.background
            this.renderScene.background = null

            // 1. Draw Non Selected objects in the depth buffer
            this.renderScene.overrideMaterial = this.depthMaterial
            renderer.render( this.renderScene, this.renderCamera )


            // Make selected objects visible
            this.changeVisibilityOfSelectedObjects( true )
            // eslint-disable-next-line no-underscore-dangle
            this._visibilityCache.clear()

            // Update Texture Matrix for Depth compare
            this.updateTextureMatrix()

            // Make non selected objects invisible, and draw only the selected objects, by comparing the depth buffer of non selected objects
            this.changeVisibilityOfNonSelectedObjects( false )
            this.renderScene.overrideMaterial = null

            this.prepareMaskMaterial.uniforms.cameraNearFar.value.set( this.renderCamera.near, this.renderCamera.far )
            this.prepareMaskMaterial.uniforms.depthTexture.value = this.renderTargetDepthBuffer.texture
            this.prepareMaskMaterial.uniforms.textureMatrix.value = this.textureMatrix
            this.setupObjectMaskPass()

            renderer.setRenderTarget( this.renderTargetMaskBuffer )
            renderer.clear()
            renderer.render( this.renderScene, this.renderCamera )

            this.clearObjectMaskPass()
            this.changeVisibilityOfNonSelectedObjects( true )
            // eslint-disable-next-line no-underscore-dangle
            this._visibilityCache.clear()

            this.renderScene.background = currentBackground

            this.tempPulseColor1.copy( this.visibleEdgeColor )
            this.tempPulseColor2.copy( this.hiddenEdgeColor )

            if ( this.pulsePeriod > 0 ) {
                const scalar = ( 1 + 0.25 ) / 2 + Math.cos( performance.now() * 0.01 / this.pulsePeriod ) * ( 1.0 - 0.25 ) / 2
                this.tempPulseColor1.multiplyScalar( scalar )
                this.tempPulseColor2.multiplyScalar( scalar )
            }

            // 2. Apply Edge Detection Pass
            this.fsQuad.material = this.edgeDetectionMaterial
            this.edgeDetectionMaterial.uniforms.maskTexture.value = this.renderTargetMaskBuffer.texture
            this.edgeDetectionMaterial.uniforms.texSize.value.set( this.renderTargetMaskBuffer.width, this.renderTargetMaskBuffer.height )
            this.edgeDetectionMaterial.uniforms.visibleEdgeColor.value = this.tempPulseColor1
            this.edgeDetectionMaterial.uniforms.hiddenEdgeColor.value = this.tempPulseColor2
            this.edgeDetectionMaterial.uniforms.selectedEdgeColor.value = this.selectedEdgeColor
            renderer.setRenderTarget( this.renderTargetEdgeBuffer1 )
            renderer.clear()
            this.fsQuad.render( renderer )

            // 3. Apply Blur Pass to make the outline thicker
            this.fsQuad.material = this.separableBlurMaterial1
            this.separableBlurMaterial1.uniforms.texSize.value.set( this.renderTargetEdgeBuffer1.width, this.renderTargetEdgeBuffer1.height )
            this.separableBlurMaterial1.uniforms.colorTexture.value = this.renderTargetEdgeBuffer1.texture
            this.separableBlurMaterial1.uniforms.direction.value = OutlinePass.BlurDirectionX.clone().multiplyScalar(0.1)
            this.separableBlurMaterial1.uniforms.kernelRadius.value = this.edgeThickness
            renderer.setRenderTarget( this.renderTargetBlurBuffer1 )
            renderer.clear()
            this.fsQuad.render( renderer )
            
            this.separableBlurMaterial1.uniforms.colorTexture.value = this.renderTargetBlurBuffer1.texture
            this.separableBlurMaterial1.uniforms.direction.value = OutlinePass.BlurDirectionY.clone().multiplyScalar(0.1)
            renderer.setRenderTarget( this.renderTargetEdgeBuffer1 )
            renderer.clear()
            this.fsQuad.render( renderer )

            // 4. Blend the outline with the original scene
            this.fsQuad.material = this.overlayMaterial
            this.overlayMaterial.uniforms.maskTexture.value = this.renderTargetMaskBuffer.texture
            this.overlayMaterial.uniforms.edgeTexture1.value = this.renderTargetEdgeBuffer1.texture
            this.overlayMaterial.uniforms.edgeTexture2.value = this.renderTargetEdgeBuffer2.texture
            this.overlayMaterial.uniforms.patternTexture.value = this.patternTexture
            this.overlayMaterial.uniforms.edgeStrength.value =  this.edgeStrength
            this.overlayMaterial.uniforms.selectedEdgeStrength.value = this.selectedEdgeStrength
            this.overlayMaterial.uniforms.edgeGlow.value = this.edgeGlow
            this.overlayMaterial.uniforms.usePatternTexture.value = this.usePatternTexture

            if ( maskActive ) renderer.state.buffers.stencil.setTest( true )

            renderer.setRenderTarget( readBuffer )
            this.fsQuad.render( renderer )

            // eslint-disable-next-line no-underscore-dangle
            renderer.setClearColor( this._oldClearColor, this.oldClearAlpha )
            renderer.autoClear = oldAutoClear

            // Restore default camera state
            this.renderCamera.layers.set(DEFAULT_THREE_NATIVE_LAYER)
        }

        if ( this.renderToScreen ) {
            this.fsQuad.material = this.materialCopy
            this.copyUniforms.tDiffuse.value = readBuffer.texture
            renderer.setRenderTarget( null )
            this.fsQuad.render( renderer )
        }
    }

    getSeperableBlurMaterial1(){
        return new THREE.ShaderMaterial( {
            uniforms: {
                'colorTexture': { value: null },
                'texSize': { value: new THREE.Vector2( 0.5, 0.5 ) },
                'direction': { value: new THREE.Vector2( 0.5, 0.5 ) },
                'kernelRadius': { value: 1.0 }
            },

            vertexShader:

                /* glsl */ `
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }`,

            fragmentShader:
                /* glsl */`
                #include <common>
                varying vec2 vUv;
                uniform sampler2D colorTexture;
                uniform vec2 texSize;
                uniform vec2 direction;
                uniform float kernelRadius;

                const float MAX_KERNEL_RADIUS = 64.0;

                vec4 maxAlpha(vec4 a, vec4 b) {
                    return (b.a > a.a) ? b : a;
                }

                void main() {
                    vec2 invSize = 1.0 / texSize;
                    vec2 delta = direction * invSize;
                    vec2 uvOffset = delta;
                    float sum = 0.0;
                    float weight = 0.0;
                    vec4 color = vec4(0.0);
                
                    for (float i = 1.0; i <= MAX_KERNEL_RADIUS; i++) {
                        if (i > kernelRadius) break;

                        vec4 sample1 = texture2D(colorTexture, vUv + uvOffset);
                        vec4 sample2 = texture2D(colorTexture, vUv - uvOffset);
                        color = maxAlpha(color, sample1);
                        color = maxAlpha(color, sample2);

                        uvOffset += delta;
                    }
                    float alpha = smoothstep(0.0, 0.1, color.a);
                    gl_FragColor = vec4(color.rgb, color.a * alpha);
                }`
        } );
    }

    getSeperableBlurMaterial2(){ 
        return this.getSeperableBlurMaterial1()
    }

    getPrepareMaskMaterial() {

        return new THREE.ShaderMaterial( {

            uniforms: {
                'depthTexture': { value: null },
                'cameraNearFar': { value: new THREE.Vector2( 0.5, 0.5 ) },
                'textureMatrix': { value: null },
                'selected': { value: 0 }
            },

            vertexShader:
                /* glsl */ `
                #include <morphtarget_pars_vertex>
                #include <skinning_pars_vertex>

                varying vec4 projTexCoord;
                varying vec4 vPosition;
                uniform mat4 textureMatrix;

                void main() {

                    #include <skinbase_vertex>
                    #include <begin_vertex>
                    #include <morphtarget_vertex>
                    #include <skinning_vertex>
                    #include <project_vertex>

                    vPosition = mvPosition;
                    vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
                    projTexCoord = textureMatrix * worldPosition;

                }`,

            fragmentShader:
                /* glsl */ `
                #include <packing>
                varying vec4 vPosition;
                varying vec4 projTexCoord;
                uniform sampler2D depthTexture;
                uniform vec2 cameraNearFar;
                uniform int selected;

                void main() {
                    float depth = unpackRGBAToDepth(texture2DProj( depthTexture, projTexCoord ));
                    float viewZ = - DEPTH_TO_VIEW_Z( depth, cameraNearFar.x, cameraNearFar.y );
                    float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;
                    float selectedFlag = selected > 0 ? 1.0 : 0.0;
                    gl_FragColor = vec4(0.0, depthTest, selectedFlag, 1.0);
                }`

        } )

    }

    getEdgeDetectionMaterial() {

        return new THREE.ShaderMaterial( {

            uniforms: {
                'maskTexture': { value: null },
                'texSize': { value: new THREE.Vector2( 0.5, 0.5 ) },
                'visibleEdgeColor': { value: new THREE.Vector3( 1.0, 1.0, 1.0 ) },
                'hiddenEdgeColor': { value: new THREE.Vector3( 1.0, 1.0, 1.0 ) },
                'selectedEdgeColor': { value: new THREE.Vector3( 1.0, 1.0, 1.0 ) },
            },

            vertexShader:
                /* glsl */`
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }`,

            fragmentShader:
                /* glsl */ `
                varying vec2 vUv;

                uniform sampler2D maskTexture;
                uniform vec2 texSize;
                uniform vec3 visibleEdgeColor;
                uniform vec3 hiddenEdgeColor;
                uniform vec3 selectedEdgeColor;

                void main() {
                    vec2 invSize = 1.0 / texSize;
                    vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);
                    vec4 c1 = texture2D( maskTexture, vUv + uvOffset.xy);
                    vec4 c2 = texture2D( maskTexture, vUv - uvOffset.xy);
                    vec4 c3 = texture2D( maskTexture, vUv + uvOffset.yw);
                    vec4 c4 = texture2D( maskTexture, vUv - uvOffset.yw);

                    vec3 diff1 = (c1.rgb - c2.rgb)*0.5;
                    vec3 diff2 = (c3.rgb - c4.rgb)*0.5;
                    float d = length(vec2(diff1.r, diff2.r));

                    bool notAll = !all(bvec4(c1.r > 0.0, c2.r > 0.0, c3.r > 0.0, c4.r > 0.0));

                    bool anySelected = any(bvec4(c1.b > 0.0, c2.b > 0.0, c3.b > 0.0, c4.b > 0.0));
                    float s = anySelected && notAll ? 1.0 : 0.0;

                    float a1 = min(c1.g, c2.g);
                    float a2 = min(c3.g, c4.g);
                    float visibilityFactor = min(a1, a2);

                    vec3 visibleColor = s > 0.5 ? selectedEdgeColor : visibleEdgeColor;
                    vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visibleColor : hiddenEdgeColor;
                    gl_FragColor = LinearTosRGB(vec4(edgeColor, 1.0)) * vec4(d);
                }`
        } )
    }

    getOverlayMaterial() {

        return new THREE.ShaderMaterial( {
            uniforms: {
                'maskTexture': { value: null },
                'edgeTexture1': { value: null },
                'edgeTexture2': { value: null },
                'patternTexture': { value: null },
                'edgeStrength': { value: 1.0 },
                'selectedEdgeStrength': { value: 1.0 },
                'edgeGlow': { value: 1.0 },
                'usePatternTexture': { value: 0.0 }
            },

            vertexShader:
                /* glsl */ `
                #include <morphtarget_pars_vertex>
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }`,

            fragmentShader:
                /* glsl */ `
                varying vec2 vUv;

                uniform sampler2D maskTexture;
                uniform sampler2D edgeTexture1;
                uniform sampler2D edgeTexture2;
                uniform sampler2D patternTexture;
                uniform float edgeStrength;
                uniform float selectedEdgeStrength;
                uniform float edgeGlow;
                uniform bool usePatternTexture;

                vec4 maximizeBrightness(vec4 color) {
                    float maxComponent = max(max(color.r, color.g), color.b);
                    if (maxComponent == 0.0) {
                        return color;
                    }
                    return color / maxComponent;
                }

                void main() {
                    vec4 edgeValue1 = texture2D(edgeTexture1, vUv);
                    vec4 maskColor = texture2D(maskTexture, vUv);
                    vec4 edgeValue = maximizeBrightness(edgeValue1);
                    float selectedFlag = maskColor.b;
                    float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.0;
                    vec4 finalColor = edgeStrength * maskColor.r * edgeValue;
                    gl_FragColor = finalColor;
                }`,
            blending: THREE.NormalBlending,
            depthTest: false,
            depthWrite: false,
            transparent: true
        } )

    }

    setupObjectMaskPass() {
        for (let i = 0; i < this.selectedObjects.length; i += 1) {
            const selectedObject = this.selectedObjects[i]
            if (selectedObject) {
                const isSelected = selectedObject.userData.isSelected
                selectedObject.traverse((object) => {
                    if (object.material && !object.originalMaterial) {
                        if (object instanceof BakedShadowPlane) {
                            object.toggleVisibilityOff();
                        } else if (!this._visibilityCache.has(object)) {
                            object.originalMaterial = object.material
                            object.material = this.prepareMaskMaterial
                            object.material.uniforms.selected.value = isSelected ? 1 : 0
                            // threejs clones the texture, we need to reuse the existing one
                            object.material.uniforms.depthTexture.value = this.prepareMaskMaterial.uniforms.depthTexture.value
                        }
                    }
                })
            }
        }
    }

    clearObjectMaskPass() {
        for (let i = 0; i < this.selectedObjects.length; i += 1) {
            const selectedObject = this.selectedObjects[i]
            if (selectedObject) {
                selectedObject.traverse((object) => {
                    if (object instanceof BakedShadowPlane) {
                        object.toggleVisibilityOn();
                    } else if (!this._visibilityCache.has(object) && object.originalMaterial) {
                        object.material = object.originalMaterial
                        delete(object.originalMaterial)
                    }
                })
            }
        }
    }

    changeVisibilityOfSelectedObjects(bVisible) {
        const cache = this._visibilityCache

        for (let i = 0; i < this.selectedObjects.length; i += 1) {
            const selectedObject = this.selectedObjects[i]
            if (selectedObject) {
                selectedObject.traverse((object) => {
                    if (!object.isMesh) {
                        return
                    }
                    if (!bVisible) {
                        if (!cache.has(object)) {
                            cache.set(object, object.material)
                        }
                        object.material = this.auxInvisibleMaterial
                    } else {
                        object.material = cache.get(object)
                    }
                })
            }
        }
    }

    changeVisibilityOfNonSelectedObjects( bVisible ) {
        const cache = this._visibilityCache
        const selectedMeshes = []

        for (let i = 0; i < this.selectedObjects.length; i += 1) {
            const selectedObject = this.selectedObjects[i]
            if (selectedObject) {
                selectedObject.traverse((object) => {
                    if (!object.isPointMesh && !object.isLine2 && object.isMesh && !selectedMeshes.includes(object)) {
                        selectedMeshes.push(object)
                    }
                })
            }
        }

        this.renderScene.traverse((object) => {
            if (object.isMesh || object.isSprite) {
                // only meshes and sprites are supported by OutlinePass
                if (!selectedMeshes.includes(object)) {
                    if (!bVisible) {
                        if (!cache.has(object)) {
                            cache.set(object, object.material)
                        }
                        // Make visibility object invisible with invisible material assignment.
                        object.material = this.auxInvisibleMaterial
                    } else if (cache.has(object)) {
                        object.material = cache.get(object)
                    }
                }
            } else if (object.isPoints || object.isLine) {
                // the visibilty of points and lines is always set to false in order to
                // not affect the outline computation
                if (bVisible) {
                    object.material = cache.get(object) // restore
                } else {
                    cache.set(object, object.material)
                    object.material = this.auxInvisibleMaterial
                }
            }
        })
    }
}

export default CustomOutlinePass

/* eslint-enable no-param-reassign */
/* eslint-enable class-methods-use-this */
/* eslint-enable no-underscore-dangle */
