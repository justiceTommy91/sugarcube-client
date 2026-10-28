import * as THREE from 'three'

import { MultiviewAssetManager } from 'Renderer/assets/MultiviewAssetManager'
import { GrandCentral } from 'Renderer/GrandCentral'
import type { AssetsList } from "Renderer/assets/AssetsList"
import type { AssetSelectorOptions, AssetSelectorDeviceConfig } from 'Renderer/assets/Types'
import { RoomGLTFAssets } from 'Renderer/assets/RoomGLTFAssets'
import { gvCurrentCamera, gvStartupWarden } from 'Renderer/foundation/geom_app'
import {
  PLANE_DATA_READY,
} from 'Renderer/StartupWarden'

import * as constants from 'Renderer/constants'
import { PolygonType } from 'Renderer/assets/Types'
import { Polygon3 } from 'Renderer/geometry/Polygon3'
import { GeomCamera } from 'Renderer/multiview/geom_camera'
import { Vector3 } from 'Renderer/geometry'

import type { ViewWithScene } from 'Renderer/multiview/multiscene_view_manager'
import { CameraViewFinder } from 'Renderer/multiview/camera_view_finder'
import { findAllCameras } from './camera_utils'


type CameraTransformInfo = {
  worldTransform: THREE.Matrix4
  invWorldProjMat: THREE.Matrix4
}

const workspace = {
  threeVec1: new THREE.Vector3(),
  threeVec2: new THREE.Vector3(),
}

// LegacyRoomFreeCameraSupport takes care of adapting a legacy multiview room to support
// free camera and camera animation: create the common walls mesh, initialize all the cameras, etc.
export class LegacyRoomFreeCameraAdapter {
  private meshPromise: Promise<THREE.Group | null>
  private buildComplete = false
  private panoTextures: (THREE.Texture | null)[] = []
  private depthTextures: (THREE.Texture | null)[] = []
  private cameraTransforms: CameraTransformInfo[] = []
  private animationFrameId: number | null = 0

  constructor(views: ViewWithScene[], assetsList: AssetsList, options: AssetSelectorOptions,
    deviceConfig: AssetSelectorDeviceConfig) {
      const positioningReadyPromise = new Promise((resolve) => {
        gvStartupWarden()?.registerCallback(PLANE_DATA_READY, resolve)
      })
      this.animate = this.animate.bind(this)
      this.meshPromise = positioningReadyPromise.then(() =>
        this.buildTexturedMesh(views, assetsList, options, deviceConfig).then((mesh) => {
          this.buildComplete = true
          if (mesh) {
            this.animate(mesh)
          }
          return mesh
        }))
  }

  public cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  public getWallsMesh() {
    return this.meshPromise
  }

  public isBuildComplete() {
    return this.buildComplete
  }

  private animate(rootObject: THREE.Object3D) {
    if (rootObject.visible) {
      this.updateBestViewMix(rootObject)
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate(rootObject))
  }

  public updateBestViewMix(rootObject: THREE.Object3D) {
    const transform = gvCurrentCamera()?.getThreeCamera()?.matrixWorld
    if (!transform) {
      return
    }
    const bestView = this.cameraTransforms
      .map(info => LegacyRoomFreeCameraAdapter.estimateTransformSimilarity(transform, info.worldTransform))
      .reduce((accum, curr, index) => curr > accum.mixValue ? { cameraIndex: index, mixValue: curr } : accum,
        { cameraIndex: -1, mixValue: 0.0 })

    const info: CameraTransformInfo | undefined = this.cameraTransforms[bestView.cameraIndex]
    rootObject.children.forEach((child) => {
      const childAsMesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
      if (child.userData.polygonID !== undefined) {
        childAsMesh.material.uniforms.bestMap.value = bestView.cameraIndex >= 0
          ? this.panoTextures[bestView.cameraIndex]
          : null
        childAsMesh.material.uniforms.bestCameraMix.value = bestView.cameraIndex >= 0 ? bestView.mixValue : 0.0
        if (info) {
          childAsMesh.material.uniforms.bestCameraInvWorldProjMat.value.copy(info.invWorldProjMat)
        }
      } else if (child.userData.isDepthAdapter) {
        childAsMesh.material.uniforms.opacity.value = bestView.mixValue
        childAsMesh.material.uniforms.depthMap.value = this.depthTextures[bestView.cameraIndex] || null
      }
    })
  }

