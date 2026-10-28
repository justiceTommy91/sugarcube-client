import * as THREE from 'three'
import { isMesh } from 'Renderer/rendering/rendering_types'
import { IOffscreenRenderContext } from 'Renderer/rendering/OffscreenRenderer'
import StaticSceneGraph from 'Renderer/StaticSceneGraph'
import CustomStandardMaterial from 'Renderer/CustomStandardMaterial'
import { exportHDRblobFromPixelData, projectEquirectRTfromMipmaps } from '../utils/rgbeUtils'
import PropertyManager from '../utils/property_manager'
import { getPolygonCentroid } from '../utils/modelUtils'
import { getTexturePerceivedBrightness } from '../utils/textureUtils'

// Room builder scenes created before this date shouldn't be customized.
export const cutoffDate = new Date(`2025-03-01T00:00:00Z`)

const BASE_AMBIENT_INTENSITY = 1.5
const AMBIENT_INTENSITY_PER_WINDOW = 0.1
const BASE_DIRECTIONAL_INTENSITY = 30
const WARM_YELLOW = new THREE.Color().setRGB(253 / 255, 220 / 255, 200 / 255)

export function adjustSceneLighting(sceneGraph: StaticSceneGraph, scene: THREE.Scene,
  stateCtx: PropertyManager) {

  // Add an ambient light to the scene to mimic the light bounces. It's intensity is
  // dependent on transparent windows/doors count, and wall colors (brightness) as well.
  const wallObject = sceneGraph.getWallsObjects()[0]
  const wallBrightness = getTexturePerceivedBrightness(wallObject)
  const windowsProxyObjects = sceneGraph.getWindowsProxyObjects()
  const glassDoorsProxyObjects = sceneGraph.getGlassDoorsProxyObjects()
  const transparentWallElements = [...windowsProxyObjects, ...glassDoorsProxyObjects]
  const skyLightReducer = AMBIENT_INTENSITY_PER_WINDOW * transparentWallElements.length
  const totalAmbient = BASE_AMBIENT_INTENSITY - skyLightReducer + (1 - wallBrightness)
  const ambientLight = new THREE.AmbientLight(WARM_YELLOW, Math.max(totalAmbient, 0))
  stateCtx.applyMethod(scene, `add`, ambientLight)

  // Reduce punctual lights intensities to avoid overlit scenes.
  sceneGraph.getPointLights().forEach((pointLight) => {
    const intensity = pointLight.intensity * 0.25
    stateCtx.applyPropertyChange(pointLight, `color`, WARM_YELLOW)
    stateCtx.applyPropertyChange(pointLight, `intensity`, intensity)
  })

  // Raise generated directional light intensity to avoid dark scenes.
  // or disable if no windows or transparent doors exist.
  const sunIntensity = transparentWallElements.length ? BASE_DIRECTIONAL_INTENSITY : 0
  sceneGraph.getDirectionalLights().forEach(directionalLight => {
    stateCtx.applyPropertyChange(directionalLight, `intensity`, sunIntensity)
  })

  // Sky light is set to a bright white color.
  const whiteColor = new THREE.Color().setRGB(1, 1, 1)
  stateCtx.applyPropertyChange(scene, `background`, whiteColor)

  // The current environment map's lighting contribution is disabled. 
  sceneGraph.getAllGeometryObjects().forEach(mesh => {
    if ('envMapIntensity' in mesh.material) {
      stateCtx.applyPropertyChange(mesh.material, `envMapIntensity`, -1000)
    }
  })

  // The generated hemisphere light intensity is weakened.
  sceneGraph.getHemisphereLights().forEach(hemiLight => {
    stateCtx.applyPropertyChange(hemiLight, `intensity`, 2)
  })

  // Disable the custom material's specular reflections.
  sceneGraph.getAllGeometryObjects().forEach(mesh => {
    const customMaterial = mesh.material as CustomStandardMaterial
    const disableSpecularUniform = customMaterial.uniforms?.disableDirectSpecular
    if (disableSpecularUniform) {
      stateCtx.applyPropertyChange(disableSpecularUniform, `value`, true)
    }
  })

  // Disable the light cookie filter for the directional light sources.
  sceneGraph.getAllGeometryObjects().forEach(mesh => {
    const customMaterial = mesh.material as CustomStandardMaterial
    const lightCookieEnabled = customMaterial.uniforms?.uCookieEnabled
    if (lightCookieEnabled) {
      stateCtx.applyPropertyChange(lightCookieEnabled, `value`, false)
    }
  })

  // The locally generated lights contribution is temporarily enabled.
  sceneGraph.getAreaLights().forEach(light => {
    stateCtx.applyPropertyChange(light, `visible`, true)
  })
}

