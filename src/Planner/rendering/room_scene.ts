/* eslint-disable no-continue */
/* eslint-disable class-methods-use-this */
import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

import { WasmInterop } from '@geomagical/sugarcube-shared'

import type {
  WallElementInfo,
  PlannerSettings,
  LightaGenerationSettings,
  WallElementAxisDraggingState,
} from 'Planner/planner_types'
import PropertyManager from 'Renderer/utils/property_manager'
import { PlaneType } from 'Renderer/geomviewer/geom_types'
import { WallsGraph } from 'Planner/editor/walls_graph'
import { WallsGraphView } from 'Planner/rendering/walls_graph_view'
import { WallElementMeasurements } from 'Planner/rendering/wall_element_measurements'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import { RoomMesh } from 'Planner/rendering/room_mesh'
import { EPSILON } from 'Renderer/geometry/config'
import { patchThreeJSPbrShaders } from 'Renderer/renderingLibrary/ThreejsLibrary/ThreejsGraphicsLibrary'
import { 
  WALL_ELEMENT_DRAGGING_AXIS_STATE_ENABLED,
  WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED
} from 'Planner/planner_constants'
import type { RoomTemplate } from 'Planner/room_template/room_template'
import { ToneMapType } from 'Renderer/geomviewer'
import type { CompositionItem } from 'Planner/composition/composition_item'
import StaticSceneGraph from 'Renderer/StaticSceneGraph'
import {
  adjustSceneLighting,
  centerSceneAtOriginForEnvMapRender,
  showAllRoomGeometryOnly,
} from 'Renderer/rendering/envmap_rendering_utils'
import RefreshablePromise from 'Renderer/utils/refreshable_promise'
import {
  createSkyLightSource,
  createSunLightSource,
  refreshBouncelightForScene,
  refreshSunlightForScene,
  refreshSunlightShadowProps,
  WARM_YELLOW,
} from 'Renderer/rendering/light_build_utils'

const WALL_EL_MEASUREMENTS_OPACITY = 0.5
const WALL_EL_MEASUREMENTS_SNAPPED_OPACITY = 0.9
const WALL_EL_MEASUREMENTS_LINE_WIDTH_PIX = 0.5
const WALL_EL_MEASUREMENTS_SNAPPED_LINE_WIDTH_PIX = 1.5

function rgbToLab(color: THREE.Color): [number, number, number] {
  const r = color.r > 0.04045 ? ((color.r + 0.055) / 1.055 ** 2.4) : color.r / 12.92
  const g = color.g > 0.04045 ? ((color.g + 0.055) / 1.055 ** 2.4) : color.g / 12.92
  const b = color.b > 0.04045 ? ((color.b + 0.055) / 1.055 ** 2.4) : color.b / 12.92

  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100

  const xn = 95.047
  const yn = 100.000
  const zn = 108.883

  x /= xn
  y /= yn
  z /= zn

  // Convert to LAB
  x = x > 0.008856 ? x ** (1 / 3) : (7.787 * x) + 16 / 116
  y = y > 0.008856 ? y ** (1 / 3) : (7.787 * y) + 16 / 116
  z = z > 0.008856 ? z ** (1 / 3) : (7.787 * z) + 16 / 116

  const L = (116 * y) - 16
  const a = 500 * (x - y)
  const bb = 200 * (y - z)

  return [L / 100, a, bb]
}
export class RoomScene {
  private lightGenerationSettings: LightaGenerationSettings

  private wasmInterop: WasmInterop | null = null
  private renderScene: THREE.Scene
  private roomMesh: RoomMesh | null = null
  private graphView: WallsGraphView | null = null
  private wallElementMeasurements: WallElementMeasurements | null = null
  private wallElementMeasurementsSnapped: WallElementMeasurements | null = null
  private wallsDoubleSided = true
  private isDirty = true
  private cubemapIsDirty = false
  private roomHeight = 0

  private pointLightTemplate: THREE.PointLight | null = null
  private lightFixtureTemplate: THREE.Object3D | null = null
  private pointLightsCache: Map<number, (THREE.PointLight | undefined)> = new Map()
  private areaLightTemplate: THREE.RectAreaLight | null = null
  private areaLightsCache: Map<number, (THREE.RectAreaLight | undefined)> = new Map()
  private cubemapListenPromise: RefreshablePromise<THREE.WebGLRenderTarget<THREE.Texture>>
  private lightFixtures: Map<string, THREE.Object3D> = new Map()
  private envMapInitializationDone = false
  private compositionItemLookup = new Map<string, THREE.Object3D>()

