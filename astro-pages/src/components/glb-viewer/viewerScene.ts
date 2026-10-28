import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment'

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.4.3/'

const BASIS_TRANSCODER_PATH = '/basis/'

export type LoadOptions = {
    onProgress?: (loaded: number, total: number) => void
}

export type ViewerScene = {
    load(source: string | File, options?: LoadOptions): Promise<void>
    dispose(): void
}

export type ViewerSceneOptions = {
    preserveDrawingBuffer?: boolean
}

export function createViewerScene(canvas: HTMLCanvasElement, options?: ViewerSceneOptions): ViewerScene {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: options?.preserveDrawingBuffer ?? false,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf5f5f5)

    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6)
    scene.add(hemi)

    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(5, 10, 7.5)
    scene.add(directional)

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.01, 1000)
    camera.position.set(2, 2, 2)

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH)

    const ktx2Loader = new KTX2Loader()
    ktx2Loader.setTranscoderPath(BASIS_TRANSCODER_PATH)
    ktx2Loader.detectSupport(renderer)

    const gltfLoader = new GLTFLoader()
    gltfLoader.setDRACOLoader(dracoLoader)
    gltfLoader.setKTX2Loader(ktx2Loader)

    let currentModel: THREE.Object3D | null = null
    let currentObjectUrl: string | null = null
    let disposed = false

    function disposeObject3D(root: THREE.Object3D) {
        root.traverse((node) => {
            const mesh = node as THREE.Mesh
            if (mesh.isMesh) {
                mesh.geometry?.dispose()
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
                for (const material of materials) {
                    if (material) {
                        for (const key of Object.keys(material)) {
                            const value = (material as unknown as Record<string, unknown>)[key]
                            if (value instanceof THREE.Texture) {
                                value.dispose()
                            }
                        }
                        material.dispose()
                    }
                }
            }
        })
    }

    function clearCurrentModel() {
        if (currentModel) {
            scene.remove(currentModel)
            disposeObject3D(currentModel)
            currentModel = null
        }
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl)
            currentObjectUrl = null
        }
    }

    function frameModelInCamera(model: THREE.Object3D) {
        const box = new THREE.Box3().setFromObject(model)
        if (box.isEmpty()) return

        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const radius = Math.max(size.x, size.y, size.z) * 0.5

        const fovRad = (camera.fov * Math.PI) / 180
        const distance = radius / Math.sin(fovRad * 0.5) + radius * 0.5

        const direction = new THREE.Vector3(1, 0.7, 1).normalize()
        camera.position.copy(center).add(direction.multiplyScalar(distance))
        camera.near = Math.max(0.01, distance / 100)
        camera.far = distance * 100
        camera.updateProjectionMatrix()

        controls.target.copy(center)
        controls.update()
    }

    function handleResize() {
        if (disposed) return
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        if (width === 0 || height === 0) return
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
    }

    window.addEventListener('resize', handleResize)

    let rafId = 0
    function animate() {
        if (disposed) return
        controls.update()
        renderer.render(scene, camera)
        rafId = requestAnimationFrame(animate)
    }
    animate()

    return {
        async load(source, loadOptions) {
            const url = typeof source === 'string' ? source : URL.createObjectURL(source)
            const isObjectUrl = typeof source !== 'string'

            try {
                const gltf = await new Promise<Awaited<ReturnType<typeof gltfLoader.loadAsync>>>((resolve, reject) => {
                    gltfLoader.load(
                        url,
                        (loaded) => resolve(loaded),
                        (event) => {
                            if (loadOptions?.onProgress && event.total > 0) {
                                loadOptions.onProgress(event.loaded, event.total)
                            }
                        },
                        (error) => reject(error),
                    )
                })

                if (disposed) return

                clearCurrentModel()
                currentModel = gltf.scene
                if (isObjectUrl) {
                    currentObjectUrl = url
                }
                scene.add(currentModel)
                frameModelInCamera(currentModel)
            } catch (err) {
                if (isObjectUrl) {
                    URL.revokeObjectURL(url)
                }
                throw err
            }
        },
        dispose() {
            if (disposed) return
            disposed = true
            cancelAnimationFrame(rafId)
            window.removeEventListener('resize', handleResize)
            clearCurrentModel()
            controls.dispose()
            dracoLoader.dispose()
            ktx2Loader.dispose()
            pmrem.dispose()
            renderer.dispose()
        },
    }
}
