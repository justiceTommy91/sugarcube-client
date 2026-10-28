import {
  GLTFGeomagicalCamera,
  RoomGLTFAssetData,
  AssetName,
  ManifestExtra,
  DepthOcclusionMetadata,
  LightingData,
  GLTFImage
} from 'Renderer/assets/Types'
import { AssetsList } from 'Renderer/assets/AssetsList'
import * as constants from 'Renderer/constants'
import CustomGLTFLoader from 'Renderer/gltf/CustomGLTFLoader'
import { GLTf } from 'Renderer/gltf/gltf'
import { GrandCentral } from 'Renderer/GrandCentral'
import {
  NOTIFY_VIEWER_ERROR,
} from 'Renderer/geomviewer/geom_constants'
import { PlaneData, Point2D } from 'Renderer/geomviewer/geom_types'
import { GltfParseOptions, parseGltfNodeWorldTransform } from 'Renderer/gltf/gltfUtils'
import { CameraExtrinsics, CameraIntrinsics } from 'Renderer/multiview/camera_types'
import { extractPosition, extractQuaternionFromMat4 } from 'Renderer/geometry/utilities'
import { toQuat4 } from 'Renderer/geometry'

type ImageName = typeof constants.GLTF_PANO_IMAGE_NAME |
  typeof constants.GLTF_DEPTH_IMAGE_NAME |
  typeof constants.GLTF_SEGMENTATION_IMAGE_NAME

type WallColorImageName = typeof constants.GLTF_SHADING_IMAGE_NAME |
  typeof constants.GLTF_RESIDUAL_IMAGE_NAME |
  typeof constants.GLTF_SHADING_INPAINT_IMAGE_NAME |
  typeof constants.GLTF_RESIDUAL_INPAINT_IMAGE_NAME

// Assumption here is that versions in gltf will always be in a simple form of "number.number"
const simpleVersionParse = (text: string | undefined) => {
  if (text === undefined) {
    return {
      major: undefined,
      minor: undefined,
    }
  }
  const [major, minor] = text.split('.')
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
  }
}

/**
 * RoomGLTFAssets is a wrapper around room gltf json object. It implements the unified asset
 * list reading interface and supports SceneManifest reading conventions.
 */
export class RoomGLTFAssets implements AssetsList {
  protected gltf: RoomGLTFAssetData
  protected parseGltfScenePromise: Promise<THREE.Group | null>
  protected baseUrl: string

  constructor(gltf: RoomGLTFAssetData, baseUrl: string, options: GltfParseOptions = { ignoreTextures: true }) {
    this.gltf = gltf
    this.baseUrl = baseUrl

    const gltfJson = this.gltf as GLTf
    const loader = new CustomGLTFLoader()
    this.parseGltfScenePromise = loader.parseGLTFJson(gltfJson, `${baseUrl}/`, undefined, options)
      .then((resultGltf) => {
        const group = resultGltf.scene
        if (!group.userData) {
          group.userData = {}
        }
        Object.assign(group.userData, resultGltf.userData)
        return group
      }).catch((err) => {
        GrandCentral.getDispatcher().dispatchNotification({
          what: NOTIFY_VIEWER_ERROR,
          payload: {
            error: `InitializationFailure`,
            initializationFailureInfo: {
              description: `RoomGLTFAssets gltf parse error.`,
              error: err,
            }
          }
        })
        return null
      })
  }

  getParsedGltfScene(): Promise<THREE.Group | null> {
    return this.parseGltfScenePromise
  }

  getCamerasCount() {
    const cameras = this.gltf.extras?.geomagical?.geomagicalCameras
    if (!cameras) {
      return 0
    }
    return cameras.length
  }

  hasInpaintData(cameraIndex?: number): boolean {
    const inpaint = true
    return !!this.getImageUrl(cameraIndex || 0, constants.GLTF_PANO_IMAGE_NAME, inpaint)
  }

  // eslint-disable-next-line class-methods-use-this
  getPlaneData(): PlaneData | undefined {
    return undefined
  }

  // eslint-disable-next-line class-methods-use-this
  hasWallColorData(cameraIndex?: number): boolean {
    return this.hasAssetName(constants.RESIDUAL_MAP_ASSET_NAME, cameraIndex) &&
      this.hasAssetName(constants.SHADING_MAP_ASSET_NAME, cameraIndex)
  }

  hasWallColorInpaintData(cameraIndex?: number): boolean {
    return this.hasAssetName(constants.RESIDUAL_INPAINT_MAP_ASSET_NAME, cameraIndex) &&
      this.hasAssetName(constants.SHADING_INPAINT_MAP_ASSET_NAME, cameraIndex)
  }