  private static estimateTransformSimilarity(mat1: THREE.Matrix4, mat2: THREE.Matrix4) {
    const dir1 = workspace.threeVec1.set(mat1.elements[8], mat1.elements[9], mat1.elements[10])
    const dir2 = workspace.threeVec2.set(mat2.elements[8], mat2.elements[9], mat2.elements[10])
    const directionSimiliarity = dir1.dot(dir2)

    const pos1 = workspace.threeVec1.setFromMatrixPosition(mat1)
    const pos2 = workspace.threeVec2.setFromMatrixPosition(mat2)
    const maxDistance = 2.0
    const distance = pos1.distanceTo(pos2)
    const posSimiliarity = Math.max(1.0 - distance / maxDistance, 0.0)
    return Math.min(directionSimiliarity, posSimiliarity)
  }

  private async buildTexturedMesh(
    views: ViewWithScene[],
    assetsList: AssetsList,
    options: AssetSelectorOptions,
    deviceConfig: AssetSelectorDeviceConfig
  ): Promise<THREE.Group | null> {
    // Assuming that all scenes have the same polygon data:
    const polygonData = views[0]?.scene?.getPolygonData()
    if (!polygonData) {
      return Promise.resolve(null)
    }

    const assetManager = new MultiviewAssetManager(
      assetsList,
      options,
      deviceConfig,
      GrandCentral.getDispatcher(),
      () => {},
    )
    assetManager.startDownload()

    const polygons = polygonData.plane_polygons
    const cameras = views.map(view => view.camera)

    const panoTextureRecords = await Promise.all(cameras.map((_, cameraIndex) =>
      assetManager.getTextureOrNullForCamera(constants.PANORAMA_ASSET_NAME, cameraIndex)))
    this.panoTextures = panoTextureRecords.map((record) => record ? record.texture : null)

    const depthTextureRecords = await Promise.all(cameras.map((_, cameraIndex) =>
      assetManager.getTextureOrNullForCamera(constants.OCCLUSION_MAP_ASSET_NAME, cameraIndex)))
    this.depthTextures = depthTextureRecords.map((record) => record ? record.texture : null)

    if (assetsList instanceof RoomGLTFAssets) {
      await LegacyRoomFreeCameraAdapter.initAllCamerasDefaults(assetsList, views, this.panoTextures)
    }
    this.cameraTransforms = cameras.map((geomCam) => {
      const threeCamera = geomCam.getThreeCamera()
      if (!threeCamera) {
        return {
          worldTransform: new THREE.Matrix4(),
          invWorldProjMat: new THREE.Matrix4(),
        }
      }
      return {
        worldTransform: threeCamera.matrixWorld.clone(),
        invWorldProjMat: new THREE.Matrix4().multiplyMatrices(threeCamera.projectionMatrix,
          threeCamera.matrixWorldInverse)
      }
    })
    return LegacyRoomFreeCameraAdapter.buildTexturedPolygons(polygons, this.panoTextures, cameras)
  }

