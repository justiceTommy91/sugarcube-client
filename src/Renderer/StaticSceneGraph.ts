import * as THREE from 'three'
import {
  isAmbientLight,
  isAreaLight,
  isCamera,
  isDirectionalLight,
  isHemisphereLight,
  isLight,
  isLineObj,
  isMesh,
  isPointLight,
  isSkySphereObj,
  isSpotLight,
  StandardMesh,
} from './rendering/rendering_types'
import {
  baseboardObjPattern,
  ceilingObjPattern,
  doorBodyObjPattern,
  doorFrameObjPattern,
  doorGlassObjPattern,
  doorProxyObjPattern,
  floorObjPattern,
  openingProxyObjPattern,
  wallObjPattern,
  wallViewObjPattern,
  windowBodyObjPattern,
  windowFrameObjPattern,
  windowGlassObjPattern,
  windowProxyObjPattern,
} from './utils/scene_elements_rgx'

// Uses the provided geomagical tags, or names, to identify various
// scene items and keep tracks of them for easier access.
class StaticSceneGraph {

  private directionalLights: THREE.DirectionalLight[] = []
  private pointLights: THREE.PointLight[] = []
  private spotLights: THREE.SpotLight[] = []
  private areaLights: THREE.RectAreaLight[] = []
  private ambientLights: THREE.AmbientLight[] = []
  private hemisphereLights: THREE.HemisphereLight[] = []

  private staticViewCameras: THREE.Camera[] = []

  private skySphere: StandardMesh | null = null

  private windowsGlassObjects: StandardMesh[] = []
  private doorsGlassObjects: StandardMesh[] = []
  private windowsFrameObjects: StandardMesh[] = []
  private doorsFrameObjects: StandardMesh[] = []
  private windowsBodyObjects: StandardMesh[] = []
  private doorsBodyObjects: StandardMesh[] = []
  private windowsProxyObjects: StandardMesh[] = []
  private doorsProxyObjects: StandardMesh[] = []
  private glassDoorsProxyObjects: StandardMesh[] = []
  private openingsProxyObjects: StandardMesh[] = []

  private baseboardObjects: StandardMesh[] = []
  private wallsObjects: StandardMesh[] = []
  private floorsObjects: StandardMesh[] = []
  private ceilingsObjects: StandardMesh[] = []

  private allGeometryObjects: StandardMesh[] = []

