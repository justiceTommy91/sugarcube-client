import * as THREE from 'three'

import type { PoleOfInaccessibilitySearchResults } from 'Renderer/PinsManager'

import {
    COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR,
} from 'Renderer/constants'

export class PinsManagerDebugRenderer {
    private scene: THREE.Scene

    private pointsMaterial: THREE.ShaderMaterial

    private resolution = new THREE.Vector2()

    constructor() {
        this.scene = new THREE.Scene()
        this.pointsMaterial = this.createPointsMaterial()
    }

    createPointsMaterial(): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            vertexShader: /* glsl */ `
                uniform float size;
                uniform vec2 resolution;

                void main() {
                    gl_Position = vec4(-1.0 + 2.0 * float(XY_SCALE) * position.xy / resolution, 1.0, 1.0);
                    gl_PointSize = size;
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 diffuse;
                void main() {
                    gl_FragColor = vec4(diffuse, 1.0);
                }
            `,
            uniforms: {
                resolution: { value: this.resolution },
                diffuse: { value: new THREE.Color(0x00FF00) },
                size: { value: 3.0 },
            },
            defines: {
                XY_SCALE: 1.0 / COLOR_ID_RENDERER_RT_SIZE_REDUCE_FACTOR,
            },
            depthTest: false,
        })
    }

    setResolution(width: number, height: number) {
        this.resolution.set(width, height)
    }

    setDebugData(data: PoleOfInaccessibilitySearchResults) {
        if (!data) {
            return
        }
        this.scene.clear()

        // extract vertices x,y pairs as a flat array
        const vertices: Array<number> = []
        data.forEach(({ points }) => {
            vertices.push(...points.flatMap(point => [point.x, point.y, 1.0]))
        })

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute(`position`, new THREE.Float32BufferAttribute(vertices, 3))

        const material = this.pointsMaterial.clone()
        const points = new THREE.Points(geometry, material)
        points.frustumCulled = false

        this.scene.add(points)
    }

    render(threeRenderer: THREE.WebGLRenderer, camera: THREE.Camera) {
        if (!threeRenderer || !camera) {
            return
        }
        threeRenderer.render(this.scene, camera)
    }
}