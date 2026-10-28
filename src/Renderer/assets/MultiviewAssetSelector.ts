import { AssetSelector } from 'Renderer/assets/AssetSelector'

import * as constants from 'Renderer/constants'
import { AssetsList } from 'Renderer/assets/AssetsList'
import {
    AssetSelectorOptions,
    AssetSelectorDeviceConfig,
    AssetName,
} from 'Renderer/assets/Types'

export class MultiviewAssetSelector extends AssetSelector {
  constructor(assetsList: AssetsList, options: AssetSelectorOptions,
    deviceConfig: AssetSelectorDeviceConfig) {
      super(assetsList, options, deviceConfig, -1)
  }

  public static getFullAssetName(name: string, cameraIndex: number): string {
    return `${name}-camera${cameraIndex}`
  }

  protected override setupEssentialAssets() {
    const camerasCount = this.assetsList.getCamerasCount()
    for(let cameraIndex = 0; cameraIndex < camerasCount; cameraIndex += 1) {
      this.addTextureAssetForCamera(constants.PANORAMA_ASSET_NAME, cameraIndex)
      this.addTextureAssetForCamera(constants.OCCLUSION_MAP_ASSET_NAME, cameraIndex)
      if (this.config.useInpaint) {
          this.addTextureAssetForCamera(constants.PANO_INPAINT_ASSET_NAME, cameraIndex)
          this.addTextureAssetForCamera(constants.OCCLUSION_INPAINT_MAP_ASSET_NAME, cameraIndex)
      }
    }
  }

  protected addTextureAssetForCamera(name: AssetName, cameraIndex: number): void {
    const url = this.assetsList.getAssetUrl(name, cameraIndex)
    const fullName = MultiviewAssetSelector.getFullAssetName(name, cameraIndex)
    this.requiredTextures.set(fullName, url)
  }
}