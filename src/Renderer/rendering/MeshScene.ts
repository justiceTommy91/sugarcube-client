import * as THREE from 'three'
import Fading from 'utils/fading'
import { GeomBaseScene } from 'Renderer/rendering/GeomBaseScene'

import type { ColorRepresentation, PlaneType } from 'Renderer/geomviewer/geom_types'
import type { SceneSampler } from 'Renderer/rendering/SceneSampler'
import { zip } from 'Renderer/utils/utils'
import { NotificationInfo, ViewerStateUpdateNotification } from 'Renderer/geomviewer/geom_notifications'
import { GrandCentral } from 'Renderer/GrandCentral'
import { NOTIFY_VIEWER_STATE_UPDATE } from 'Renderer/geomviewer/geom_constants'
import { Point2, Point3, uniformlySamplePolygon } from 'Renderer/geometry'
import { PolygonData } from 'Renderer/assets/Types'
import { InitialPosInfo } from 'Renderer/positioning/positioning_types'
import { Location3 } from 'Renderer/geomviewer/geom_types'
import { RenderItem3D } from 'Renderer/model/RenderItem3D'
import FurnitureItem3D from 'Renderer/model/FurnitureItem3D'
import StaticSceneGraph from 'Renderer/StaticSceneGraph'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import { stoppableTraverse } from 'Renderer/utils/modelUtils'
import { COLOR_ID_SUBOBJECT_LAYER } from 'Renderer/constants'
import { renderCubemap } from 'Renderer/rendering/envmap_rendering_utils'
import { gvCurrentCamera, gvCurrentScene, gvCurrentSettings, gvRenderLibrary } from '../foundation/geom_app'
import { PolyBasedSceneSampler } from './PolyBasedSceneSampler'
import { EnvMapsSet, isMesh, isMeshStandardMaterial } from './rendering_types'
import { DefaultAssetManager, disposeMeshes } from './rendering_utils'

export interface PlaneNormals {
    [key: string]: [ THREE.Vector3, number ]
}

export class MeshScene extends GeomBaseScene {
    private threeScene: THREE.Scene
    private staticSceneGraph: StaticSceneGraph | null = null
    private roomMeshGroup: THREE.Object3D | null = null
    private planeNormals: PlaneNormals = {}

    // Keep a samples of the floor polygon for item placement.
    private floorSamples: Array<Point3> = []
    private wallSamples: Map<number, Array<Point3>> = new Map()

    protected defaultWallColor: THREE.Color | null = null

    constructor() {
        super()
        this.threeScene = new THREE.Scene();
        this.onCameraStateChange = this.onCameraStateChange.bind(this)
    }

    public setRoomMeshGroup(roomMeshGroup: THREE.Object3D) {
        if (this.roomMeshGroup) {
            this.threeScene.remove(this.roomMeshGroup)
            disposeMeshes(this.roomMeshGroup)
            this.roomMeshGroup = null
            this.staticSceneGraph = null
        }

        this.staticSceneGraph = new StaticSceneGraph(roomMeshGroup)
        this.roomMeshGroup = roomMeshGroup
        this.threeScene.add(this.roomMeshGroup)
    }

    public getRoomMeshGroup(): THREE.Object3D | null {
        return this.roomMeshGroup
    }

    // Store the normals for each plane mesh according to the corresponding plane. 
    // This is mostly so we can do back-face culling tests on the entire planeMesh
    // without having to check every triangle in the mesh; we know that the entire mesh
    // corresponds to a well-defined plane.
    public associatePlaneNormals(planeMeshes: THREE.Mesh[], planes: PlaneType[]) { 
        // get the normal for each plane.
        this.planeNormals = zip(planes, planeMeshes)
            .filter(([plane]) => plane.class === 'wall' || plane.class === 'ceiling')
            .reduce((acc, [plane, mesh]) =>
                ({ ...acc, [mesh.uuid]: [new THREE.Vector3().fromArray(plane.rot[2]), plane.d] }), {}) || {}
    }
    
