import * as THREE from 'three'

import { ImageBasedSceneBuilder, ScenePositioningType } from 'Renderer/rendering/ImageBasedSceneBuilder'
import type { ImageBasedScene } from 'Renderer/rendering/ImageBasedScene'
import { RoomGLTFAssets } from 'Renderer/assets/RoomGLTFAssets'
import { AssetsList } from 'Renderer/assets/AssetsList'
import { stoppableTraverse } from 'Renderer/utils/modelUtils'
import { GeomThreeCamera } from 'Renderer/multiview/geom_camera'
import { gvViewManager } from 'Renderer/foundation/geom_app'

import {
  setupDirectionalLight,
  setupPointColoredLight,
  setupSpotColoredLight,
  setupAreaColoredLight,
  createDirectionalLightHelper,
  createPointLightHelper,
  createSpotLightHelper,
  createRectAreaLightHelper,
} from 'Renderer/rendering/light_build_utils'
import type { MultiSceneViewManager } from 'Renderer/multiview/multiscene_view_manager'
import { buildPlaneAndPolygonData } from './scene_builder_utils'

function findCamera(group: THREE.Group, cameraIndex: number): THREE.Object3D | null {
  let cameraObject: THREE.Object3D | null = null
  stoppableTraverse(group, (object) => {
    if(object.userData?.geomagicalCamera === cameraIndex) {
      cameraObject = object
      return false
    }
    return true
  })
  return cameraObject
}

/**
 * GLTFSceneBuilder contains scene building procedures specific to GLTF manifest.
 * TODO: the functionality will be filled in the PR for this ticket:
 * https://geomagical.atlassian.net/browse/GFX-2573
 */
export class GLTFSceneBuilder extends ImageBasedSceneBuilder {
  // eslint-disable-next-line class-methods-use-this
  protected determineScenePositioningType(): ScenePositioningType {
    return `PolyBased`
  }

  // eslint-disable-next-line class-methods-use-this
  protected buildPlaneAndPolygonData(assetsList: AssetsList, resultScene: ImageBasedScene) {
    const roomGltfAssets = assetsList as RoomGLTFAssets
    const useOpeningsAsWalls = this.settings.isSyntheticScene
    return buildPlaneAndPolygonData(roomGltfAssets, useOpeningsAsWalls).then((nonStackablePolygons) => { 
      resultScene.setPlaneData({
        planeData: nonStackablePolygons.map(info => info.polygonInfo.plane)
      })
      resultScene.setPolygonData({
        plane_polygons: nonStackablePolygons.map(info => info.polygonInfo.polygon)
      })
    })
  }

  protected buildCameraTransform(assetsList: AssetsList, resultScene: ImageBasedScene): Promise<void> {
    const roomGltfAssets = assetsList as RoomGLTFAssets
    return roomGltfAssets.getParsedGltfScene().then((resultGroup) => {
      if (resultGroup === null) {
        return
      }
      const cameraObject = findCamera(resultGroup, this.cameraIndex)
      if (cameraObject) {
        cameraObject.updateMatrix()
        resultScene.setCameraTransform(cameraObject.matrix)
        const vm = gvViewManager()
        if (vm) {
          const threeCamera = (vm as MultiSceneViewManager).getCameraByIndex(this.cameraIndex)?.getThreeCamera()
          if (threeCamera) {
            resultScene.setupCamera(threeCamera)
          }
        }
      }
    })
  }

  protected buildLights(assetsList: AssetsList) {
    const roomGltfAssets = assetsList as RoomGLTFAssets

    const directionalLights: THREE.DirectionalLight[] = []
    const pointLights: THREE.PointLight[] = []
    const spotLights: THREE.SpotLight[] = []
    const areaLights: THREE.RectAreaLight[] = []
    const helperObjects: THREE.Object3D[] = []
    const vm = gvViewManager()
    let camera: GeomThreeCamera | undefined
    if (vm) {
      camera = (vm as MultiSceneViewManager).getCameraByIndex(this.cameraIndex)?.getThreeCamera()
    }

    return roomGltfAssets.getParsedGltfScene().then((resultGroup) => {
      if (!resultGroup) {
        return{
          directionalLights,
          pointLights,
          spotLights,
          areaLights,
          helperObjects,
        }
      }

      resultGroup.traverse((child) => {
        if (child.type === 'DirectionalLight') {
          directionalLights.push(<THREE.DirectionalLight>child.clone())
        } else if (child.type === 'PointLight') {
          pointLights.push(<THREE.PointLight>child.clone())
        } else if (child.type === 'SpotLight') {
          spotLights.push(<THREE.SpotLight>child.clone())
        } else if (child.type === 'RectAreaLight') {
          areaLights.push(<THREE.RectAreaLight>child.clone())
        }
      })

      directionalLights.forEach((light, index) => {
        // Preparing the directional lights' targets and positions.
        const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(light.quaternion)
        light.quaternion.identity()
        light.remove(light.target)
        const targetPosition = camera ? camera.position.clone() : new THREE.Vector3(0.0, 0.0, 0.0)
        light.position.set(0.0, 0.0, 0.0)
          .add(targetPosition)
          .add(new THREE.Vector3(direction.x * 5.0, direction.y * 5.0, direction.z * 5.0))
        light.target.position.copy(targetPosition)

        const castShadow = index === 0
        setupDirectionalLight(light, castShadow, this.maxTextureSize)
        if (camera && this.settings.onOffOptions.enableDebugControls) {
          helperObjects.push(createDirectionalLightHelper(light, camera, index))
        }
      })

      pointLights.forEach((light, index) => {
        // Match with old manifest lights creation:
        light.quaternion.identity()
        const castShadow = directionalLights.length === 0 && index === 0
        setupPointColoredLight(light, castShadow, this.maxTextureSize)
        if (this.settings.onOffOptions.enableDebugControls) {
          helperObjects.push(createPointLightHelper(light, index))
        }
      })

      spotLights.forEach((light, index) => {
        const castShadow = (directionalLights.length === 0) &&
          (pointLights.length === 0) &&
          index === 0
        setupSpotColoredLight(light, castShadow, this.maxTextureSize)
        if (this.settings.onOffOptions.enableDebugControls) {
          helperObjects.push(createSpotLightHelper(light, index))
        }
      })

      areaLights.forEach((light, index) => {
        setupAreaColoredLight(light)
        if (this.settings.onOffOptions.enableDebugControls) {
          helperObjects.push(createRectAreaLightHelper(light, index))
        }
      })

      return {
        directionalLights,
        pointLights,
        spotLights,
        areaLights,
        helperObjects,
      }
    })
  }

  protected buildSceneFrontDebugObjects(roomGltfAssets: RoomGLTFAssets,
    mainLight: THREE.Light | undefined, resultScene: ImageBasedScene) {
    super.buildSceneFrontDebugObjects(roomGltfAssets, mainLight, resultScene)

    return roomGltfAssets.getParsedGltfScene().then((resultGroup) => {
      if (resultGroup === null) {
        return
      }

      // Multiview rooms has no missing walls to accomodate for the movable camera behavior.
      // This can block the view of the plane polygons totally so double sided materials are disabled.
      const viewsCount = resultGroup.userData?.geomagical?.geomagicalCameras?.length
      if (viewsCount <= 1) {
        return
      }
      const planePolygonsDebugMeshParentNode = resultScene.getPlanePolygonsDebugObj()
      planePolygonsDebugMeshParentNode?.traverse(obj => {
        const mesh = obj as THREE.Mesh
        if (mesh.material && !Array.isArray(mesh.material)) {
          mesh.material.side = THREE.FrontSide
        }
      })
    })
  }

}
