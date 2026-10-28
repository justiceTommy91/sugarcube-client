import * as THREE from 'three'
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js'
import * as constants from 'Renderer/constants'
import { getPolygonCentroid } from 'Renderer/utils/modelUtils'
import StaticSceneGraph from 'Renderer/StaticSceneGraph'
import { gvCurrentSettings } from 'Renderer/foundation/geom_app'
import DirectionalLightCookie from 'Renderer/DirectionalLightCookie'
import isMobile from 'utils/isMobile'

export const WARM_YELLOW = new THREE.Color().setRGB(253 / 255, 220 / 255, 200 / 255)

export const setupDirectionalLight = (light: THREE.DirectionalLight, castShadow: boolean,
  mobileTextureSize: number) => {
  light.userData.originalColor = light.color.clone()
  light.frustumCulled = false
  light.layers.enableAll()

  light.shadow.bias = constants.SHADOW_BIAS_DIRECTIONAL
  light.shadow.normalBias = constants.NORMAL_BIAS_DIRECTIONAL
  light.shadow.mapSize.width = isMobile() ? mobileTextureSize : 2048
  light.shadow.mapSize.height = isMobile() ? mobileTextureSize : 2048
  light.shadow.radius = 3.0
  light.shadow.camera.near = -10.0
  light.shadow.camera.far = 100.0
  light.shadow.camera.left = -10
  light.shadow.camera.right = 10
  light.shadow.camera.bottom = -10
  light.shadow.camera.top = 10
  light.shadow.camera.frustumCulled = false
  light.castShadow = castShadow
}

export const setupPointColoredLight = (light: THREE.PointLight, castShadow: boolean,
  mobileTextureSize: number) => {
    light.userData.originalColor = light.color.clone()
    light.frustumCulled = false
    light.layers.enableAll()

    light.shadow.bias = constants.SHADOW_BIAS_POINT
    light.shadow.mapSize.width = isMobile() ? mobileTextureSize : 2048
    light.shadow.mapSize.height = isMobile() ? mobileTextureSize : 2048
    light.shadow.radius = 2.0
    light.shadow.camera.near = 0.1
    light.shadow.camera.far = 50.0
    light.shadow.camera.frustumCulled = false
    light.castShadow = castShadow
}

export const setupSpotColoredLight = (light: THREE.SpotLight, castShadow: boolean,
  mobileTextureSize: number) => {
  light.userData.originalColor = light.color.clone()
  light.frustumCulled = false
  light.layers.enableAll()
  light.shadow.bias = constants.SHADOW_BIAS_SPOT
  light.shadow.mapSize.width = isMobile() ? mobileTextureSize : 2048
  light.shadow.mapSize.height = isMobile() ? mobileTextureSize : 2048
  light.shadow.radius = 2.0
  light.shadow.camera.near = 0.1
  light.shadow.camera.far = 50.0
  light.shadow.camera.frustumCulled = false
  light.castShadow = castShadow
}

export const setupAreaColoredLight = (light: THREE.RectAreaLight) => {
  light.userData.originalColor = light.color.clone()
  light.frustumCulled = false
  light.layers.enableAll()
}

export const createTextHelper = (text: string, size: number, position: THREE.Vector3) => {
  const fontSize = size * 10
  const canvas = document.createElement('canvas')
  canvas.width = (text.length * fontSize) * 2
  canvas.height = fontSize
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.font = `${fontSize}px Monospace`
    ctx.fillText(text, 0, fontSize)
  }

  const textTexture = new THREE.CanvasTexture(canvas)

  const geometry = new THREE.PlaneGeometry(0.2, 0.1)
  const material = new THREE.MeshBasicMaterial({
      map: textTexture,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
  })
  const plane = new THREE.Mesh(geometry, material)
  plane.position.copy(position)
  return plane
}

