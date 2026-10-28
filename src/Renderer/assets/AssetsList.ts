import { AssetName, ManifestExtra, DepthOcclusionMetadata, LightingData } from 'Renderer/assets/Types'
import { PlaneData, Point2D } from 'Renderer/geomviewer/geom_types'
import { CameraExtrinsics, CameraIntrinsics } from 'Renderer/multiview/camera_types'

/**
 * AssetList describes a unified interface for reading assets information from a legacy scene manifest
 * or a SceneGLTFAssets json object.
 */
export interface AssetsList {
  hasInpaintData(cameraIndex?: number): boolean
  hasWallColorData(cameraIndex?: number): boolean
  hasWallColorInpaintData(cameraIndex?: number): boolean
  getPlaneData(): PlaneData | undefined
  getLightingData(): LightingData | undefined
  getExtraData(): ManifestExtra | undefined
  getDepthOcclusionMetadata(): DepthOcclusionMetadata | undefined
  getCamerasCount(): number
  getCameraIntrinsics(cameraIndex?: number): CameraIntrinsics | undefined
  getCameraExtrinsics(cameraIndix?: number): CameraExtrinsics | undefined
  getCameraMarkers(cameraIndex?: number): Point2D[] | undefined
  hasAssetName(assetName: AssetName, cameraIndex?: number): boolean
  getRawAssetByName(assetName: AssetName, cameraIndex?: number): undefined | number | string | object
  getAssetUrl(assetName: AssetName, cameraIndex?: number): string | null
  getRoomTemplate(): object | null
}