export function showAllRoomGeometryOnly(sceneGraph: StaticSceneGraph, scene: THREE.Scene,
  stateCtx: PropertyManager) {
  // Show all items to revert the effect of the view blocking visibility modifier.
  sceneGraph.getAllGeometryObjects().forEach(mesh => {
    stateCtx.applyPropertyChange(mesh, `visible`, true)
    stateCtx.applyPropertyChange(mesh.material, `colorWrite`, true)
    stateCtx.applyPropertyChange(mesh.material, `depthWrite`, true)
  })

  // Hide sky sphere as scene background color is used instead
  const skySphere = sceneGraph.getSkySphereObject()
  if (skySphere) {
    stateCtx.applyPropertyChange(skySphere, `visible`, false)
  }
  
  // https://geomagical.atlassian.net/browse/GFX-4680
  // Hide all furniture items, placeholders, and all room accessories.
  const wallsObjects = sceneGraph.getWallsObjects()
  const floorsObjects = sceneGraph.getFloorsObjects()
  const ceilingsObjects = sceneGraph.getCeilingsObjects()
  const wallsFramesObjects = sceneGraph.getWallElementsFrameObjects()
  const wallsBodyObjects = sceneGraph.getWallElementsBodyObjects()
  scene.traverse(obj => {
    // Avoid hiding the walls, floor, ceiling, and wall elements bodies.
    if (!isMesh(obj)
      || wallsObjects.includes(obj)
      || ceilingsObjects.includes(obj)
      || floorsObjects.includes(obj)
      || wallsFramesObjects.includes(obj)
      || wallsBodyObjects.includes(obj)
    ) {
      return
    }

    // Hide any other visible object.
    stateCtx.applyPropertyChange(obj, `visible`, false)
  })
}

export function centerSceneAtOriginForEnvMapRender(sceneGraph: StaticSceneGraph,
  scene: THREE.Scene, stateCtx: PropertyManager) {
  // A centroid is calculated using the floor's point cloud
  // to avoid out-of-room center points for concave room shapes.
  const floor = sceneGraph.getFloorsObjects()[0]
  const localVertices: THREE.Vector3[] = []
  const posAttirbute = floor.geometry.getAttribute('position')
  for (let i = 0; i < posAttirbute.count; i += 1) {
    const vertex = new THREE.Vector3().fromBufferAttribute(posAttirbute, i)
    localVertices.push(vertex)
  }
  let centroid = getPolygonCentroid(localVertices)
  centroid?.applyMatrix4(floor.matrixWorld)

  // The scene is centered at the calculated centroid as the used threejs
  // module that renders the environment map automatically places the camera
  // at the origin.
  const bbox = new THREE.Box3()
  sceneGraph.getAllGeometryObjects().forEach(object => bbox.expandByObject(object))
  if (!centroid) {
    centroid = bbox.getCenter(new THREE.Vector3())
  } else {
    const size = bbox.getSize(new THREE.Vector3())
    centroid.y += 0.5 * size.y
  }

  const centerPos = scene.position.clone().sub(centroid)
  stateCtx.applyPropertyChange(scene, `position`, centerPos)
}

export function initializeCubemapSceneRendererState(sceneGraph: StaticSceneGraph,
  scene: THREE.Scene, offscreenRenderCtx: IOffscreenRenderContext) {
  const dirLights = sceneGraph.getDirectionalLights()
  const hemiLights = sceneGraph.getHemisphereLights()
  const areaLights = sceneGraph.getAreaLights()
  const allGeometryObjects = sceneGraph.getAllGeometryObjects()
  const toBeHidden = [...dirLights, ...hemiLights, ...areaLights, ...allGeometryObjects]

  const tmpStateCtx = new PropertyManager()
  toBeHidden.forEach(obj => tmpStateCtx.applyPropertyChange(obj, `visible`, false))

  // Issue a pre-render call with the scene having no visible items nor
  // shadow casting lights. This is a workaround required to fix an issue
  // where ThreeJS renders the scene's shadow map to populate the renderer
  // internal currentRenderState, resulting in recompiling some shaders
  // on the next render when the state is populated.
  offscreenRenderCtx.render(scene, new THREE.Camera())

  tmpStateCtx.revertChanges()
}

export function renderCubemap(sceneGraph: StaticSceneGraph, scene: THREE.Scene,
  offscreenRenderCtx: IOffscreenRenderContext, initRendererSceneState = false) {
  
  const stateCtx = new PropertyManager()

  adjustSceneLighting(sceneGraph, scene, stateCtx)
  showAllRoomGeometryOnly(sceneGraph, scene, stateCtx)
  centerSceneAtOriginForEnvMapRender(sceneGraph, scene, stateCtx)

  if (initRendererSceneState)
    initializeCubemapSceneRendererState(sceneGraph, scene, offscreenRenderCtx)

  const genericRenderer = offscreenRenderCtx as unknown as THREE.WebGLRenderer
  const pmremGenerator = new THREE.PMREMGenerator(genericRenderer)
  const cubemapRenderTarget = pmremGenerator.fromScene(scene)

  stateCtx.revertChanges()

  return cubemapRenderTarget
}

export function generateHDRfromCubemap(cubemapTexture: THREE.Texture,
  offscreenRenderCtx: IOffscreenRenderContext, download = false) {  

  const envMapRenderTarget = projectEquirectRTfromMipmaps(offscreenRenderCtx, cubemapTexture)

  const width = envMapRenderTarget.width
  const height = envMapRenderTarget.height
  const uintBuff = new Uint16Array(width * height * 4)
  offscreenRenderCtx.readRenderTargetPixels(envMapRenderTarget, 0, 0, width, height, uintBuff)
  envMapRenderTarget.dispose()

  const hdrBlob = exportHDRblobFromPixelData(uintBuff, width, height)
  
  if (download) {
    const url = URL.createObjectURL(hdrBlob)
    try {
      const linkElement = document.createElement("a")
      linkElement.href = url
      linkElement.download = `environment.hdr`
      linkElement.style.display = `none`
      document.body.appendChild(linkElement)
      linkElement.click()
      linkElement.remove()
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return hdrBlob
}