  private debugMarkers = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> >()

  constructor(settings: PlannerSettings) {
    this.initShaders()
    this.renderScene = new THREE.Scene()
    this.cubemapListenPromise = new RefreshablePromise<THREE.WebGLRenderTarget<THREE.Texture>>()
    this.lightGenerationSettings = { ...settings.lights }
  }

  applySettings(settings: PlannerSettings) {
    this.lightGenerationSettings = { ...settings.lights }
    this.refreshLights()
  }

  public getIsDirty() {
    return this.isDirty
  }

  public setIsDirty(isDirty: boolean) {
    this.isDirty = isDirty
  }

  public getCubemapIsDirty() {
    return this.cubemapIsDirty
  }

  public setCubemapIsDirty() {
    this.cubemapIsDirty = true
    this.cubemapListenPromise.ready().then(rt => rt.dispose())
    this.cubemapListenPromise.reset()
  }

  public getRenderScene() {
    return this.renderScene
  }

  public getWallElementObject(id: string) {
    return this.roomMesh?.getWallElementVisualObject(id)
  }

  public getCompositionItemObject(id: string) {
    return this.compositionItemLookup.get(id)
  }

  public getCubemap() {
    return this.cubemapListenPromise
  }

  public initLights() {
    if (!this.pointLightTemplate) {
      this.pointLightTemplate = new THREE.PointLight()
    }
    if (!this.areaLightTemplate) {
      this.areaLightTemplate = new THREE.RectAreaLight(WARM_YELLOW)
    }

    // Pre-create lights to avoid hiccups during room editing when turing them on/off.
    const preCreatePointLightNum = 10
    for(let i = 0; i < preCreatePointLightNum; i += 1) {
      const light = this.createNewPointLight()
      if (light) {
        this.renderScene.add(light)
        this.pointLightsCache.set(i, light)
      }
    }
    const preCreateAreaLightNum = 16
    for(let i = 0; i < preCreateAreaLightNum; i += 1) {
      const light = this.areaLightTemplate.clone()
      this.areaLightsCache.set(i, light)
    }
    const skyLightSource = createSkyLightSource()
    const sunLightSource = createSunLightSource()
    skyLightSource.visible = false
    sunLightSource.visible = false
    this.renderScene.add(skyLightSource, sunLightSource)
    this.areaLightsCache.forEach(areaLight => {
      if (areaLight) {
        areaLight.visible = false
        this.renderScene.add(areaLight)
      }
    })

    if (this.roomMesh) {
      const rootObject = this.roomMesh.getRootObject()
      if (!rootObject.userData) {
        rootObject.userData = {}
      }
    }
  }

  private initShaders() {
    patchThreeJSPbrShaders()
  }

  public initWithRenderEngine(renderer: THREE.WebGLRenderer) {
    return this.initEnvMap(renderer)
  }

  private initEnvMap(renderer: THREE.WebGLRenderer) {
    if (this.envMapInitializationDone) {
      return  Promise.resolve()
    }

    this.envMapInitializationDone = true
    const url = this.renderScene.userData.envMapUri
    if (!url) {
      return Promise.resolve()
    }

    const textureLoader = new RGBELoader()
    textureLoader.setDataType(THREE.HalfFloatType)
    const pmremGenerator = new THREE.PMREMGenerator(renderer)

    return textureLoader.loadAsync(url).then((texture) => {
      pmremGenerator.compileEquirectangularShader()
      const resultRt = pmremGenerator.fromEquirectangular(texture)
      const envMap = resultRt.texture
      this.renderScene.environment = envMap
      this.setIsDirty(true)
    })
    .catch(() => {})
    .finally(() => {
      pmremGenerator.dispose()
    })
  }

  public initFromTemplate(wasmInterop: WasmInterop, roomMesh: RoomMesh, wallsGraph: WallsGraph,
    ceilingPlane: PlaneType, roomTemplate: RoomTemplate) {
      this.wasmInterop = wasmInterop
      this.roomMesh = roomMesh
      this.roomHeight = roomTemplate.ceiling.height

      const rootObject = this.roomMesh.getRootObject()
      this.renderScene.add(rootObject)

      this.initLights()
      this.refreshLights()

      this.enableWallsDoubleSide(this.wallsDoubleSided)

      this.createGraphView(wallsGraph, ceilingPlane)
      this.createWallElementMeasurement()

      const greyHdr = `https://catalog-processed.storage.home-design.ikea.com/roomassets/3c6ecaca-fe83-4616-8c08-bad550091880/LOW_RES/gray.hdr`
      this.renderScene.userData.envMapUri = greyHdr
      this.renderScene.userData.geomagical = {
        version: "3.0",
        geomagicalScenes: [
          {
              version: "1.1",
              sceneType: `Standard3D`,
              sceneSource: `RoomBuilder`,
              environmentMapCustomImage: {
                  uri: greyHdr,
                  mimeType: `image/hdr`,
              },
          }
        ]
      }
  }