    public override setPolygonData(polygonData: PolygonData): void {
        super.setPolygonData(polygonData)

        // also sample the floor polygon for item placement.
        const polygons = polygonData.plane_polygons
        if (!Array.isArray(polygons)) {
            return
        }
        const floor = polygons.find(poly => poly.class === 'floor')

        if (floor && floor.parameters.transformedVertices) {
            this.floorSamples = uniformlySamplePolygon(floor, 10)
        }
        polygons.filter(poly => poly.class === `wall`).forEach((wallPoly) => {
            if (wallPoly.parameters.transformedVertices) {
                this.wallSamples.set(wallPoly.id, uniformlySamplePolygon(wallPoly, 10))
            }
        })
    }

    public setVisibilityRugBacksideMeshes(visible: boolean): void {
        Array.from(this.renderItems.values())
            .filter((item: RenderItem3D) => item instanceof FurnitureItem3D && item.getIsRug())
            .map(rug => rug.getObject())
            .forEach((object: THREE.Object3D | undefined) => {
                object?.traverse((child) => {
                    if (child.userData.isBacksideMesh) {
                        child.visible = visible
                    }
                })
            })
    }

    public hideViewObstructingGeometries(camera: THREE.PerspectiveCamera): void {
        const p = camera.position

        Object.entries(this.planeNormals).forEach(([uuid, [n, d]]) => {
            const planeMesh = this.threeScene.getObjectByProperty(`uuid`, uuid)
            if (planeMesh instanceof THREE.Mesh) {
                const dist = n.dot(p) + d
                // back-face culling against a point on the plane.
                // if the dot product is positive, the point is in front of the plane.
                const isFrontFacing = dist > 0 
                // Also check if camera lies close to the wall-plane itself. This culls
                // orthogonal walls that are close to the camera.
                const isOrthogonal = Math.abs(dist) < 0.1
                const visibility = isFrontFacing && !isOrthogonal
                // Hide all the children visually but keep the wall for casting shadows.
                planeMesh.traverse(obj => {
                    if (!(obj instanceof THREE.Mesh) || !(obj.material instanceof THREE.Material)) {
                        return
                    }
                    if (!obj.material.stencilWrite && !obj.layers.isEnabled(COLOR_ID_SUBOBJECT_LAYER)) {
                        obj.material.colorWrite = visibility
                        obj.material.depthWrite = visibility
                    } else {
                        obj.visible = visibility
                    }
                })
            }
        })
    }
    
    getObjectsScene: () => THREE.Scene | null = () => this.threeScene

    public setDefaultWallColor(color: THREE.Color) {
        this.defaultWallColor = color
    }

    // When passed color is null/undefined, it means "restore color to the original".
    public setWallColor(color: ColorRepresentation | undefined): void {
        if (!this.roomMeshGroup) {
            return
        }

        const targetColor = new THREE.Color()
        if (Array.isArray(color)) {
            const r = color[0] > 1.0 ? color[0] / 255.0 : color[0]
            const g = color[1] > 1.0 ? color[1] / 255.0 : color[1]
            const b = color[2] > 1.0 ? color[2] / 255.0 : color[2]
            targetColor.setRGB(r, g, b)
        } else if (typeof color === 'string') {
            targetColor.set(color)
        } else if (color instanceof THREE.Color) {
            targetColor.copy(color)
        } else if (color === undefined && this.defaultWallColor) {
            targetColor.copy(this.defaultWallColor)
        }

        const wallObjects = this.staticSceneGraph?.getWallsObjects()
        const aWall = wallObjects?.[0]
        if (!isMesh(aWall) || !isMeshStandardMaterial(aWall?.material)) {
            return
        }
        const existingColor = aWall.material.map
            ? aWall.userData.currentColor
            : aWall.material.color.clone().convertLinearToSRGB()
        const prevColor = existingColor || this.defaultWallColor

        const fadingTime = 0.25
        // eslint-disable-next-line no-new
        new Fading(
            fadingTime,
            (t) => {
                const currentColor = new THREE.Color().lerpColors(prevColor, targetColor, t)
                const currentMap = new THREE.DataTexture(new Uint8Array([
                    currentColor.r * 255,
                    currentColor.g * 255,
                    currentColor.b * 255,
                    255
                ]), 1, 1)
                currentMap.colorSpace = gvCurrentSettings()?.debugSettings?.disableLightingEffects
                    ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
                currentMap.needsUpdate = true

                wallObjects?.forEach(object => {
                    const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial
                    if (material.map && material.map.uuid !== DefaultAssetManager.getWhiteTexture().uuid) {
                        material.map = currentMap
                    } else {
                        material.color.set(currentColor.clone().convertSRGBToLinear())
                    }
                    material.needsUpdate = true
                    object.userData.currentColor = currentColor
                    gvCurrentScene()?.setIsDirty(true)
                })
            },
            () => {},
        )
    }

