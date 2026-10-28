import CustomStandardMaterial from "Renderer/CustomStandardMaterial";
import PropertyManager from "Renderer/utils/property_manager";
import * as THREE from 'three'
import { GeomBaseScene } from "./GeomBaseScene";

export default class FlatRenderer {
    private stateCtx: PropertyManager = new PropertyManager()
    private aiCanvas = document.createElement('canvas')
    private scene: GeomBaseScene
    private renderer: THREE.WebGLRenderer
    private renderCallback: (canvas: HTMLCanvasElement) => void
    private envMapOverrides: Array<{ material: CustomStandardMaterial; original: THREE.Texture | null }> = []

    constructor(
        renderCallback: (canvas: HTMLCanvasElement) => void,
        scene: GeomBaseScene,
        renderer: THREE.WebGLRenderer) {
        this.renderCallback = renderCallback
        this.scene = scene
        this.renderer = renderer
    }

    public render(camera: THREE.Camera, width: number, height: number): HTMLCanvasElement | undefined {
        if (!this.renderer || !this.scene) {
            return undefined
        }
        this.adjustLighting(camera)

        const dynamicMeasurements = this.scene?.getDynamicMeasurements()
        if (dynamicMeasurements) {
            this.stateCtx.applyPropertyChange(dynamicMeasurements.getRootObject(), `visible`, false)
        }

        const roomDimensions = this.scene?.getVisualRoomDimensions()
        if (roomDimensions) {
            this.stateCtx.applyPropertyChange(roomDimensions.getRootObject(), `visible`, false)
        }

        this.aiCanvas.width = width
        this.aiCanvas.height = height

        // Sync the camera projection to the target canvas aspect ratio so the
        // rendered scene isn't squeezed/stretched when the viewport aspect
        // differs from width/height (e.g. viewport is 4:3 but canvas is 16:9).
        const perspCamera = camera instanceof THREE.PerspectiveCamera ? camera : null
        const prevAspect = perspCamera?.aspect
        if (perspCamera) {
            perspCamera.aspect = width / height
            perspCamera.updateProjectionMatrix()
        }

        // Use a neutral gray clear color so the server receives a flat-lit image
        // with an opaque gray backdrop instead of a transparent PNG.
        const prevClearColor = this.renderer.getClearColor(new THREE.Color())
        const prevClearAlpha = this.renderer.getClearAlpha()
        this.renderer.setClearColor(0xcccccc, 1)

        // Remove the scene background (e.g. environment map) so Three.js does not
        // render an opaque backdrop on top of the gray clear.
        const objectsScene = this.scene.getObjectsScene()
        const prevBackground = objectsScene?.background ?? null
        if (objectsScene) {
            objectsScene.background = null
        }

        this.renderCallback(this.aiCanvas)

        if (objectsScene) {
            objectsScene.background = prevBackground
        }
        this.renderer.setClearColor(prevClearColor, prevClearAlpha)
        if (perspCamera && prevAspect !== undefined) {
            perspCamera.aspect = prevAspect
            perspCamera.updateProjectionMatrix()
        }
        this.stateCtx.revertChanges()
        this.envMapOverrides.forEach(({ material, original }) => { material.envMap = original })
        this.envMapOverrides.length = 0

        return this.aiCanvas
    }

    private adjustLighting(camera: THREE.Camera) {
        const scene = this.scene.getObjectsScene()
        if (!scene || !this.renderer) {
            return
        }

        this.stateCtx.applyPropertyChange(this.renderer.shadowMap, `enabled`, false)

        // Disable shadows and scene lights globally.
        scene.traverse(obj => {
            this.stateCtx.applyPropertyChange(obj, `castShadow`, false)
            this.stateCtx.applyPropertyChange(obj, `receiveShadow`, false)

            if (obj instanceof THREE.Light) {
                this.stateCtx.applyPropertyChange(obj, `intensity`, 0.0)
            }
        })

        scene.children.forEach(child => {
            const isRoomShell = `geomagicalScene` in child.userData && child.userData.geomagicalScene === 0
            child.traverse(obj => {

                if (obj instanceof THREE.Mesh) {
                    if (isRoomShell) {
                        const material = obj.material as CustomStandardMaterial
                        const useFixedEnv = material.uniforms?.useFixedEnvMapColor
                        if (useFixedEnv) {
                            this.stateCtx.applyPropertyChange(useFixedEnv, `value`, 1)
                        }

                        const fixedEnvColor = material.uniforms?.fixedEnvMapColor
                        if (fixedEnvColor) {
                            this.stateCtx.applyPropertyChange(fixedEnvColor, `value`, new THREE.Color(1.2, 1.2, 1.2))
                        }
                        return
                    }

                    const material = obj.material as CustomStandardMaterial

                    const lightCookieEnabled = material.uniforms?.uCookieEnabled
                    if (lightCookieEnabled) {
                        this.stateCtx.applyPropertyChange(lightCookieEnabled, `value`, false)
                    }

                    this.stateCtx.applyPropertyChange(material, `disableDirectSpecular`, false)

                    this.stateCtx.applyPropertyChange(material, `envMapIntensity`, 0.0)
                    this.stateCtx.applyPropertyChange(material, `emissiveIntensity`, 0.0)

                    const vignetteAOEnabled = material.uniforms?.uVignetteAOEnabled
                    if (vignetteAOEnabled) {
                        this.stateCtx.applyPropertyChange(vignetteAOEnabled, `value`, false)
                    }

                    const useFixedEnv = material.uniforms?.useFixedEnvMapColor
                    if (useFixedEnv) {
                        this.stateCtx.applyPropertyChange(useFixedEnv, `value`, 1)
                    }

                    const fixedEnvColor = material.uniforms?.fixedEnvMapColor
                    if (fixedEnvColor) {
                        this.stateCtx.applyPropertyChange(fixedEnvColor, `value`, new THREE.Color(1.2, 1.2, 1.2))
                    }
                }
            })
        })

        const WHITE = new THREE.Color(0xFFFFFF)
        const directionalLightLeft = new THREE.DirectionalLight(WHITE, 1.0)
        const directionalLightRight = new THREE.DirectionalLight(WHITE, 1.0)
        directionalLightLeft.intensity = 0.5
        directionalLightRight.intensity = 0.5

        this.stateCtx.applyMethod(camera, `add`, directionalLightLeft)
        this.stateCtx.applyMethod(camera, `add`, directionalLightRight)

        directionalLightLeft.position.set(-1, 0, 0)
        directionalLightRight.position.set(1, 0, 0)
        directionalLightRight.target.position.set(0, 0.2, 0)
        directionalLightLeft.target.position.set(0, 0.2, 0)
    }

}
