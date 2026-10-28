/* eslint-disable class-methods-use-this */
import * as THREE from 'three'
import { ShadowMapViewer } from 'three/examples/jsm/utils/ShadowMapViewer'
import type { SceneCreateCallback, SceneBuilder } from 'Renderer/rendering/SceneBuilder'
import { MeshScene } from 'Renderer/rendering/MeshScene'
import type { BaseRenderEngine } from 'Renderer/rendering/BaseRenderEngine'

import { GrandCentral } from 'Renderer/GrandCentral'
import { ViewerStateUpdateNotification } from 'Renderer/geomviewer/geom_notifications'
import { NOTIFY_VIEWER_STATE_UPDATE } from 'Renderer/geomviewer/geom_constants'

import { ViewerSettings } from 'Renderer/geomviewer/geom_types'
import { DebugSettings } from 'Renderer/geomviewer/geom_debug'
import { InitializationFailureCallback, EnvMapsSet } from 'Renderer/rendering/rendering_types'

import type { OnFirstRenderCallback } from 'Renderer/rendering/rendering_types'
import { AssetManager } from 'Renderer/assets/AssetManager'
import { AssetsList } from 'Renderer/assets/AssetsList'
import { MeshBasedRenderEngine } from 'Renderer/rendering/MeshBasedRenderEngine'
import * as WallSnap from 'Renderer/WallSnap'
import { GLTFGeomagicalPolygon, PolygonData } from 'Renderer/assets/Types'
import TextureHelper from 'Renderer/TextureHelper'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import { EPSILON_RLXD } from 'Renderer/geometry'
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper'

import {
    BACKGROUND_SCENE_READY,
    ENVIRONMENT_MAP_READY,
    FLOOR_PLACER_READY,
    MASK_DATA_READY,
    OCCLUSION_SCENE_READY,
    PLANE_DATA_READY,
    RENDER_DIMENSIONS_READY,
    WALL_SNAP_READY,
} from 'Renderer/StartupWarden'
import { gvCurrentCamera, gvStartupWarden } from 'Renderer/foundation/geom_app'
import { WholeRoomGLTFAssets } from 'Renderer/assets/WholeRoomGLTFAssets'
import {
  AO_LAYER,
  AO_PANO_LAYER,
  COLOR_ID_SUBOBJECT_LAYER,
  DEFAULT_THREE_NATIVE_LAYER,
  SKYSPHERE_STENCIL_REF,
  STENCIL_MATERIAL_RENDER_ORDER,
  TRANSPARENT_OBJECTS_RENDER_ORDER,
  WALL_SHIFT_3D_ROOMS,
} from 'Renderer/constants'
import { clamp } from 'utils/math'
import { GeomBaseScene } from './GeomBaseScene'

import {
  toLegacyIntrinsics,
  buildPlaneAndPolygonData,
  initializeEnvMap,
  signedAngleDeg,
} from './scene_builder_utils'
import {
  createBounceLightSources,
  createDirectionalLightCookie,
  createSkyLightSource,
  createSkySphere,
  createSunLightSource,
  createTextHelper,
  refreshBouncelightForScene,
  refreshSunlightForScene,
  refreshSunlightShadowProps,
} from './light_build_utils'
import { DefaultAssetManager, setMaterialOnBeforeCompileCallback } from './rendering_utils'

const notifyWallDataReady = (width: number, height: number) => {
  const notification: ViewerStateUpdateNotification = {
    what: NOTIFY_VIEWER_STATE_UPDATE,
    payload: {
      stateInfo: `WallDataReady`,
      wallDataInfo: { width, height },
    }
  }
  GrandCentral.getDispatcher().dispatchNotification(notification);
}

const notifyWallPolygonsReady = (polygons: PolygonData) => {
  const notification: ViewerStateUpdateNotification = {
    what: NOTIFY_VIEWER_STATE_UPDATE,
    payload: {
      stateInfo: `WallPolygonsReady`,
      wallPolygonsInfo: polygons,
    }
  }
  GrandCentral.getDispatcher().dispatchNotification(notification);
}