    public onItemLoadedAndPositioned(renderItemId: string): void {
        const renderItem = this.getRenderItem(renderItemId)
        if (renderItem && this.isItemShouldBeHidden(renderItem)) {
            this.hideViewBlockingItem(renderItem)
        }
    }

    public findPlaceableFloorPos(): InitialPosInfo | null {
        const polygons = this.getPolygonData()?.plane_polygons
        if (!Array.isArray(polygons)) {
            return null
        }
        const floor = polygons.find(poly => poly.class === 'floor')
        if (!floor) {
            return null
        }

        if (this.floorSamples.length === 0) {
            return null
        }

        const camera = gvCurrentCamera()
        if (!camera) {
            return null
        }

        const loc = new Point2(0, 0)
        for (const sample of this.floorSamples) {
            const screenPoint = camera.worldToScreenFloat(sample)
            const relPoint = this.toRelativeCoords(screenPoint?.x || 0, screenPoint?.y || 0)
            const floorIntersection = this.sceneSampler.sampleFloor(loc.set(relPoint[0], relPoint[1]))

            const isBlockingPlacing = (itemId: string) => {
                const item = this.getRenderItem(itemId)
                return item?.shouldBlockFloorPlacing() ?? false
            }
            const hitsBlockingObject = this.sceneSampler.getObjectIdAtPointUsingBbox(loc.set(relPoint[0], relPoint[1]),
                false, isBlockingPlacing)

            if (floorIntersection && !hitsBlockingObject) {
                const position3D: Location3 = {
                    bindTo: `${floor.id}`,
                    localPos: {
                        x: sample.x,
                        y: sample.y,
                        z: sample.z
                    }
                }
                return {
                    pos2D: [screenPoint?.x || 0, screenPoint?.y || 0],
                    pos3D: position3D,
                }
            }
        }

        // fallback to the first sample (should be center of the room)
        const sample = this.floorSamples[0]
        const screenPoint = gvCurrentCamera()?.worldToScreenFloat(sample)
        return {
            pos2D: [screenPoint?.x || 0, screenPoint?.y || 0],
            pos3D: { 
                bindTo: `${floor.id}`,
                localPos: {
                    x: sample.x,
                    y: sample.y,
                    z: sample.z
                }
            }
        }
    }

    protected override findPlaceableWallPositions() {
        const result = super.findPlaceableWallPositions()
        if (this.wallSamples.size > 0 && result.positions3D.length === 0) {
            const camera = gvCurrentCamera()
            if (!camera) {
                return result
            }
            const loc = new Point2(0, 0)
            for (const wallSamples of this.wallSamples) {
                const [wallId, samples] = wallSamples
                for (const sample of samples) {
                    const screenPoint = camera.worldToScreenFloat(sample)
                    const relPoint = this.toRelativeCoords(screenPoint?.x || 0, screenPoint?.y || 0)
                    const wallIntersection = this.sceneSampler.sampleWalls(loc.set(relPoint[0], relPoint[1]))

                    if (wallIntersection && wallIntersection.plane.id === wallId) {
                        const location3D: Location3 = {
                            bindTo: `${wallId}`,
                            localPos: {
                                x: sample.x,
                                y: sample.y,
                                z: sample.z
                            }
                        }
                        result.positions2D.push([screenPoint?.x || 0, screenPoint?.y || 0])
                        result.positions3D.push(location3D)
                    }
                }
            }
        }
        return result
    }