export const createDirectionalLightHelper = (light: THREE.DirectionalLight, camera: THREE.Camera, index: number) => {
  light.updateMatrix()
  light.updateMatrixWorld(true)
  light.target.updateMatrixWorld(true)
  // Move directional light helpers into the camera's frustum
  const cameraFront = camera.getWorldDirection(new THREE.Vector3())
  const targetDeltaPos = light.target.position.clone().sub(light.position)
  const cameraRight = cameraFront.clone().cross(camera.up)
  const lightDirection = targetDeltaPos.clone().normalize()
  const angleToHorizon = lightDirection.projectOnPlane(cameraFront).angleTo(cameraRight)
  const sideTranslation = cameraRight.multiplyScalar(angleToHorizon / Math.PI - 0.5)
  const tempLight = light.clone(true)
  tempLight.position.copy(camera.position).add(cameraFront.multiplyScalar(2)).add(sideTranslation)
  tempLight.target.position.copy(tempLight.position.clone().add(targetDeltaPos))
  tempLight.updateMatrixWorld(true)
  tempLight.target.updateMatrixWorld(true)
  const helper = new THREE.DirectionalLightHelper(tempLight, 0.1, 0x000000)
  helper.name = `Directional light helper ${index}`
  const debugLabel = createTextHelper(`${index}`, 8, helper.position)
  helper.add(debugLabel)
  return helper
}

export const createPointLightHelper = (light: THREE.PointLight, index: number) => {
  light.updateMatrix()
  light.updateMatrixWorld(true)
  const helper = new THREE.PointLightHelper(light, 0.1, 0x000000)
  helper.name = `Point light helper ${index}`
  const debugLabel = createTextHelper(`${index}`, 12, new THREE.Vector3(0, -0.15, 0))
  helper.add(debugLabel)
  return helper
}

export const createSpotLightHelper = (light: THREE.SpotLight, index: number) => {
  light.updateMatrix()
  light.updateMatrixWorld(true)
  light.target.updateMatrixWorld(true)
  const helper = new THREE.SpotLightHelper(light, 0x000000)
  helper.name = `Spot light helper ${index}`
  const debugLabel = createTextHelper(`${index}`, 12, helper.position)
  helper.add(debugLabel)
  return helper
}

export const createRectAreaLightHelper = (light: THREE.RectAreaLight, index: number) => {
  light.updateMatrix()
  light.updateMatrixWorld(true)
  const helper = new RectAreaLightHelper(light, 0x000000)
  helper.name = `Rect area light helper ${index}`
  const debugLabel = createTextHelper(`${index}`, 12, helper.position)
  helper.add(debugLabel)
  return helper
}

export const createSkySphere = (sceneBoundingbox: THREE.Box3 | null) => {
  // Set the texture resolution to 1k (1024x1024)
  const size = 1024
  
  // Create a canvas with 1k resolution
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const gradient = context?.createLinearGradient(0, 0, 0, size)

  // Create a vertical gradient from horizon to zenith, changing the zenith color
  // according to sun light status.
  const horizonColor = `rgb(173, 178, 188)`
  const zenithColor = gvCurrentSettings()?.debugSettings?.keepLocallyGeneratedLights
    ? `rgba(219, 227, 239, 1)` 
    : `rgb(157, 169, 186)`
  const midColor = gvCurrentSettings()?.debugSettings?.keepLocallyGeneratedLights
    ? `rgba(245, 253, 255, 1)`
    : `rgb(194, 205, 229)`
  gradient?.addColorStop(0, zenithColor)
  gradient?.addColorStop(0.3, midColor)
  gradient?.addColorStop(1, horizonColor)

  // Apply the gradient to the canvas
  if(context){
      context.fillStyle = gradient as CanvasGradient
      context.fillRect(0, 0, size, size)
  }
  const skyTexture = new THREE.CanvasTexture(canvas)
  const sceneBbox = sceneBoundingbox || new THREE.Box3(new THREE.Vector3(-5), new THREE.Vector3(5))
  const sceneRadius =  sceneBbox.getBoundingSphere(new THREE.Sphere).radius
  const skySphereGeometry = new THREE.SphereGeometry(sceneRadius * 1.2, 64, 64)

  // Flip sky sphere inside out, so that it doesn't block camera in postprocessing,
  // (eg. GTAO) passes that use FrontSide override materials.
  skySphereGeometry.scale(-1, 1, 1)
  skySphereGeometry.computeVertexNormals()
  const skySphereMaterial = new THREE.MeshBasicMaterial({
      side: THREE.FrontSide,
      map: skyTexture,
      color: 0xffffff,
  })

  skySphereMaterial.depthWrite = false
  skySphereMaterial.stencilWrite = true
  skySphereMaterial.stencilRef = constants.SKYSPHERE_STENCIL_REF
  skySphereMaterial.stencilFunc = THREE.EqualStencilFunc
  skySphereMaterial.toneMapped = false
  skySphereMaterial.needsUpdate = true
              
  const skySphere = new THREE.Mesh(skySphereGeometry, skySphereMaterial)
  skySphere.position.copy(sceneBbox.getCenter(new THREE.Vector3()))
  skySphere.renderOrder = constants.STENCILED_OBJECTS_RENDER_ORDER
  skySphere.name = constants.SKYSPHERE_NAME
  return skySphere
}

