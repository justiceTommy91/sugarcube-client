import { AssetManager, type TextureRecord } from 'Renderer/assets/AssetManager'
import { MultiviewAssetSelector } from 'Renderer/assets/MultiviewAssetSelector'

import type { GrandCentral } from 'Renderer/GrandCentral'
import type { AssetSelectorOptions, AssetSelectorDeviceConfig } from 'Renderer/assets/Types'
import type { InitializationFailureCallback } from 'Renderer/rendering/rendering_types'
import type { AssetsList } from './AssetsList'

/**
 * MultiviewAssetManager is a version of AssetManager that allows to get asset across different views.
 * For now, it supports only textures, but can be extended to support other asset types.
 */
export class MultiviewAssetManager extends AssetManager {
  constructor (
    assetsList: AssetsList,
    options: AssetSelectorOptions,
    deviceConfig: AssetSelectorDeviceConfig,
    errorDispatcher?: GrandCentral,
    onFailCallback?: InitializationFailureCallback
  ) {
    super(assetsList, -1, options, deviceConfig, errorDispatcher, onFailCallback)
    this.assetSelector = new MultiviewAssetSelector(assetsList, options, deviceConfig)
  }

  public override startDownload() {
    this.cleanup()
    this.assetSelector.refresh()

    this.selectedTextures = this.assetSelector.requiredTextureAssets
    this.selectedPixelData = this.assetSelector.requiredPixelDataAssets

    this.startDownloadTextures()
    this.isInitialized = true
  }

  public getTextureForCamera(assetName: string, cameraIndex: number): Promise<TextureRecord> {
    const fullName = MultiviewAssetSelector.getFullAssetName(assetName, cameraIndex)
    return this.getTexture(fullName)
  }

  public getTextureOrNullForCamera(assetName: string, cameraIndex: number): Promise<TextureRecord | null> {
    const fullName = MultiviewAssetSelector.getFullAssetName(assetName, cameraIndex)
    return this.getTextureOrNull(fullName)
  }
}