  private static buildTexturedPolygons(planePolygons: Array<PolygonType>, wallTextures: (THREE.Texture | null)[],
    cameras: GeomCamera[]) {
    const planePolygonsAsMeshes = new THREE.Group()
    planePolygonsAsMeshes.name = `textured polygons mesh`

    const acceptedClasses = [`wall`, `floor`, `ceiling`]
    const polys = planePolygons
      .filter((polygon) => acceptedClasses.some(cls => polygon.class === cls))
      .map(polygon => ({ ...Polygon3.CreateFromManifestPolygon(polygon), id: polygon.id }))

    const polyBestCameras: number[] = []
    polys.forEach((polygon, polyIndex) => {
      const normal = polygon.zAxis
      // Find which camera is this polygon faces the best,
      // i.e. the dot product of poly's normal and camera view direction vector is close to -1.
      let bestCameraIdx = cameras.reduce((accum, current, index) => {
        const viewDir: Vector3 = current.getUnitViewDir()
        const dot = viewDir.dot({ dx: normal.x, dy: normal.y, dz: normal.z })
        return (dot < accum.dot) ? { dot, index } : accum
      }, { dot: Infinity, index: -1 }).index
      bestCameraIdx = Math.max(bestCameraIdx, 0)
      polyBestCameras[polyIndex] = bestCameraIdx
    })

    polys.forEach((polygon, index) => {
      const vertexBuffer = new Float32Array(polygon.vertices.map(v => v.toArray()).flat())
      const geometry = new THREE.BufferGeometry()
      geometry.setIndex(polygon.indices || [])
      geometry.setAttribute('position', new THREE.BufferAttribute(vertexBuffer, 3))

      const texture = wallTextures[polyBestCameras[index]]
      const camera = cameras[polyBestCameras[index]]

      const width = texture?.image ? texture.image.width : 1
      const height = texture?.image ? texture.image.height : 1
      if (camera) {
        const uvs = polygon.vertices.map(v => {
          const inPixels = camera.worldToScreenFloat({ x: v.x, y: v.y, z: v.z})
          return [
            inPixels.x / width,
            1.0 - inPixels.y / height,
          ]
        }).flat()
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
      }

      geometry.computeVertexNormals()
      const material = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldPosition;

          void main() {
            vUv = uv;
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D map;
          uniform float opacity;

          uniform sampler2D bestMap;
          uniform mat4 bestCameraInvWorldProjMat;
          uniform float bestCameraMix;

          varying vec2 vUv;
          varying vec3 vWorldPosition;

          void main() {
            vec4 color = texture2D(map, vUv);
            color.a = opacity;
            if (bestCameraMix > 0.0) {
              vec4 bestCameraNDCPos = bestCameraInvWorldProjMat * vec4(vWorldPosition, 1.0);
              bestCameraNDCPos.xyz /= bestCameraNDCPos.w;
              vec2 bestCamUv = 0.5 * (bestCameraNDCPos.xy + 1.0);
              color = mix(color, texture2D(bestMap, bestCamUv), bestCameraMix);
            }
            gl_FragColor = color;
          }
        `,
        uniforms: {
          map: { value: texture },
          bestMap: { value: null },
          opacity: { value: 1.0 },
          bestCameraInvWorldProjMat: { value: new THREE.Matrix4() },
          bestCameraMix: { value: 0.0 },
        },
        // transparent: true,
      })
      const mesh = new THREE.Mesh(geometry, material)
      planePolygonsAsMeshes.add(mesh)

      mesh.userData.polygonID = polygon.id
    })

    // Make sure that this mesh is rendered first, and won't render over shadow plane, etc.
    planePolygonsAsMeshes.renderOrder = -1
    const occlusionQuad = LegacyRoomFreeCameraAdapter.createOcclusionMesh()
    occlusionQuad.renderOrder = 1
    planePolygonsAsMeshes.add(occlusionQuad)
    planePolygonsAsMeshes.visible = false
    return planePolygonsAsMeshes
  }

  private static initAllCamerasDefaults(roomGltfAssets: RoomGLTFAssets, views: ViewWithScene[],
    textures: (THREE.Texture | null)[]) {
    return roomGltfAssets.getParsedGltfScene().then((resultGroup) => {
      if (resultGroup === null) {
        return
      }
      const cameraCount = roomGltfAssets.getCamerasCount()
      const cameraObjects: (THREE.Object3D | null)[] = new Array(cameraCount).fill(null)
      findAllCameras(resultGroup, cameraObjects)
      cameraObjects.forEach((gltfCam, index) => {
        const view = views[index]
        const geomThreeCam = view.camera.getThreeCamera()
        if (geomThreeCam && gltfCam) {
          gltfCam.updateMatrix()
          geomThreeCam.matrix.copy(gltfCam.matrix)
          geomThreeCam.matrix.decompose(geomThreeCam.position, geomThreeCam.quaternion, geomThreeCam.scale)
          geomThreeCam.updateMatrixWorld(true)
        }
        const texture = textures[index]
        if (texture && texture.image) {
          const width = texture.image.width
          const height = texture.image.height
          view.camera.setViewSize(width, height)
        }
        view.cameraDefaults = CameraViewFinder.getViewFromCamera(view.camera)
      })
    })
  }

  private static createOcclusionMesh() {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
       1,  1, 0,
       1, -1, 0,
      -1, -1, 0,
      -1,  1, 0,
    ], 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
      1, 1,
      1, 0,
      0, 0,
      0, 1,
    ], 2))
    geometry.setIndex([
      0, 1, 2,
      2, 3, 0,
    ])

    const material = new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            #include <common>
            uniform int frameNum;
            uniform sampler2D depthMap;
            uniform float opacity;
            varying vec2 vUv;

            void main() {
              float rnd = rand(gl_FragCoord.xy);
              if (rnd > opacity) discard;

              float near = 0.2;
              float far = 30.0;
              vec4 fetch = texture2D(depthMap, vUv);
              if(fetch.a < 0.5) discard; // reject floor fragments
              // if(fetch.r == 0.0 && fetch.g == 0.0 && fetch.b == 0.0) discard; // see GFX-3192
              float z = 0.0099609375 * (fetch.r * 65536.0 + fetch.g * 256.0 + fetch.b);
              float a = far / (far - near);
              float b = far * near / (near - far);
              float bias = 0.001;

              float depthValue = (a + b / z) + bias;

              gl_FragDepthEXT = depthValue;
              // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
        `,
        uniforms: {
          depthMap: { value: null },
          opacity: { value: 1.0 },
        },
    })
    material.side = THREE.DoubleSide
    material.colorWrite = false
    material.extensions.fragDepth = true
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `Legacy mesh adapter depth quad`
    mesh.frustumCulled = false
    mesh.userData.isDepthAdapter = true
    return mesh
  }
}