  // eslint-disable-next-line class-methods-use-this
  getExtraData(): ManifestExtra | undefined {
    return undefined
  }

  // TODO
  // eslint-disable-next-line class-methods-use-this
  getLightingData(): LightingData | undefined {
    return undefined
  }

  // eslint-disable-next-line class-methods-use-this
  getDepthOcclusionMetadata(): DepthOcclusionMetadata | undefined {
    return undefined
  }

  getCameraIntrinsics(cameraIndex: number): CameraIntrinsics | undefined {
    const geomCamera = this.getGeomCamera(cameraIndex)
    if (!geomCamera) {
      return undefined
    }

    const width = geomCamera.intrinsics.imageSize ? 
      geomCamera.intrinsics.imageSize[0] : 
      geomCamera.intrinsics.cxy[0] * 2
    const height = geomCamera.intrinsics.imageSize ? 
      geomCamera.intrinsics.imageSize[1] : 
      geomCamera.intrinsics.cxy[1] * 2
    return {
      focalLengthX: geomCamera.intrinsics.fxy[0],
      focalLengthY: geomCamera.intrinsics.fxy[1],
      principalPointX: geomCamera.intrinsics.cxy[0],
      principalPointY: geomCamera.intrinsics.cxy[1],
      imageWidth: width,
      imageHeight: height
    }
  }

  getCameraExtrinsics(cameraIndex: number): CameraExtrinsics | undefined {
    const geomCamera = this.getGeomCamera(cameraIndex)
    if (!geomCamera) {
      return undefined
    }

    const gltfJson = this.gltf as GLTf
    const nodeIndex = this.gltf.nodes.findIndex(node => node.camera === cameraIndex)
    const transform = parseGltfNodeWorldTransform(gltfJson, nodeIndex)
    const position = extractPosition(transform)
    const rotation = toQuat4(extractQuaternionFromMat4(transform))
    return { position, rotation }
  }

  getCameraMarkers(cameraIndex?: number | undefined): Point2D[] | undefined {
    if (!cameraIndex) {
      return undefined
    }

    const geomCamera = this.getGeomCamera(cameraIndex)
    if (!geomCamera) {
      return undefined
    }

    return geomCamera.viewData?.roomTint?.markers
  }

  hasAssetName(assetName: AssetName, cameraIndex?: number): boolean {
    return !!this.getRawAssetByName(assetName, cameraIndex)
  }

  getAssetUrl(assetName: AssetName, cameraIndex?: number): string | null {
    const assetValue = this.getRawAssetByName(assetName, cameraIndex) as string | undefined
    return assetValue || null
  }

  getRawAssetByName(assetName: AssetName, cameraIndex?: number): string | number | object | undefined {
    let ret = undefined
    const inpaint = true
    const safeCameraIdx = cameraIndex || 0
    switch(assetName) {
      case constants.PANORAMA_ASSET_NAME:
        ret = this.getImageUrl(safeCameraIdx, constants.GLTF_PANO_IMAGE_NAME)
        break
      case constants.PANO_INPAINT_ASSET_NAME:
        ret = this.getImageUrl(safeCameraIdx, constants.GLTF_PANO_IMAGE_NAME, inpaint)
        break
      case constants.SEGMENTATION_ASSET_NAME:
        if (!this.isUsingOldSegmentation(safeCameraIdx, false)) {
          ret = this.getImageUrl(safeCameraIdx, constants.GLTF_SEGMENTATION_IMAGE_NAME)
        }
        break
      case constants.SEGM_INPAINT_ASSET_NAME:
        if (!this.isUsingOldSegmentation(safeCameraIdx, inpaint)) {
          ret = this.getImageUrl(safeCameraIdx, constants.GLTF_SEGMENTATION_IMAGE_NAME, inpaint)
        }
        break
      case constants.NORMALS_SEGM_ASSET_NAME:
        if (this.isUsingOldSegmentation(safeCameraIdx, false)) {
          ret = this.getImageUrl(safeCameraIdx, constants.GLTF_SEGMENTATION_IMAGE_NAME)
        }
        break
      case constants.NORM_SEGM_INPAINT_ASSET_NAME:
        if (this.isUsingOldSegmentation(safeCameraIdx, inpaint)) {
          ret = this.getImageUrl(0, constants.GLTF_SEGMENTATION_IMAGE_NAME, inpaint)
        }
        break
      case constants.OCCLUSION_MAP_ASSET_NAME:
        ret = this.getImageUrl(safeCameraIdx, constants.GLTF_DEPTH_IMAGE_NAME)
        break
      case constants.OCCLUSION_INPAINT_MAP_ASSET_NAME:
        ret = this.getImageUrl(safeCameraIdx, constants.GLTF_DEPTH_IMAGE_NAME, inpaint)
        break
      case constants.RESIDUAL_MAP_ASSET_NAME:
        ret = this.getWallColorImageUrl(safeCameraIdx, constants.GLTF_RESIDUAL_IMAGE_NAME)
        break
      case constants.RESIDUAL_INPAINT_MAP_ASSET_NAME:
        ret = this.getWallColorImageUrl(safeCameraIdx, constants.GLTF_RESIDUAL_INPAINT_IMAGE_NAME)
        break
      case constants.SHADING_MAP_ASSET_NAME:
        ret = this.getWallColorImageUrl(safeCameraIdx, constants.GLTF_SHADING_IMAGE_NAME)
        break
      case constants.SHADING_INPAINT_MAP_ASSET_NAME:
        ret = this.getWallColorImageUrl(safeCameraIdx, constants.GLTF_SHADING_INPAINT_IMAGE_NAME)
        break
      case constants.EQUIRECTANGULAR_ASSET_NAME:
        ret = this.getEnvironmentUrl(0)
        break
      case constants.PLANE_ORIENTATION_INPAINT_ASSET_NAME: break
      case constants.PLANE_ORIENTATION_ASSET_NAME: break
      default:
        break
    }
    return ret
  }