    public override createSceneSampler(): SceneSampler {
        return new PolyBasedSceneSampler(this)
    }

    override onActivate() {
        super.onActivate()
        GrandCentral.getDispatcher().addObserver(NOTIFY_VIEWER_STATE_UPDATE, this.onCameraStateChange)
    }

    override onDeactivate() {
        super.onDeactivate()
        GrandCentral.getDispatcher().removeObserver(this.onCameraStateChange)
    }

    override onCanvasResize(screenSize: THREE.Vector2): void {
        this.setDimensions(screenSize.width, screenSize.height)
        super.onCanvasResize(screenSize)
    }

    private onCameraStateChange(info: NotificationInfo) {
        const state = info as ViewerStateUpdateNotification
        if (state.payload.stateInfo === 'CameraEnterStaticView' ||
            state.payload.stateInfo === 'OrbitMoveEnd' ||
            state.payload.stateInfo === 'FocusTransitionFinished'
        ) {
            this.refreshViewBlockingItemsVisibility(true)
            this.renderItems.forEach((item: RenderItem3D) => {
                if (item.isGhostItem()) {
                    return
                }
                item.onCurrentCameraChange()
            })
            this.refreshStackableStaticProperties()
        }
    }

    public setVAOsettings(
        lightIntesity: number,
        darkestIntensity: number,
        contrast: number,
        affectDirectDiffuse: boolean,
        affectIndirectDiffuse: boolean,
        affectDirectSpecular: boolean,
        affectIndirectSpecular: boolean,
    ) {
        this.roomMeshGroup?.traverse(obj => {
            if (obj instanceof THREE.Mesh && obj.material instanceof CustomStandardMaterial) {
                if (obj.material.uniforms){
                    obj.material.uniforms.vAOintensity.value = lightIntesity
                    obj.material.uniforms.vAOdarkest.value = darkestIntensity
                    obj.material.uniforms.vAOreach.value = contrast
                    obj.material.uniforms.vAOdirectDiffuse.value = affectDirectDiffuse
                    obj.material.uniforms.vAOindirectDiffuse.value = affectIndirectDiffuse
                    obj.material.uniforms.vAOdirectSpecular.value = affectDirectSpecular
                    obj.material.uniforms.vAOindirectSpecular.value = affectIndirectSpecular
                }
            }
        })      
    }

    public setLightsIntensities(directionalLightIntensities: number[], pointLightIntensities: number[],
        spotLightIntensities: number[], areaLightIntensities: number[]) {
        if (directionalLightIntensities.length)
            this.staticSceneGraph?.getDirectionalLights()
                .forEach((light, i) => { light.intensity = directionalLightIntensities[i] })
        if (pointLightIntensities.length)
            this.staticSceneGraph?.getPointLights()
                .forEach((light, i) => { light.intensity = pointLightIntensities[i] })
        if (spotLightIntensities.length)
            this.staticSceneGraph?.getSpotLights()
                .forEach((light, i) => { light.intensity = spotLightIntensities[i] })
        if (areaLightIntensities.length)   
            this.staticSceneGraph?.getAreaLights()
                .forEach((light, i) => { light.intensity = areaLightIntensities[i] })
    }

    public setLocallyGeneratedLightsVisibility(visible: boolean) {
        if (!gvCurrentSettings()?.viewerSettings?.isRoomBuilderScene || !this.staticSceneGraph) {
            return
        }

        const generatedLights =  [
            ...this.staticSceneGraph.getDirectionalLights(),
            ...this.staticSceneGraph.getAreaLights(),
        ]
        generatedLights.forEach(light => {
            light.visible = visible
        })

        this.getObjectsScene()?.traverse(obj => {
            const mesh = obj as THREE.Mesh
            const material = mesh.material as CustomStandardMaterial
            if (material?.type !== `CustomStandardMaterial`) {
                return
            }

            if (visible) {
                material.defines.SHADOWMAP_TYPE_PCSS = ''
            } else {
                delete material.defines.SHADOWMAP_TYPE_PCSS
            }
        })

        // Update the generated environment map to match the light settings.
        this.bakeEnvMap()
    }