export class MeshSceneBuilder implements SceneBuilder<
  MeshScene,
  BaseRenderEngine<MeshScene>> {
    protected settings: ViewerSettings
    protected debugSettings: DebugSettings
    private onInitializationFailure: InitializationFailureCallback

    constructor(
        settings: ViewerSettings,
        debugSettings: DebugSettings,
        onInitializationFailure: InitializationFailureCallback) {
        this.settings = settings
        this.debugSettings = debugSettings
        this.onInitializationFailure = onInitializationFailure
    }

    buildRenderEngine: (
        canvas: HTMLCanvasElement,
        onFirstRenderCallback: OnFirstRenderCallback,
    ) => MeshBasedRenderEngine = (canvas: HTMLCanvasElement, onFirstRenderCallback: OnFirstRenderCallback) =>
        new MeshBasedRenderEngine(canvas, this.settings, this.debugSettings, 
            this.onInitializationFailure, onFirstRenderCallback)

    buildScene: (renderEngine: BaseRenderEngine<GeomBaseScene>, assetsList: AssetsList,
      assetManager: AssetManager, sceneCreateCallback?: SceneCreateCallback<MeshScene>) => Promise<MeshScene> = 
        (renderEngine: BaseRenderEngine<GeomBaseScene>, assetsList: AssetsList, 
          assetManager: AssetManager, sceneCreateCallback?: SceneCreateCallback<MeshScene>) => {
            const scene = new MeshScene()

            // Fake some startup stages so we can send the right notifications
            // to make things work. The ordering of these events is important.

            gvStartupWarden()?.markStartupStage(FLOOR_PLACER_READY);

            renderEngine.setScene(scene)

            if (sceneCreateCallback) {
                sceneCreateCallback(scene)
            }

            const width = gvCurrentCamera()?.getIntrinsics()?.imageWidth || 100
            const height = gvCurrentCamera()?.getIntrinsics()?.imageHeight || 100

            scene.setDimensions(width, height)

            return this.buildPlaneAndPolygonData(assetsList, scene)
              .then(() => this.populateScene(assetsList, scene))
              .then(() => this.initializeDefaultWallColor(scene))
              .then(() => this.patchCustomLighting(scene))
              .then(() => this.patchSceneMaterials(scene))
              .then(() => this.initializeEnvMap(height, assetsList, assetManager, scene, renderEngine))
              .then(() => this.buildDebugObjects(scene))
              .then(() => this.initWallsnap(assetsList, scene))
              .then(() => renderEngine.triggerAutoExposure())
              .then(() => {
                gvStartupWarden()?.markStartupStage(RENDER_DIMENSIONS_READY);
                gvStartupWarden()?.markStartupStage(MASK_DATA_READY);
                gvStartupWarden()?.markStartupStage(BACKGROUND_SCENE_READY);
                notifyWallDataReady(width, height);
                gvStartupWarden()?.markStartupStage(OCCLUSION_SCENE_READY);
                renderEngine.changeDebugSettings(this.debugSettings);
                return scene
              })
      }
    
    protected populateScene(assetList: AssetsList, resultScene: MeshScene) {
      const wholeRoomAssets = assetList as WholeRoomGLTFAssets
      return wholeRoomAssets.getParsedGltfScene().then((resultGroup) => {
        if (resultGroup) {
          // Add custom lighting fixtures to the parsed scene.
          const skySphere = createSkySphere(resultScene.getSceneBoundingBox())
          resultGroup.add(skySphere)

          // Temporarily add missing custom light sources to the parsed scene.
          const skyLightSource = createSkyLightSource()
          resultGroup.add(skyLightSource)
          if (this.settings.isRoomBuilderScene) {
            if (!resultGroup.children.some(child => child instanceof THREE.DirectionalLight)) {
              const sunLightSource = createSunLightSource()
              resultGroup.add(sunLightSource)
              sunLightSource.userData.isRuntimeGenerated = true
            }
            if (!resultGroup.children.some(child => child instanceof THREE.RectAreaLight)) {
              const maxAreaLightsCount = resultGroup.userData.geomagical.geomagicalSurfaces.filter(
                (surface: GLTFGeomagicalPolygon) => ['window', 'door'].includes(surface.type)).length
              const bounceLightSources = createBounceLightSources(maxAreaLightsCount)
              bounceLightSources.forEach(obj => { obj.userData.isRuntimeGenerated = true })
              resultGroup.add(...bounceLightSources)
            }
          }

          // add the group to scene's root.
          resultScene.setRoomMeshGroup(resultGroup)
        }
      }).then(() => {
        gvStartupWarden()?.markStartupStage(PLANE_DATA_READY)
        gvStartupWarden()?.markStartupStage(FLOOR_PLACER_READY)
      })
    }

    protected patchSceneMaterials(resultScene: MeshScene) {
      this.setGlassWindowsStencilProps(resultScene)
      this.patchItemsStandardMaterials(resultScene)
      this.patchVignetteAOProps(resultScene)
      this.patchLightAndShadowProps(resultScene)
    }

    protected patchCustomLighting(resultScene: MeshScene) {
      // Temporarily patch custom lighting using the current scene state.
      const sceneGraph = resultScene.getStaticSceneGraph()
      if (this.settings.isRoomBuilderScene && sceneGraph) {
        const isVisible = this.debugSettings.keepLocallyGeneratedLights || false

        const directionalLight = sceneGraph.getDirectionalLights()[0]
        if (directionalLight) {
          directionalLight.visible = isVisible
          if (directionalLight.userData.isRuntimeGenerated) {
            refreshSunlightForScene(sceneGraph, directionalLight)
          }
        }
        const areaLights = sceneGraph.getAreaLights()
        areaLights.forEach(areaLight => { areaLight.visible = isVisible })
        if (areaLights.some(obj => obj.userData.isRuntimeGenerated)) {
          refreshBouncelightForScene(sceneGraph, areaLights)
          resultScene.trimBounceLights()
        }
      }

      // Initialize debug settings for the generated lights for admin users
      if (this.settings.onOffOptions.enableDebugControls) {
        const directionalLight = sceneGraph?.getDirectionalLights()[0]
        this.debugSettings.sunLightIntensity = directionalLight?.intensity || this.debugSettings.sunLightIntensity
        const hemisphereLight = sceneGraph?.getHemisphereLights()[0]
        this.debugSettings.skyLightIntensity = hemisphereLight?.intensity || this.debugSettings.skyLightIntensity
        const areaLights = sceneGraph?.getAreaLights().filter(areaLight => areaLight.parent)
        areaLights?.forEach((areaLight, i) => { this.debugSettings.areaLightIntensities[i] = areaLight.intensity })
      }
    }

    protected initWallsnap(assetList: AssetsList, resultScene: MeshScene) {
      const planePolygons = resultScene.getPolygonData()
      const planeOrientation = resultScene.getPlaneData()
      const planeData = planeOrientation?.planeData
      const polygonData = planePolygons?.plane_polygons
  
      const legacyIntrinsics = toLegacyIntrinsics(assetList.getCameraIntrinsics(0))
      const useOpeningsAsWalls = false
      const roomTemplate = assetList.getRoomTemplate()
      const floorLines = roomTemplate
        ? WallSnap.makeFloorLinesFromTemplate(roomTemplate, planeData, legacyIntrinsics, WALL_SHIFT_3D_ROOMS)
        : WallSnap.makeFloorLinesFromPolys(planeData, polygonData, legacyIntrinsics,
            useOpeningsAsWalls, WALL_SHIFT_3D_ROOMS)
      resultScene.setFloorLines(floorLines, WALL_SHIFT_3D_ROOMS)
      gvStartupWarden()?.markStartupStage(WALL_SNAP_READY)
    }

    protected buildPlaneAndPolygonData(assetsList: AssetsList, resultScene: MeshScene) {
      const roomGltfAssets = assetsList as WholeRoomGLTFAssets
      const useOpeningsAsWalls = true
      return buildPlaneAndPolygonData(roomGltfAssets, useOpeningsAsWalls)
        .then((nonStackablePolygons) => {
          resultScene.setPlaneData({
            planeData: nonStackablePolygons.map(info => info.polygonInfo.plane)
          })
          resultScene.setPolygonData({
            plane_polygons: nonStackablePolygons.map(info => info.polygonInfo.polygon)
          })
          resultScene.associatePlaneNormals(
            nonStackablePolygons.map(info => info.mesh),
              nonStackablePolygons.map(info => info.polygonInfo.plane))

          nonStackablePolygons.forEach((info) => {
            const polyClass = info.polygonInfo.polygon.class
            if (polyClass === 'door' || polyClass === 'window' || polyClass === 'opening') {
              info.mesh.visible = false
            }
          })
        })
        .then(() => {
          const polygons = resultScene.getPolygonData()
          if (polygons) {
            notifyWallPolygonsReady(polygons)
          }
        })
    }

    protected buildDebugObjects(resultScene: MeshScene) {
      if (!this.settings.onOffOptions.enableDebugControls) {
        return
      }

      const sceneGraph = resultScene.getStaticSceneGraph()

      // Create shadow map viewer for the generated directional light.
      const generatedDirectionalLight = sceneGraph?.getDirectionalLights()[0]
      if (generatedDirectionalLight) {
        const shadowMapDebugObj = new ShadowMapViewer(generatedDirectionalLight)
        shadowMapDebugObj.size.width = 800
        shadowMapDebugObj.size.height = 800
        shadowMapDebugObj.update()
        resultScene.setShadowMapDebugObj(shadowMapDebugObj)
      }

      // Build light helpers.
      const lightHelpers: THREE.Object3D[] = []
      sceneGraph?.getPointLights().forEach((pointLight, i) => {
        const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.1, 0)
        pointLightHelper.add(createTextHelper(`${i}`, 12, new THREE.Vector3(0, -0.15, 0)))
        lightHelpers.push(pointLightHelper)
      })
      sceneGraph?.getDirectionalLights().forEach((directionalLight, i) => {
        const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.1, 0)
        directionalLightHelper.add(createTextHelper(`${i}`, 12, new THREE.Vector3(0, -0.15, 0)))
        lightHelpers.push(directionalLightHelper)
      })
      sceneGraph?.getAreaLights().forEach((areaLight, i) => {
        if (!areaLight.parent) return
        const areaLightHelper = new RectAreaLightHelper(areaLight, 0)
        areaLightHelper.add(createTextHelper(`${i}`, 12, new THREE.Vector3(0, -0.15, 0)))
        lightHelpers.push(areaLightHelper)
      })

      resultScene.setLightHelperObjects(lightHelpers)
      resultScene.setLightHelpersVisible(false)
    }

    protected initializeEnvMap(height: number, assetsList: AssetsList, assetManager: AssetManager,
      resultScene: MeshScene, renderEngine: BaseRenderEngine<GeomBaseScene>): Promise<EnvMapsSet> {
      return initializeEnvMap(height, assetsList, assetManager, 
        resultScene, renderEngine, this.settings)
        .then((result) => {
          gvStartupWarden()?.markStartupStage(ENVIRONMENT_MAP_READY)
          return result
      })
    }

    protected initializeDefaultWallColor(resultScene: MeshScene) {
      if (this.settings.hasTexturedWalls) {
        return
      }
      const wallObjects = resultScene.getStaticSceneGraph()?.getWallsObjects()
      const wallMaterial = wallObjects?.[0]?.material
      if (!wallMaterial) {
        return
      }
      const wallTextureMap = wallMaterial.map
      if (!wallTextureMap || wallTextureMap.uuid === DefaultAssetManager.getWhiteTexture().uuid) {
        const color = wallMaterial.color.clone().convertLinearToSRGB()
        resultScene.setDefaultWallColor(color)
        return
      }
      const pixels = new TextureHelper().readPixels(wallTextureMap)
      if (!pixels) {
        return
      }
      const color = new THREE.Color(
        pixels.data[0] / 255,
        pixels.data[1] / 255,
        pixels.data[2] / 255,
      )
      resultScene.setDefaultWallColor(color)
    }

  protected setGlassWindowsStencilProps(resultScene: MeshScene) {
    const stencilMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    stencilMat.colorWrite = false
    stencilMat.depthWrite = false
    stencilMat.stencilWrite = true
    stencilMat.stencilRef = SKYSPHERE_STENCIL_REF
    stencilMat.stencilFunc = THREE.AlwaysStencilFunc
    stencilMat.stencilZPass = THREE.ReplaceStencilOp
    stencilMat.toneMapped = false

    // Create a stencil-test glass duplicate to keep the actual glass reflective properties.
    resultScene.getStaticSceneGraph()?.getWallElementsGlassObjects().forEach(glassMesh => {
      const glassStencilObject = glassMesh.clone() as THREE.Mesh
      glassStencilObject.material = stencilMat
      glassStencilObject.renderOrder = STENCIL_MATERIAL_RENDER_ORDER
      glassMesh.renderOrder = TRANSPARENT_OBJECTS_RENDER_ORDER
      glassMesh.parent?.add(glassStencilObject)
    })
  }

  protected patchItemsStandardMaterials(resultScene: MeshScene) {
    const sceneGraph = resultScene.getStaticSceneGraph()
    const ceilingMeshes = sceneGraph?.getCeilingsObjects()
    const floorMeshes = sceneGraph?.getFloorsObjects()
    const wallMeshes = sceneGraph?.getWallsObjects()
    const wallElementBodyMesh = sceneGraph?.getWallElementsBodyObjects()
    const wallElementFrameMesh = sceneGraph?.getWallElementsFrameObjects()
    const allMeshes = sceneGraph?.getAllGeometryObjects()
    const envMap = resultScene.getEnvMap()

    allMeshes?.forEach(mesh => {
      const isFloor = floorMeshes?.includes(mesh)
      const isWall = wallMeshes?.includes(mesh)
      const isCeiling = ceilingMeshes?.includes(mesh)
      const isWallElement = wallElementBodyMesh?.includes(mesh) || wallElementFrameMesh?.includes(mesh)
      const vignetteAO = this.settings.isRoomBuilderScene && (isWall || isFloor)
      const patchedMaterial = new CustomStandardMaterial({ vignetteAO })
      patchedMaterial.copy(mesh.material as THREE.MeshStandardMaterial)
      patchedMaterial.envMap = envMap
      mesh.material.dispose()
      mesh.material = patchedMaterial

      // TODO: need to get rid of this patch.
      setMaterialOnBeforeCompileCallback(
        patchedMaterial,
        (shader: THREE.WebGLProgramParametersWithUniforms) => {
          Object.defineProperty(mesh.material, `envMapRotation`, {
            get: () => shader.uniforms.envMapRotation?.value,
            set: (val) => {
              if (shader.uniforms.envMapRotation)
                shader.uniforms.envMapRotation.value = val
            },
            configurable: true,
          })
        }
      )

      // Set the ceilings only lighting modifiers.
      if (isCeiling) {
        patchedMaterial.uniforms.ceilingPointLightMultiplier.value = 0.02
        patchedMaterial.uniforms.ceilingSkyLightMultiplier.value = 1.0
        patchedMaterial.uniforms.satMin.value = 0.3
      }

      // Set the side of the wall elements to front only.
      // This is required for uber-shader behavior.
      if (isWallElement) {
        patchedMaterial.side = THREE.FrontSide
      }

      // Add depth-only materials to room meshes for filling colorId depth buffer
      const depthMaterial = new THREE.MeshBasicMaterial
      depthMaterial.colorWrite = false
      const child = new THREE.Mesh(mesh.geometry, depthMaterial)
      child.name = `DepthMaterialClone`
      mesh.add(child)
      child.layers.set(COLOR_ID_SUBOBJECT_LAYER)
    })
  }

  protected patchVignetteAOProps(resultScene: MeshScene) {
    const sceneGraph = resultScene.getStaticSceneGraph()
    const floorMeshes = sceneGraph?.getFloorsObjects()
    const wallMeshes = sceneGraph?.getWallsObjects()

    if (!this.settings.isRoomBuilderScene || !floorMeshes || !wallMeshes) {
      return
    }

    // Rename the room-planner exported non-standard vAOCoords attribute to its original name.
    [...floorMeshes, ...wallMeshes].forEach(mesh => {
      const vAOCoordsAttribute = mesh.geometry.getAttribute('_vaocoords')
      if (vAOCoordsAttribute) {
        mesh.geometry.setAttribute('vAOCoords', vAOCoordsAttribute)
        // eslint-disable-next-line no-underscore-dangle
        delete mesh.geometry.attributes._vaocoords
      }
    })

    // Calculate the walls' adjacent walls angles required for the vignetteAO effect.
    const roomWalls = wallMeshes.map(mesh => {
      // Get wall vertices in world space.
      const matrix = mesh.matrixWorld
      const pos = mesh.geometry.attributes.position as THREE.BufferAttribute
      const vertices: THREE.Vector3[] = new Array(pos.count)
      for (let i = 0; i < vertices.length; i += 1) {
        vertices[i] = new THREE.Vector3(
          pos.array[i * 3],
          pos.array[i * 3 + 1],
          pos.array[i * 3 + 2],
        ).applyMatrix4(matrix)
      }

      // Get wall's basis directions.
      const right = new THREE.Vector3(matrix.elements[0], matrix.elements[1], matrix.elements[2])
      const up = new THREE.Vector3(matrix.elements[4], matrix.elements[5], matrix.elements[6])            
      return { mesh, vertices, right, up }
    })

    roomWalls.forEach(currentWallView => {
      // Find the two adjacent walls with touching vertices.
      const adjacentWalls: { wall: typeof roomWalls[number], commonVertex: THREE.Vector3 }[] = []
      currentWallView.vertices.forEach(currentWallVertex => {
        const adjacentWall = roomWalls.find(wallView => {
          if (wallView.mesh.id === currentWallView.mesh.id)
            return false
          for (let i = 0; i < wallView.vertices.length; i += 1) {
            if (currentWallVertex.distanceTo(wallView.vertices[i]) < EPSILON_RLXD)
              return true
          }
          return false
        })

        if (!adjacentWall || adjacentWalls.find(w => w.wall === adjacentWall)) {
          return
        }
        adjacentWalls.push({ wall: adjacentWall, commonVertex: currentWallVertex }) 
      })

      // Arrange the two adjacent walls from current wall's right to left.
      adjacentWalls.sort((A, B) => {
        const BA = new THREE.Vector3().subVectors(A.commonVertex, B.commonVertex).normalize()
        return BA.dot(currentWallView.right)
      })

      // Use the adjacent walls to calculate the adjacent wall angles.
      const currentWallDirection = currentWallView.right.clone()
      const formerWallDirection = adjacentWalls[0]?.wall.right.clone() || currentWallDirection.clone()
      const latterWallDirection = adjacentWalls[1]?.wall.right.clone() || currentWallDirection.clone()
      const former = 180 - clamp(0, 180)(signedAngleDeg(
        new THREE.Vector2(formerWallDirection.x, formerWallDirection.z),
        new THREE.Vector2(currentWallDirection.x, currentWallDirection.z)))
      const latter = 180 - clamp(0, 180)(signedAngleDeg(
        new THREE.Vector2(currentWallDirection.x, currentWallDirection.z),
        new THREE.Vector2(latterWallDirection.x, latterWallDirection.z)))

      // Set the material's adjacent walls properties.
      const wallMaterial = currentWallView.mesh.material as CustomStandardMaterial
      if (wallMaterial.uniforms.vAOleft)
        wallMaterial.uniforms.vAOleft.value = former
      if (wallMaterial.uniforms.vAOright)
        wallMaterial.uniforms.vAOright.value = latter
    })
  }

  protected patchLightAndShadowProps(resultScene: MeshScene) {
    const sceneGraph = resultScene.getStaticSceneGraph()
    if (!sceneGraph) {
      return
    }

    const allMeshes = sceneGraph.getAllGeometryObjects()
    const wallsMeshes = sceneGraph.getWallsObjects()
    const floorsMeshes = sceneGraph.getFloorsObjects()
    const ceilingsMeshes = sceneGraph.getCeilingsObjects()
    const doorsProxyMeshes = sceneGraph.getDoorsProxyObjects()
    const windowsProxyMeshes = sceneGraph.getWindowsProxyObjects()
    const openingsProxyMeshes = sceneGraph.getOpeningsProxyObjects()
    const wallElementMeshes = [
      ...sceneGraph.getWallElementsFrameObjects(),
      ...sceneGraph.getWallElementsBodyObjects(),
      ...sceneGraph.getBaseboardObjects(),
    ]

    // Initialize the room geometry relationship with lights and shadows.
    allMeshes?.forEach(mesh => {
      const isProxyMesh = doorsProxyMeshes.includes(mesh) || windowsProxyMeshes.includes(mesh)
        || openingsProxyMeshes.includes(mesh)
      const isWallMesh = wallsMeshes.includes(mesh)
      const isFloorMesh = floorsMeshes.includes(mesh)
      const isCeilingMesh = ceilingsMeshes.includes(mesh)
      const isWallElement = wallElementMeshes.includes(mesh)
      const isTransparent = mesh.material.transparent
      const isStencilPlane = mesh.material.stencilWrite

      if (!isCeilingMesh) {
        mesh.layers.enable(
          isWallMesh || isFloorMesh
            ? AO_PANO_LAYER
            : DEFAULT_THREE_NATIVE_LAYER
        );

        if (isWallElement) {
          mesh.layers.enable(AO_LAYER)
        }
      }

      mesh.visible = !isProxyMesh
      mesh.receiveShadow = true
      mesh.castShadow = !isTransparent && !isProxyMesh && !isStencilPlane
      mesh.material.shadowSide = isWallMesh || isCeilingMesh ? THREE.BackSide : THREE.FrontSide
    })

    const directionalLight = sceneGraph.getDirectionalLights()[0]
    if (directionalLight) {
      // Initialize directional light shadow camera properties.
      refreshSunlightShadowProps(sceneGraph, directionalLight)

      // Create directional light cookie to filter shadow areas.
      const directionalLightCookie = createDirectionalLightCookie(sceneGraph, directionalLight)
      resultScene.setDirectionalLightCookie(directionalLightCookie)
    }

    // Enable all layers for all analytical lights.
    sceneGraph.getAllLights().forEach(light => light.layers.enableAll())
  }
}