  // Room GLTF has different versions of segmentation listed under the same name "segmentationImage":
  // - if viewData major version is 1, segmentation is the old "normals segmentation".
  // - if viewData major version is 2, segmentation is the new "segmentation".
  private isUsingOldSegmentation(cameraIndex: number, inpaint: boolean) {
    const geomCamera = this.getGeomCamera(cameraIndex)
    const imageList = inpaint ? geomCamera?.viewData?.magicEraser : geomCamera?.viewData?.base
    const version = simpleVersionParse(imageList?.version)
    return version.major === 1
  }

  private getGeomCamera(cameraIndex: number): GLTFGeomagicalCamera | undefined {
    const cameras = this.gltf.extras?.geomagical?.geomagicalCameras
    if (!cameras || cameras.length === 0) {
      return undefined
    }
    return cameras[cameraIndex]
  }

  private getEnvironmentUrl(sceneIndex: number): string | undefined {
    const uri = this.gltf.extras?.geomagical?.geomagicalScenes[sceneIndex]?.environmentMapCustomImage.uri
    return this.getFullUrl(uri)
  }

  private getFullUrl(assetUrl: string | undefined) {
    if (!assetUrl) {
      return assetUrl
    }
    // if already a absolute url, return as is
    if (assetUrl.startsWith('http') || assetUrl.startsWith('blob')) {
      return assetUrl
    }
    const separator = this.baseUrl.endsWith('/') ? '' : '/'
    return `${this.baseUrl}${separator}${assetUrl}`
  }

  private getImageUrl(cameraIndex: number, imageName: ImageName, inpaint = false): string | undefined {
    const geomCamera = this.getGeomCamera(cameraIndex)
    const imagesList = inpaint ? geomCamera?.viewData?.magicEraser : geomCamera?.viewData?.base
    const index = imagesList?.[imageName]
    if (index === undefined) {
      return undefined
    }
    const gltfImage = this.tryFindAlternativeImage(this.gltf.images[index])
    return this.getFullUrl(gltfImage.uri)
  }

  // If a default image is webp, try to find another  (png or jpg) image with the same name, and return that.
  // Otherwise return the default image.
  // See https://geomagical.atlassian.net/browse/GFX-3161 for more details.
  private tryFindAlternativeImage(defaultImage: GLTFImage): GLTFImage {

    const stripExtension = (x: string) => x.replace(/\.[^.]+$/, "")

    let ret = defaultImage
    if (defaultImage.mimeType === `image/webp`) {
      const imageName = stripExtension(defaultImage.name)
      const alternativeImage = this.gltf.images.find((image) => stripExtension(image.name) === imageName &&
        image.mimeType !== `image/webp`)
      if (alternativeImage) {
        ret = alternativeImage
      }
    }
    return ret
  }

  private getWallColorImageUrl(cameraIndex: number, imageName: WallColorImageName): string | undefined {
    const geomCamera = this.getGeomCamera(cameraIndex)
    const imagesList = geomCamera?.viewData?.roomTint
    const index = imagesList?.[imageName]
    if (index === undefined) {
      return undefined
    }
    const gltfImage = this.tryFindAlternativeImage(this.gltf.images[index])
    return this.getFullUrl(gltfImage.uri)
  }

  public getRoomTemplate() {
    const templateObject = this.gltf.extras?.geomagical?.geomagicalScenes[0]?.roomTemplate
    if (!templateObject) {
      return null
    }
    return templateObject
  }
}