export const createSkyLightSource = () => {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 3)
  hemiLight.position.set(0, 1, 0)
  hemiLight.color.setHSL(0.6, 0.6, 0.6)
  hemiLight.groundColor.setHSL(0.095, 0.6, 0.75)
  return hemiLight
}

export const createSunLightSource = () => {
  const directionalLight = new THREE.DirectionalLight(WARM_YELLOW, 5)
  directionalLight.add(directionalLight.target)
  directionalLight.target.position.set(0, 0, -1)
  return directionalLight
}

export const createBounceLightSources = (count: number) =>
  Array.from({ length: count }, () => new THREE.RectAreaLight(WARM_YELLOW))

export const createDirectionalLightCookie = (sceneGraph: StaticSceneGraph,
  directionalLight: THREE.DirectionalLight) => {
  const glassDoorsProxyObjects = sceneGraph.getGlassDoorsProxyObjects()
  const windowsProxyObjects = sceneGraph.getWindowsProxyObjects()
  const directionalLightCookie = new DirectionalLightCookie()
  directionalLightCookie.setLight(directionalLight)
  directionalLightCookie.setProxyObjects(windowsProxyObjects, glassDoorsProxyObjects)
  return directionalLightCookie
}

export const refreshSunlightShadowProps = (sceneGraph: StaticSceneGraph,
  directionalLight: THREE.DirectionalLight) => {
  const sceneBoundingBox = new THREE.Box3()
  sceneGraph.getAllGeometryObjects().forEach(obj => sceneBoundingBox.expandByObject(obj))
  const sceneRadius = sceneBoundingBox.getBoundingSphere(new THREE.Sphere).radius
  const offsetRadius = sceneRadius * 1.5

  directionalLight.shadow.camera.left = - offsetRadius
  directionalLight.shadow.camera.right = offsetRadius
  directionalLight.shadow.camera.bottom = - offsetRadius
  directionalLight.shadow.camera.top = offsetRadius
  directionalLight.castShadow = true
  directionalLight.shadow.bias = 0.0005
  directionalLight.shadow.normalBias = 0.03
  directionalLight.shadow.camera.near = -10.0
  directionalLight.shadow.camera.far = 50.0
  directionalLight.shadow.mapSize.set(2048, 2048)
  directionalLight.shadow.camera.updateProjectionMatrix()
}

