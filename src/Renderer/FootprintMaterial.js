import * as THREE from 'three'

import { RUG_THICKNESS } from 'Renderer/constants'

class FootprintMaterial extends THREE.ShaderMaterial {

    constructor(floorPlane, occlusionTexture, resolution) {
        super()

        this.isFootprintMaterial = true

        this.depthWrite = false
        this.depthTest = false
        this.colorWrite = false
        this.stencilWrite = true
        this.stencilFunc = THREE.AlwaysStencilFunc
        this.stencilRef = 2
        this.stencilFail = THREE.ReplaceStencilOp
        this.stencilZFail = THREE.ReplaceStencilOp
        this.stencilZPass = THREE.ReplaceStencilOp

        const rugSurfacePlane = floorPlane.clone()
        rugSurfacePlane.constant += RUG_THICKNESS

        // if occlusionTexture was loaded via WebAsm (e.g. on iPad, Safari), it won't be flipped vertically,
        // while threejs expects it to be flipped. In WallspiceWebgl it is masked by using intrinsic mesh
        // which uses coordinate system which is also upside-down, here we need to flip it "manually" in the shader.
        let manualFlipY = 0
        if (occlusionTexture && !occlusionTexture.flipY) {
            manualFlipY = 1
        }

        this.uniforms = {
            occlusionMap: { value: occlusionTexture },
            resolution: { value: resolution },
            manualFlipY: { value: manualFlipY },
            clipPlane: { value: new THREE.Vector4(rugSurfacePlane.normal.x, rugSurfacePlane.normal.y,
                rugSurfacePlane.normal.z, rugSurfacePlane.constant) },
        }

        this.vertexShader = /* glsl */ `
            uniform vec4 clipPlane;
            varying vec3 vWorldPosition;

            void main() {
                vec4 transformed = vec4(position.xyz, 1.0);

                vec4 worldPosition = modelMatrix * transformed;
                vWorldPosition = worldPosition.xyz;

                vec4 projectedOnPlane = vec4(worldPosition.xyz + clipPlane.xyz * (clipPlane.w - dot(clipPlane.xyz,
                    worldPosition.xyz)), 1.0);
                gl_Position = projectionMatrix * viewMatrix * projectedOnPlane;
            }
        `

        this.fragmentShader = /* glsl */ `
            uniform vec4 clipPlane;
            uniform sampler2D occlusionMap;
            uniform vec2 resolution;
            uniform int manualFlipY;

            varying vec3 vWorldPosition;

            void main() {
                if (dot(vWorldPosition, clipPlane.xyz) > clipPlane.w) {
                    discard;
                }

                // Salma Jiddi: depth_occlusion_0: The ALPHA channel's most significant bit 
                // contains the inverse floor mask where:
                // False: Areas that were segmented as floor.
                // True: All other regions.
                vec2 fragCoord = gl_FragCoord.xy;
                if (manualFlipY != 0) {
                    fragCoord.y = resolution.y - fragCoord.y;
                }
                float occlusionAlpha = texture2D(occlusionMap, fragCoord / resolution).a;
                if (occlusionAlpha > 0.0) {
                    //gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                    discard;
                } else {
                    gl_FragColor = vec4(0.0, 0.5, 0.5, 1.0);
                }
            }
        `
    }
}

export default FootprintMaterial