  public createGraphView(wallsGraph: WallsGraph, ceilingPlane: PlaneType) {
    this.graphView = new WallsGraphView(wallsGraph, ceilingPlane)
    this.renderScene.add(this.graphView.getRenderObject())
  }

  public refreshGraphView(wallsGraph: WallsGraph) {
    if (this.graphView) {
      this.graphView.refresh(wallsGraph)
    }
    if (this.roomMesh) {
      this.roomMesh.syncWithWallsGraph()
    }
    if (this.lightGenerationSettings.autoLightsRefresh) {
      this.refreshLights()
    }
    this.isDirty = true
  }

  private createWallElementMeasurement() {
    this.wallElementMeasurements = new WallElementMeasurements(WALL_EL_MEASUREMENTS_LINE_WIDTH_PIX,
                                                               WALL_EL_MEASUREMENTS_OPACITY)
    this.renderScene.add(this.wallElementMeasurements.getRootObject())

    this.wallElementMeasurementsSnapped = new WallElementMeasurements(WALL_EL_MEASUREMENTS_SNAPPED_LINE_WIDTH_PIX,
                                                                      WALL_EL_MEASUREMENTS_SNAPPED_OPACITY)
    this.renderScene.add(this.wallElementMeasurementsSnapped.getRootObject())
  }

  public refreshWallElementMeasurements(elementInfo: WallElementInfo) {
    const elementObject = this.roomMesh?.getWallElementVisualObject(elementInfo.elementId)
    if (!this.wallElementMeasurements || !this.wallElementMeasurementsSnapped || !elementObject) {
      return
    }
    this.wallElementMeasurements.refresh(elementInfo, elementObject)
    this.wallElementMeasurementsSnapped.refresh(elementInfo, elementObject)
    this.setIsDirty(true)
  }

  public setGraphViewVisible(visible: boolean) {
    this.graphView?.setVisible(visible)
    this.isDirty = true
  }

  public enableWallsDoubleSide(enable: boolean) {
    this.wallsDoubleSided = enable

    const wallMeshes = this.roomMesh?.getWallMeshes()
    if (!wallMeshes) {
      return
    }
    wallMeshes.forEach((mesh) => {
      mesh.material.side = this.wallsDoubleSided ? THREE.DoubleSide : THREE.FrontSide
    })
  }

  public onBeforeRender(cameraPosition: THREE.Vector3, resolution: THREE.Vector2) {
    this.hideBackfacingWalls(cameraPosition)
    if (this.wallElementMeasurements) {
      this.wallElementMeasurements.setResolution(resolution)
    }
    if (this.wallElementMeasurementsSnapped) {
      this.wallElementMeasurementsSnapped.setResolution(resolution)
    }
  }

  public onBeforeCubemapRender(ctx: PropertyManager) {
    const staticSceneGraph = new StaticSceneGraph(this.renderScene)
    adjustSceneLighting(staticSceneGraph, this.renderScene, ctx)
    showAllRoomGeometryOnly(staticSceneGraph, this.renderScene, ctx)
    centerSceneAtOriginForEnvMapRender(staticSceneGraph, this.renderScene, ctx)

    const directionalLight = staticSceneGraph.getDirectionalLights()[0]
    const hemisphereLight = staticSceneGraph.getHemisphereLights()[0]
    const areaLights = staticSceneGraph.getAreaLights()
    areaLights.forEach(light => ctx.applyPropertyChange(light, `visible`, true))
    ctx.applyPropertyChange(directionalLight, `visible`, true)
    ctx.applyPropertyChange(hemisphereLight, `visible`, true)

    refreshSunlightShadowProps(staticSceneGraph, directionalLight)
    refreshSunlightForScene(staticSceneGraph, directionalLight)
    refreshBouncelightForScene(staticSceneGraph, areaLights)
  }

  public onAfterCubemapRender(cubemap: THREE.WebGLRenderTarget<THREE.Texture>, ctx: PropertyManager) {
    this.cubemapListenPromise.commit(cubemap)
    this.cubemapIsDirty = false
    ctx.revertChanges()
  }