export const refreshSunlightForScene = (sceneGraph: StaticSceneGraph,
  directionalLight: THREE.DirectionalLight) => {
  const windowsProxyObjects = sceneGraph.getWindowsProxyObjects()
  const glassDoorsProxyObjects = sceneGraph.getGlassDoorsProxyObjects()
  const transparentWallElements = [...windowsProxyObjects, ...glassDoorsProxyObjects]
  const allRoomGeometries = sceneGraph.getAllGeometryObjects()

  // Calculate transparent wall elements dimensions.
  const dimensions = transparentWallElements.map(element => {
    const bbox = new THREE.Box3()
    const tempVec = new THREE.Vector3()
    const positionsAttribute = element.geometry.attributes.position
    for (let i = 0; i < positionsAttribute.count; i += 1) {
      tempVec.fromBufferAttribute(positionsAttribute, i)
      bbox.expandByPoint(tempVec)
    }
    const elementSize = bbox.getSize(new THREE.Vector3())
    return new THREE.Vector2(elementSize.x, elementSize.y)
  })

  // Sort list of doors and windows according to planar surface area.
  transparentWallElements.forEach((element, i) => {
    element.userData.planarDimensions = dimensions[i]
  })
  const sortedTransparentWallElements = [...transparentWallElements].sort((elementA, elementB) => {
    const sizeA = elementA.userData.planarDimensions
    const sizeB = elementB.userData.planarDimensions
    return sizeA.x * sizeA.y - sizeB.x * sizeB.y
  })
  const positionsAndWeights = sortedTransparentWallElements.map(element => {
    const elementPosition = new THREE.Vector3()
    element.matrix.decompose(elementPosition, new THREE.Quaternion, new THREE.Vector3())
    const elementSize = element.userData.planarDimensions as THREE.Vector2
    const elementArea = elementSize.x * elementSize.y
    delete element.userData.planarDimensions
    return { position: elementPosition, weight: elementArea }
  })

  // A centroid is calculated using the floor's point cloud
  // to avoid out-of-room center points for concave room shapes.
  const roomBbox = new THREE.Box3()
  allRoomGeometries.forEach(object => roomBbox.expandByObject(object))
  const floor = sceneGraph.getFloorsObjects()[0]
  const localVertices: THREE.Vector3[] = []
  const posAttirbute = floor.geometry.getAttribute('position')
  for (let i = 0; i < posAttirbute.count; i += 1) {
    const vertex = new THREE.Vector3().fromBufferAttribute(posAttirbute, i)
    localVertices.push(vertex)
  }
  const roomCenter = getPolygonCentroid(localVertices) || new THREE.Vector3()
  roomCenter.applyMatrix4(floor.matrixWorld)
  const roomRadius = roomBbox.getBoundingSphere(new THREE.Sphere).radius

  const result = new THREE.Vector3(0, 0, 0)
  while (positionsAndWeights.length) {
    result.set(0, 0, 0)
    // Calculate weighted average position of transparent wall elements.
    const totalWeight = positionsAndWeights.reduce((sum, { weight }) => sum + weight, 0)
    for (let i = 0; i < positionsAndWeights.length; i += 1) {
      const position = positionsAndWeights[i].position
      const weight = positionsAndWeights[i].weight / totalWeight
      // Since the scene isn't centered at the origin, weighted positions
      // are calculated by lerping towards center point using the weight factor.
      const weightedPosition = position.lerp(roomCenter, 1 - weight)
      result.add(weightedPosition)
    }
    result.divideScalar(positionsAndWeights.length)
    
    // Push away from scene's center horizontally.
    const direction = new THREE.Vector3().subVectors(result, roomCenter).normalize().setComponent(1, 0)
    result.add(direction.multiplyScalar(roomRadius))
    if (!roomBbox.containsPoint(result)) {
      break
    }

    // Remove the smallest of the elements, and try again.
    positionsAndWeights.shift()
  }
  result.y += (roomBbox.max.y - roomBbox.min.y) / 2

  // Avoid hitting windows head on by adjusting angle of incidence to the closest wall.
  // Cast a ray from the light's target to the light source, to hit front facing walls only.
  const position = new THREE.Vector3()
  const raycast = new THREE.Raycaster(roomCenter, new THREE.Vector3().subVectors(result, roomCenter))
  const intersects = raycast.intersectObjects(allRoomGeometries)
  const closestElementIntersection = intersects[intersects.length - 1]
  if (!closestElementIntersection?.face) {
    position.copy(result)
  } else {
    const intersectionNormal = closestElementIntersection.face.normal.clone()
      .transformDirection(closestElementIntersection.object.matrixWorld).normalize()
    // Calculate normal and tangent components of the casted ray.
    const intersectionPoint = closestElementIntersection.point.setComponent(1, roomCenter.y)
    const vectorToIntersection = result.clone().setComponent(1, roomCenter.y).sub(intersectionPoint)
    const vNormalLen = Math.abs(vectorToIntersection.dot(intersectionNormal))
    const vTangent = vectorToIntersection.clone().sub(intersectionNormal.clone()
      .multiplyScalar(vectorToIntersection.dot(intersectionNormal)))
    // Skip if angle of incidence already exceeds minimum angle.
    const minRad = THREE.MathUtils.degToRad(35)
    const reqT = vNormalLen * Math.tan(minRad)
    if (vTangent.length() >= reqT) {
      position.copy(result)
    } else {
      // Slide the generated position horizontally with the tanget distance.
      const delta = reqT - vTangent.length()
      result.addScaledVector(vTangent.clone().normalize(), delta)
      position.copy(result)
    }
  }

  directionalLight.position.copy(position)

  const sceneBoundingBox = new THREE.Box3()
  sceneGraph.getAllGeometryObjects().forEach(obj => sceneBoundingBox.expandByObject(obj))
  const sceneCenter = sceneBoundingBox.getCenter(new THREE.Vector3())
  const direction = sceneCenter.clone().setComponent(1, 0).sub(position).normalize()
  directionalLight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction)
  directionalLight.updateMatrixWorld()
  directionalLight.target.updateMatrixWorld()
}