  constructor(roomMeshGroup: THREE.Object3D) {
    roomMeshGroup.traverse(obj => {
      // Capture refrences to lighting objects.
      if (isLight(obj)) {
        if (isDirectionalLight(obj)) {
          this.directionalLights[this.directionalLights.length] = obj
        } else if (isPointLight(obj)) {
          this.pointLights[this.pointLights.length] = obj
        } else if (isSpotLight(obj)) {
          this.spotLights[this.spotLights.length] = obj
        } else if (isAreaLight(obj)) {
          this.areaLights[this.areaLights.length] = obj
        } else if (isAmbientLight(obj)) {
          this.ambientLights[this.ambientLights.length] = obj
        } else if (isHemisphereLight(obj)) {
          this.hemisphereLights[this.hemisphereLights.length] = obj
        }
        return
      }

      // Capture view cameras.
      if (isCamera(obj)) {
        this.staticViewCameras.push(obj)
        return
      }

      // Ignore 2d or non mesh objects.
      if (!isMesh(obj) || isLineObj(obj)) {
        return
      }

      // Capture the sky sphere object.
      if (isSkySphereObj(obj)) {
        this.skySphere = obj
        return
      }

      // Capture room geometries.
      const name = obj.name.toLowerCase().replace(/[[\]]/g, '')
      const windowGlassObjRgx = new RegExp(windowGlassObjPattern)
      const doorGlassObjRgx = new RegExp(doorGlassObjPattern)
      const windowFrameObjRgx = new RegExp(windowFrameObjPattern)
      const doorFrameObjRgx = new RegExp(doorFrameObjPattern)
      const windowBodyObjRgx = new RegExp(windowBodyObjPattern)
      const doorBodyObjRgx = new RegExp(doorBodyObjPattern)
      const baseboardObjRgx = new RegExp(baseboardObjPattern)
      const floorObjRgx = new RegExp(floorObjPattern)
      const wallObjRgx = new RegExp(wallObjPattern)
      const ceilingObjRgx = new RegExp(ceilingObjPattern)
      const wallViewObjRgx = new RegExp(wallViewObjPattern)
      const doorProxyObjRgx = new RegExp(doorProxyObjPattern)
      const windowProxyObjRgx = new RegExp(windowProxyObjPattern)
      const openingProxyObjRgx = new RegExp(openingProxyObjPattern)
      if (doorProxyObjRgx.test(name)) {
        this.doorsProxyObjects.push(obj)
      } else if (windowProxyObjRgx.test(name)) {
        this.windowsProxyObjects.push(obj)
      } else if (openingProxyObjRgx.test(name)) {
        this.openingsProxyObjects.push(obj)
      } else if (windowGlassObjRgx.test(name)) {
        this.windowsGlassObjects.push(obj)
      } else if (doorGlassObjRgx.test(name)) {
        this.doorsGlassObjects.push(obj)
      } else if (windowFrameObjRgx.test(name)) {
        this.windowsFrameObjects.push(obj)
      } else if (doorFrameObjRgx.test(name)) {
        this.doorsFrameObjects.push(obj)
      } else if (windowBodyObjRgx.test(name)) {
        this.windowsBodyObjects.push(obj)
      } else if (doorBodyObjRgx.test(name)) {
        this.doorsBodyObjects.push(obj)
      } else if (baseboardObjRgx.test(name)) {
        this.baseboardObjects.push(obj)
      } else if (floorObjRgx.test(name)) {
        this.floorsObjects.push(obj)
      } else if (wallObjRgx.test(name)) {
        this.wallsObjects.push(obj)
      } else if (ceilingObjRgx.test(name)) {
        this.ceilingsObjects.push(obj)
      }
      
      if (!wallViewObjRgx.test(name)
        && !doorProxyObjRgx.test(name)
        && !windowProxyObjRgx.test(name)
        && !openingProxyObjRgx.test(name)) {
        this.allGeometryObjects.push(obj)
      }

      // Filter custom specialized lists.
      this.glassDoorsProxyObjects = this.doorsProxyObjects.filter(doorProxyObj =>
        this.doorsGlassObjects.some(doorGlassObj =>
          doorGlassObj.userData?.wallElementId === doorProxyObj.userData?.wallElementId
        )
      )
    })
  }

  public getAllGeometryObjects() {
    return [...this.allGeometryObjects]
  }

  public getWallElementsGlassObjects() {
    return [...this.windowsGlassObjects, ...this.doorsGlassObjects]
  }

  public getWallElementsFrameObjects() {
    return [...this.windowsFrameObjects, ...this.doorsFrameObjects]
  }

  public getWallElementsBodyObjects() {
    return [...this.windowsBodyObjects, ...this.doorsBodyObjects]
  }

  public getBaseboardObjects() {
    return [...this.baseboardObjects]
  }

  public getWallsObjects() {
    return [...this.wallsObjects]
  }

  public getFloorsObjects() {
    return [...this.floorsObjects]
  }

  public getCeilingsObjects() {
    return [...this.ceilingsObjects]
  }

  public getDoorsProxyObjects() {
    return [...this.doorsProxyObjects]
  }

  public getGlassDoorsProxyObjects() {
    return [...this.glassDoorsProxyObjects]
  }

  public getWindowsProxyObjects() {
    return [...this.windowsProxyObjects]
  }

  public getOpeningsProxyObjects() {
    return [...this.openingsProxyObjects]
  }

  public getStaticViewsCameras() {
    return [...this.staticViewCameras]
  }

  public getSkySphereObject() {
    return this.skySphere
  }

  public getDirectionalLights() {
    return [...this.directionalLights]
  }

  public getPointLights() {
    return [...this.pointLights]
  }

  public getSpotLights() {
    return [...this.spotLights]
  }

  public getAreaLights() {
    return [...this.areaLights]
  }

  public getAmbientLights() {
    return [...this.ambientLights]
  }

  public getHemisphereLights() {
    return [...this.hemisphereLights]
  }

  public getAllLights() {
    return [
      ...this.directionalLights,
      ...this.pointLights,
      ...this.spotLights,
      ...this.areaLights,
      ...this.ambientLights,
      ...this.hemisphereLights,
    ]
  }
}

export default StaticSceneGraph