  private hideBackfacingWalls(cameraPosition: THREE.Vector3) {
    const wallMeshes = this.roomMesh?.getWallMeshes()
    if (wallMeshes) {
      // Assumption here is that walls normals are always directed at "+Z",
      // i.e. if objects position in wall's local coordinates has negative Z, the object is behind the wall.
      wallMeshes.forEach((mesh) => {
        mesh.visible = !this.isWallMeshBackFacing(mesh, cameraPosition)
      })
    }

    const ceilingMesh = this.roomMesh?.getCeilingMesh()
    if (ceilingMesh) {
      ceilingMesh.visible = !this.isPlaneMeshBackFacing(ceilingMesh, cameraPosition)
    }
  }

  public isWallMeshBackFacing(wallMesh: THREE.Object3D, cameraPosition: THREE.Vector3) {
    return !(this.wallsDoubleSided || !this.isPlaneMeshBackFacing(wallMesh, cameraPosition))
  }

  private isPlaneMeshBackFacing(planeMesh: THREE.Object3D, cameraPosition: THREE.Vector3) {
    const cameraPosInPlaneSpace = planeMesh.worldToLocal(cameraPosition.clone())
    return cameraPosInPlaneSpace.z <= -EPSILON
  }

  public refreshSunlight() {
    const staticSceneGraph = new StaticSceneGraph(this.renderScene)
    const directionalLight = staticSceneGraph.getDirectionalLights()[0]
    const areaLights = staticSceneGraph.getAreaLights()
    refreshSunlightForScene(staticSceneGraph, directionalLight)
    refreshBouncelightForScene(staticSceneGraph, areaLights)
  }

  public hideLights() {
    this.hideExistingLights()
  }

  public refreshLights() {
    this.refreshLightsWasm()
    this.setIsDirty(true)
  }

  private refreshLightsWasm() {
    const floorMesh = this.roomMesh?.getFloorMesh()
    const ceilingMesh = this.roomMesh?.getCeilingMesh()
    if (!this.wasmInterop || !ceilingMesh || !floorMesh) {
      return
    }
    const indexAttr = ceilingMesh.geometry.getIndex()
    if (!indexAttr) {
      return
    }
    const indices: [number, number, number][] = []
    for (let i = 0; i < indexAttr.count; i += 3) {
      indices.push([indexAttr.getX(i + 0), indexAttr.getX(i + 1), indexAttr.getX(i + 2)])
    }

    const vertices: [number, number, number][] = []
    const posAttirbute = ceilingMesh.geometry.getAttribute('position')
    const threeVec = new THREE.Vector3()
    for (let i = 0; i < posAttirbute.count; i += 1) {
      const pos = threeVec.fromBufferAttribute(posAttirbute, i)
      vertices.push([pos.x, pos.y, pos.z])
    }

    const generatedLights = this.wasmInterop.createLights(vertices, this.roomHeight,
      this.lightGenerationSettings.lightIntensityPerM3,
      this.lightGenerationSettings.maxLampCount, this.lightGenerationSettings.gridSize,
      this.lightGenerationSettings.greedySamplingMinLampSize, this.lightGenerationSettings.greedySamplingGridSize)

    this.hideExistingLights()
    generatedLights.forEach((generatedLight, lightIndex) => {
      if (!generatedLight.position) {
        return
      }
      const light = this.pointLightsCache.get(lightIndex) || this.createNewPointLight()
      if (!light) {
        return
      }
      this.renderScene.add(light)
      this.pointLightsCache.set(lightIndex, light)
      threeVec.fromArray(generatedLight.position)
      const intensityFactor = this.computeLightIntensityFactor(this.lightGenerationSettings.roomIntensityFactor)
      const intensity = generatedLight.intensity * intensityFactor
      this.setLightPositionIntensity(light, ceilingMesh, threeVec, intensity)
    })
  }

  private hideExistingLights() {
    this.pointLightsCache.forEach((light) => {
      if (light) {
        light.intensity = 0.0
        const fixture = this.lightFixtures.get(light.uuid)
        if (fixture) {
          fixture.visible = false
        }
      }
    })
  }

  private setLightPositionIntensity(light: THREE.PointLight, ceilingMesh: THREE.Object3D,
    localPostion: THREE.Vector3, intensity: number) {
    light.position.copy(ceilingMesh.localToWorld(localPostion.clone()))
    light.intensity = intensity
    const fixture = this.lightFixtures.get(light.uuid)
    if (fixture) {
      fixture.visible = true
      const position = ceilingMesh.worldToLocal(light.position.clone())
      fixture.position.copy(position)
    }
  }