export const refreshBouncelightForScene = (sceneGraph: StaticSceneGraph,
  areaLights: THREE.RectAreaLight[]) => {
  const windowsProxyObjects = sceneGraph.getWindowsProxyObjects()
  const glassDoorsProxyObjects = sceneGraph.getGlassDoorsProxyObjects()
  const transparentWallElements = [...windowsProxyObjects, ...glassDoorsProxyObjects]

  // Calculate transparent wall elements dimensions.
  const dimensions = transparentWallElements.map(element => {
    const bbox = new THREE.Box3()
    const tempVec = new THREE.Vector3()
    const positionsAttribute = element.geometry.attributes.position
    for (let i = 0; i < positionsAttribute.count; i += 1) {
      tempVec.fromBufferAttribute(positionsAttribute, i)
      bbox.expandByPoint(tempVec)
    }
    const elementSize = bbox.getSize(new THREE.Vector3())
    return new THREE.Vector2(elementSize.x, elementSize.y)
  })

  // Adjust area lights per transparent wall element.
  transparentWallElements.forEach((element, i) => {
    const areaLight = areaLights[i]
    if (!areaLight) {
      return
    }

    const elementSize = dimensions[i]
    const elementUp = new THREE.Vector3().setFromMatrixColumn(element.matrixWorld, 1)
    const elementPosition = new THREE.Vector3()
    const elementRotation = new THREE.Quaternion()
    const elementScale = new THREE.Vector3()
    element.matrix.decompose(elementPosition, elementRotation, elementScale)

    const intensityPerM2 = 5 / (elementSize.x * elementSize.y)
    areaLight.intensity = intensityPerM2
    areaLight.width = elementSize.x
    areaLight.height = elementSize.y
    const additionalRotation = new THREE.Quaternion().setFromAxisAngle(elementUp, Math.PI)
    areaLight.quaternion.copy(elementRotation.multiply(additionalRotation))
    areaLight.position.copy(elementPosition)
    areaLight.updateMatrixWorld()
  })

  if (transparentWallElements.length < areaLights.length) {
    areaLights.slice(transparentWallElements.length).forEach(light => {
      light.intensity = 0
      light.visible = false
    })
  }
}