import * as THREE from 'three';
import WallspiceWebgl from 'Renderer/WallspiceWebgl';
import { NYUD40_COLORS } from 'Renderer/constants';
import { PolygonType } from 'Renderer/assets/Types';
import { Polygon3 } from 'Renderer/geometry/Polygon3';
import { gvCurrentCamera } from 'Renderer/foundation/geom_app';

// Returns a mesh initialized to render the supplied
// normals segmentation map for debugging purposes.
export function buildWallMaskMesh(
    intrinsics: number[],
    width: number,
    height: number,
    segsTex: THREE.DataTexture,
    depth: number,
) {
    const material = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
            }`,
        fragmentShader: /* glsl */ `
            uniform sampler2D segs;
            varying vec2 vUv;
            precision lowp float;
            void main() {
                // This is the color map per plane index produced by this shader
                // 0: dark gray.
                // 1: gray-ish blue.
                // 2: forest green.
                // 3: hot pink.
                // 4: orange.
                // 5: mint green.
                // 6: light-brown.            
                vec4 normalsSegmenation = texture2D( segs, vUv );
                float wallIndex = floor((normalsSegmenation.r * 255.0) + 0.5);
                float r = mod(wallIndex * 61.0, 256.0);
                float g = mod(wallIndex * 97.0, 256.0);
                float b = mod(wallIndex * 139.0, 256.0);
                gl_FragColor = vec4(r / 255.0, g / 255.0, b / 255.0, 0.5);
            }`,
        uniforms: {
            segs: { value: segsTex }
        },
        depthWrite: false,
        transparent: true,
        colorWrite: true,
        side: THREE.DoubleSide,
        depthFunc: THREE.AlwaysDepth,
    })

    const intrinsicRect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height, depth)
    const intrinsicMesh = new THREE.Mesh(intrinsicRect, material)
    intrinsicMesh.name = `nomrals segmentation visualizer`
    return intrinsicMesh
}

// Returns a mesh initialized to render the supplied
// semantic segmentation map for debugging purposes.
export function buildSemanticSegmentationMesh(
    intrinsics: number[],
    width: number,
    height: number,
    segsTex: THREE.DataTexture,
    depth: number,
) {
    const material = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
            }`,
        fragmentShader: /* glsl */ `
            // A constant list of colors is used to map the IDs to the desired color.
            uniform vec3 NYUD40Colors[NYUD40_CLASSES_LENGTH];
            uniform sampler2D segs;
            varying vec2 vUv;
            precision lowp float;

            // Dynamic indices are not supported in webgl1, i.e. Safari
            vec3 getSemanticColor(int index) {
                #pragma unroll_loop_start
                for (int i = 0; i < NYUD40_CLASSES_LENGTH; i++) {
                    if (i == index) {
                        return NYUD40Colors[i];
                    }
                }
                #pragma unroll_loop_end
                return vec3(0.0, 0.0, 0.0);
            }

            void main() {
                vec4 semanticSegmenation = texture2D( segs, vUv );
                int NYUD40Idx = int((semanticSegmenation.r * 255.0) + 0.5);
                gl_FragColor = vec4(getSemanticColor(NYUD40Idx), 1.0);
            }`,
        uniforms: {
            NYUD40Colors: { value: NYUD40_COLORS.map(color => new THREE.Vector3(
                ...color.map(channel => channel / 255))) },
            segs: { value: segsTex },
        },
        defines: {
            NYUD40_CLASSES_LENGTH: NYUD40_COLORS.length
        },
        depthWrite: false,
        colorWrite: true,
        side: THREE.DoubleSide,
        opacity: 1.0,
        depthFunc: THREE.AlwaysDepth,
    })

    const intrinsicRect = WallspiceWebgl.intrinsicsRectGeo(intrinsics, width, height, depth)
    const intrinsicMesh = new THREE.Mesh(intrinsicRect, material)
    intrinsicMesh.name = `semantic segmentation visualizer`
    return intrinsicMesh
}

// Returns a geometry group initialized to render the
// supplied plane polygons for debugging purposes.
export function buildPlanePolygonsMesh(planePolygons: Array<PolygonType>) {
    // Initialize plane polygons group.
    const planePolygonsAsMeshes = new THREE.Group()
    planePolygonsAsMeshes.name = 'plane polygons mesh'
    planePolygons
        // Transform the polygon vertices into world space using Polygon3.
        .map(polygon => ({ ...Polygon3.CreateFromManifestPolygon(polygon), id: polygon.id }))
        .forEach(polygon => {
            // Initialize the mesh geometry from the plane's vertices.
            const vertexBuffer = new Float32Array(polygon.vertices.map(v => v.toArray()).flat())
            const geometry = new THREE.BufferGeometry()
            geometry.setIndex(polygon.indices || [])
            geometry.setAttribute('position', new THREE.BufferAttribute(vertexBuffer, 3))
            geometry.computeVertexNormals()

            // Create the polygon mesh using the initialized geometry and a simple material.
            const mesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }))
            planePolygonsAsMeshes.add(mesh)
            mesh.castShadow = true

            // Set the polygon's ID on the mesh for easier reference to polygon data.
            mesh.userData.polygonID = polygon.id
        })
    return planePolygonsAsMeshes
}

export function buildTexturedPolygons(planePolygons: Array<PolygonType>, wallTexture: THREE.Texture) {
        // Initialize plane polygons group.
        const planePolygonsAsMeshes = new THREE.Group()
        planePolygonsAsMeshes.name = 'plane polygons mesh'
        planePolygons
            // Transform the polygon vertices into world space using Polygon3.
            .map(polygon => ({ ...Polygon3.CreateFromManifestPolygon(polygon), id: polygon.id }))
            .forEach(polygon => {
                // Initialize the mesh geometry from the plane's vertices.
                const vertexBuffer = new Float32Array(polygon.vertices.map(v => v.toArray()).flat())
                const geometry = new THREE.BufferGeometry()
                geometry.setIndex(polygon.indices || [])
                geometry.setAttribute('position', new THREE.BufferAttribute(vertexBuffer, 3))

                const camera = gvCurrentCamera()
                const width = wallTexture.image ? wallTexture.image.width : 1
                const height = wallTexture.image ? wallTexture.image.height : 1
                if (camera) {
                    const uvs = polygon.vertices.map(v => {
                        const inPixels = camera.worldToScreenFloat({ x: v.x, y: v.y, z: v.z})
                        return [
                            inPixels.x / width,
                            inPixels.y / height,
                        ]
                    }).flat()
                    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
                }

                geometry.computeVertexNormals()

                // Create the polygon mesh using the initialized geometry and a simple material.
                const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D map;
                        varying vec2 vUv;
                        void main() {
                            gl_FragColor = texture2D(map, vUv);
                        }
                    `,
                    uniforms: {
                        map: { value: wallTexture },
                    }
                }))

                planePolygonsAsMeshes.add(mesh)
                mesh.castShadow = true

                // Set the polygon's ID on the mesh for easier reference to polygon data.
                mesh.userData.polygonID = polygon.id
            })
        return planePolygonsAsMeshes
}