    public setShadowDynamicProperties(blockerSearchRadiusMultiplier: number, pcfFilterRadiusMultiplier: number) {
        this.getObjectsScene()?.traverse(obj => {
            const mesh = obj as THREE.Mesh
            const material = mesh.material as CustomStandardMaterial
            if (material?.type === `CustomStandardMaterial`) {
                material.uniforms.blockerSearchRadiusMultiplier.value = blockerSearchRadiusMultiplier
                material.uniforms.pcfFilterRadiusMultiplier.value = pcfFilterRadiusMultiplier
            }
        })
    }

    public setShadowStaticProperties(poissonKernelSize: number) {
        this.getObjectsScene()?.traverse(obj => {
            const mesh = obj as THREE.Mesh
            const material = mesh.material as CustomStandardMaterial
            if (material?.type === `CustomStandardMaterial`) {
                material.updatePoissonKernelSize(poissonKernelSize)
            }
        })
    }

    public setSunLightIntensity(intensity: number) {
        this.staticSceneGraph?.getDirectionalLights().forEach(light => {
            light.intensity = intensity
        })
    }

    public setSunBounceIntensities(areaLightIntensities: number[], skyLightIntensity: number) {
        if (areaLightIntensities.length) {
            this.staticSceneGraph?.getAreaLights().forEach((light, i) => {
                light.intensity = areaLightIntensities[i]
            })
        }
        this.staticSceneGraph?.getHemisphereLights().forEach(light => {
            light.intensity = skyLightIntensity
        })
    }

    public translateSunLightSource(deltaX: number, deltaY: number, deltaZ: number) {
        this.staticSceneGraph?.getDirectionalLights().forEach(light => {
            light.translateX(deltaX)
            light.translateY(deltaY)
            light.translateZ(deltaZ)
        })
    }

    public setEnvmapSaturationDampingIntensity(intensity: number) {
        const ceilingMeshes = this.staticSceneGraph?.getCeilingsObjects()
        this.getObjectsScene()?.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof CustomStandardMaterial
                && !ceilingMeshes?.includes(child) && child.material.uniforms.satMin) {
                    child.material.uniforms.satMin.value = 1.0 - intensity
            }
        })
    }

    public bakeEnvMap() {
        const renderer = gvRenderLibrary()?.renderer
        const objectsScene = this.getObjectsScene()
        const staticSceneGraph = this.getStaticSceneGraph()
        if (!renderer || !objectsScene || !staticSceneGraph) {
            return
        }

        const envMapRenderTarget = renderCubemap(staticSceneGraph, objectsScene, renderer)
        const envMapTex = envMapRenderTarget.texture
        const envMapsSet = { ... this.envMapsSet } as EnvMapsSet
        envMapsSet.generatedDefault = envMapTex
        envMapsSet.roomHasRenderedEquirectangular = true
        this.setEnvMapsSet(envMapsSet)
    }

    public getStaticSceneGraph() {
        return this.staticSceneGraph
    }

    public trimBounceLights() {
        // A temporary method to clear extra created area lights to achieve
        // similar behavior to room planner.
        const windowsProxyObjects = this.staticSceneGraph?.getWindowsProxyObjects()
        const glassDoorsProxyObjects = this.staticSceneGraph?.getGlassDoorsProxyObjects()
        const transparentWallElements = [...windowsProxyObjects || [], ...glassDoorsProxyObjects || []]
        const activeAreaLightsCount = transparentWallElements.length
        this.staticSceneGraph?.getAreaLights().forEach((areaLight, index) => {
            if (index < activeAreaLightsCount) return
            areaLight.parent?.remove(areaLight)
        })
    }

    protected override hasWallThickness(): boolean {
        const scene = this.getObjectsScene()
        let hasWallThickness = false
        if (scene) {
          stoppableTraverse(scene, (child) => {
            const extraName = child.userData?.name
            if (extraName && (typeof extraName === 'string') && extraName.includes(`[thickness]`)) {
              hasWallThickness = true
              return false
            }
            return true
          })
        }
        return hasWallThickness
    }
}
