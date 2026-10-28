/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import { ImageBasedSceneBuilder, ScenePositioningType } from 'Renderer/rendering/ImageBasedSceneBuilder'
import { ImageBasedScene } from 'Renderer/rendering/ImageBasedScene'

import WallspiceWebgl from 'Renderer/WallspiceWebgl'
import {
  createDirectionalLightHelper,
  createPointLightHelper,
  createSpotLightHelper,
  createRectAreaLightHelper,
} from 'Renderer/rendering/light_build_utils'
import { AssetsList } from 'Renderer/assets/AssetsList'
import { SceneManifest } from 'Renderer/assets/SceneManifest'
import { gvViewManager, gvGeomModel } from 'Renderer/foundation/geom_app'
import { constructPlaneFromTransform } from 'Renderer/geometry/PolygonUtils'
import type { Matrix4x4, StackableSurfaceParameters, SurfaceClass } from 'Renderer/geomviewer/geom_types'
import { makeStackableFromV0Data, makeStackableFromV1Data } from 'utils/stackables'
import type { MultiSceneViewManager } from 'Renderer/multiview/multiscene_view_manager'

export class ManifestSceneBuilder extends ImageBasedSceneBuilder {
  protected determineScenePositioningType(assetsList: AssetsList): ScenePositioningType {
    const manifest = assetsList as SceneManifest
    const polygonData = manifest.getPolygonData()
    const hasWallOrFloorPolygons = !!(polygonData?.plane_polygons
      .some(polygon => ['wall', 'floor'].includes(polygon.class)))
    const sceneType = hasWallOrFloorPolygons ? `PolyBased` : `MaskBased`
    return sceneType
  }

  protected buildPlaneAndPolygonData(assetsList: AssetsList, resultScene: ImageBasedScene) {
    // Due to a discrepancy between plane polygons and orientations order; generating
    // the planes data format from the polygons (if available) to support the current
    // dependency of the placement behavior on the planar data format.
    // Note some transitionary rooms' polygons data didn't reflect the actual room state
    // so these are ignored.
    const manifest = assetsList as SceneManifest

      // Also set the provided plane data as legacy planes; as some older rooms
    // still use the legacy normals map, hence require the legacy plane data.
    const legacyPlaneData = manifest.getPlaneData()
    let planeData = legacyPlaneData
    const polygonData = manifest.getPolygonData()
    if (polygonData) {
      polygonData.plane_polygons.forEach((poly) => {
        const convertedTransform: Matrix4x4 = [
          [poly.transform[0][0], poly.transform[1][0], poly.transform[2][0], poly.transform[3][0]],
          [poly.transform[0][1], poly.transform[1][1], poly.transform[2][1], poly.transform[3][1]],
          [poly.transform[0][2], poly.transform[1][2], poly.transform[2][2], poly.transform[3][2]],
          [poly.transform[0][3], poly.transform[1][3], poly.transform[2][3], poly.transform[3][3]],
        ]
        poly.plane = constructPlaneFromTransform(convertedTransform, poly.id, poly.class as SurfaceClass)
      })
      resultScene.setPolygonData(polygonData)

      // Some legacy rooms have only stackable surfaces polygons, which is not enough to replace walls and floor planes.
      const hasWallOrFloorPolygons = polygonData.plane_polygons
        .some(polygon => ['wall', 'floor'].includes(polygon.class))
      if (hasWallOrFloorPolygons) {
        planeData = { 
          planeData: polygonData.plane_polygons.map(poly => poly.plane)
        }
      }
    }
    if (planeData) {
      resultScene.setPlaneData(planeData)
      if (legacyPlaneData) {
        resultScene.setLegacyPlaneData(legacyPlaneData)
      }
    }

    // Build static stacking surfaces
    return Promise.resolve().then(() => {
      const stackables = polygonData
        ? polygonData.plane_polygons.filter(item => item.class === 'stackable')
          .map(data => makeStackableFromV1Data(data))
        : manifest.getStaticStackingSurfaces()?.horizontal.map(data => makeStackableFromV0Data(data))
      stackables?.forEach(stackItem => {
        gvGeomModel()?.addStackableSurfaceItem(
          stackItem.id, undefined /* no parent == static */, stackItem as StackableSurfaceParameters);
      });
    })
  }

  protected buildLights(assetsList: AssetsList) {
    const manifest = assetsList as SceneManifest
    const vm = gvViewManager() ? gvViewManager() as MultiSceneViewManager : undefined
    const camera = vm?.getCameraByIndex(this.cameraIndex)?.getThreeCamera()

    const directionalLights: THREE.DirectionalLight[] = []
    const pointLights: THREE.PointLight[] = []
    const spotLights: THREE.SpotLight[] = []
    const areaLights: THREE.RectAreaLight[] = []
    const helperObjects: THREE.Object3D[] = []

    const lights = manifest.getLightingData()?.lights
    if (lights) {
      let dirLightsCoount = 0
      if (Array.isArray(lights.directional)) {
        dirLightsCoount = lights.directional.length
        lights.directional.forEach((light, index) => {
          const castShadow = index === 0
          const objlight = WallspiceWebgl.createDirectionalColoredLight(
              light,
              castShadow,
              this.maxTextureSize,
              this.settings.onOffOptions.usePBR,
          )
          directionalLights.push(objlight)
          if (camera && this.settings.onOffOptions.enableDebugControls) {
            helperObjects.push(createDirectionalLightHelper(objlight, camera, index))
          }
        })
      }

      let pointLightsCoount = 0
      if (Array.isArray(lights.point)) {
        pointLightsCoount = lights.point.length
        lights.point.forEach((light, index) => {
          const castShadow = dirLightsCoount === 0 && index === 0
          const objlight = WallspiceWebgl.createPointColoredLight(light, castShadow, this.maxTextureSize,
            this.settings.onOffOptions.usePBR)
          pointLights.push(objlight)
          if (this.settings.onOffOptions.enableDebugControls) {
            helperObjects.push(createPointLightHelper(objlight, index))
          }
        })
      }

      if (Array.isArray(lights.spot)) {
        lights.spot.forEach((light, index) => {
            const castShadow = dirLightsCoount === 0 && pointLightsCoount === 0 && index === 0
            const objlight = WallspiceWebgl.createSpotColoredLight(light, castShadow, this.maxTextureSize,
              this.settings.onOffOptions.usePBR)
            spotLights.push(objlight)
            if (this.settings.onOffOptions.enableDebugControls) {
              helperObjects.push(createSpotLightHelper(objlight, index))
            }
        })
      }

      if (Array.isArray(lights.area)) {
        lights.area
          .filter((a) => !a.portal)
          .forEach((light, index) => {
            const objlight = WallspiceWebgl.createAreaColoredLight(light, this.settings.onOffOptions.usePBR)
            areaLights.push(objlight)
            if (this.settings.onOffOptions.enableDebugControls) {
              helperObjects.push(createRectAreaLightHelper(objlight, index))
            }
        })
      }
    }
    return Promise.resolve({
      directionalLights,
      pointLights,
      spotLights,
      areaLights,
      helperObjects,
    })
  }
}