  private createNewPointLight() {
    if (!this.pointLightTemplate) {
      return null
    }
    const light = this.pointLightTemplate.clone()
    this.createNewLightFixture(light)
    return light
  }

  private createNewLightFixture(light: THREE.Light) {
    const ceilingMesh = this.roomMesh?.getCeilingMesh()
    if (!this.lightFixtureTemplate || !ceilingMesh) {
      return null
    }
    const existing = this.lightFixtures.get(light.uuid)
    if (existing) {
      ceilingMesh.remove(existing)
    }
    const newFixture = this.lightFixtureTemplate.clone()
    this.lightFixtures.set(light.uuid, newFixture)
    ceilingMesh.add(newFixture)
    return newFixture
  }

  public setMeasurementsVisibility(vertical: WallElementAxisDraggingState,
                                   horizontal: WallElementAxisDraggingState) {
    this.wallElementMeasurements?.setVisible(vertical === WALL_ELEMENT_DRAGGING_AXIS_STATE_ENABLED,
                                             horizontal === WALL_ELEMENT_DRAGGING_AXIS_STATE_ENABLED)

    this.wallElementMeasurementsSnapped?.setVisible(vertical === WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED,
                                                    horizontal === WALL_ELEMENT_DRAGGING_AXIS_STATE_SNAPPED)

    this.setIsDirty(true)
  }

  public setLightFixtureObject(object: THREE.Object3D) {
    const lampObject = object.clone()
    lampObject.castShadow = false
    lampObject.rotateX(THREE.MathUtils.degToRad(-90.0))
    lampObject.traverse(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const materialProps = { reduceLightingEffects: true }
        const material = new CustomStandardMaterial(materialProps).copy(child.material)
        material.setToneMapType(ToneMapType.ACESFilmic)
        child.material = material
        child.receiveShadow = false
        child.castShadow = false
      }
    })

    this.lightFixtureTemplate = new THREE.Group()
    this.lightFixtureTemplate.add(lampObject)
    this.lightFixtureTemplate.userData.isLightFixture = true
    lampObject.position.z -= 0.1 // Empirical, based on current gltf.

    this.pointLightsCache.forEach((light) => {
      if (!light) {
        return
      }
      this.createNewLightFixture(light)
    })
    this.setIsDirty(true)
  }

  public setDebugMarker(name: string, position: THREE.Vector3, color?: THREE.Color) {
    const enabled = true
    if (!enabled) {
      return
    }
    let marker = this.debugMarkers.get(name)
    if (!marker) {
      marker = new THREE.Mesh(new THREE.SphereGeometry(0.025), new THREE.MeshBasicMaterial())
      this.renderScene.add(marker)
      this.debugMarkers.set(name, marker)
    }
    marker.visible = true
    marker.position.copy(position)
    if(color) {
      marker.material.color.copy(color)
    }
    this.setIsDirty(true)
  }

  public hideDebugMarkers(nameStartsWith: string) {
    this.debugMarkers.forEach((marker, name) => {
      if (name.startsWith(nameStartsWith)) {
        marker.visible = false
      }
    })
  }

  private computeLightIntensityFactor(roomIntensityFactor: number): number {
    // Assuming that all walls always have the same color.
    const aWallMesh = this.roomMesh?.getWallMeshes()[0]
    if (!aWallMesh) {
      return 1.0
    }
    const labColor = rgbToLab(aWallMesh.material.color.clone().convertLinearToSRGB())
    const lightness =  Math.min(Math.max(labColor[0], 0.5), 1)

    return THREE.MathUtils.lerp(1, roomIntensityFactor, (lightness - 0.5) * 2)
  }

  public initCompositionItem(item: CompositionItem) {
    const rootObject = item.getRootObject()
    this.compositionItemLookup.set(item.getId(), rootObject)
    rootObject.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshStandardMaterial)) {
        return
      }
      const materialProps = { reduceLightingEffects: true }
      const material = new CustomStandardMaterial(materialProps).copy(child.material)
      material.setToneMapType(ToneMapType.ACESFilmic)
      child.material = material

      Object.entries(child.material).forEach(([key, value]) => {

        if (value && key !== 'envMap' && key.toLowerCase().endsWith('map')) {
          (value as THREE.Texture).format = THREE.RGBAFormat
          child.userData.needsTextureInit = true
        }
      })
    })
  }
}
