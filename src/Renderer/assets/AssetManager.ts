/**
 * AssetManager
 */
import axios from 'axios'
import * as THREE from 'three'
import * as Sentry from '@sentry/react'
import * as constants from 'Renderer/constants'
import { Downloader, RequestInfo } from 'Renderer/Downloader'
import { GrandCentral } from 'Renderer/GrandCentral'
import {
  TextureConfig,
  texturesConfig,
  texturesForPixelDataConfig,
  texturesForTestingConfig,
} from 'Renderer/assets/AssetsConfig'
import { is_lpng_initialized, initialize_lpng, decode } from 'utils/lodepng.wrapper'
import { getE2ETestingEnv } from 'utils/environment'
import { AssetSelectorOptions, AssetSelectorDeviceConfig } from 'Renderer/assets/Types'
import { DOWNLOAD_TYPE_SCENEDATA, DOWNLOAD_TYPE_ENVMAP } from 'Renderer/geomviewer/geom_constants'
import TextureHelper from 'Renderer/TextureHelper'
import type { InitializationFailureCallback } from 'Renderer/rendering/rendering_types'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { AssetSelector } from './AssetSelector'
import { TextureLoader } from './TextureLoader'
import { AssetsList } from './AssetsList'

// TODO(georges): This is really a AssetLoader for now, with the added ability to dispatch
// download errors through GrandCentral. As the Renderer API is formalized, this class
// should become an asset manager, with the ability to download and holds assets given
// the scene data.

// TexturePixReader is a caller-provided helper to read pixel data from textures.
export type PixelData = {
  data: Uint8Array | Uint8ClampedArray
  width: number
  height: number
}

export interface TexturePixReader {
  readPixels: (texture: THREE.Texture) => PixelData
}

// Loading a texture produces a Promise<TextureRecord>
export type TextureRecord = {
  texture: THREE.Texture | null
  size: number
  usingAlternateUrl: boolean
}

// Loading raw image data produces a Promise<PixelDataRecord>.
export type PixelDataRecord = {
  pixels: PixelData | null
  size: number
}

// Generic asset item that encapsulates ref counting and an actual asset.
type AssetItem<AssetType> = {
  refCounter: number
  assetPromise?: Promise<AssetType>
  request?: RequestInfo
}

export type TextureReadyHook = (assetManager: AssetManager, texture: TextureRecord) => Promise<TextureRecord>

export type PixelsReadyHook = (passetManager: AssetManager, ixels: PixelDataRecord) => Promise<PixelDataRecord>

// Helper function that ensures that the lpng library is initialized.
async function initializeLPng(): Promise<boolean> {
  if (is_lpng_initialized()) {
    return true
  }
  return initialize_lpng()
}

// AssetManager holds the scene data and provides methods that help download assets
// from the server.
// TODO(georges): For now the AssetManager is really an asset downloader. As the
// Renderer goes through more fundamental refactoring, the asset manager should
// become the repository for downloaded assets.
export class AssetManager {
  // Error produced when a requested asset is not available in the manifest.
  readonly ERROR_ASSET_NOT_AVAILABLE = `not-available`

  // Error produced when an asset download failed.
  readonly ERROR_DOWNLOAD_FAILED = `download-failed`

  // Error initializing png decoding library.
  readonly ERROR_PNG_INIT_FAILED = `png-init-failed`

  // Error produced when an asset is requested by the client code, but was not
  // selected for downloading by AssetSelector.
  readonly ERROR_ASSET_NOT_SELECTED = `asset-not-selected-for-download`

  // Error produced when an asset which is requested by the client code was already purged.
  readonly ERROR_ASSET_PURGED = `asset-purged`

  // Whether the image-loading code should use Wasm.
  // This is a workaround for Safari's png alpha-premultiplication bug
  private useWasm = false

  // Whether this instance of AssetManager is initialized. (Goes back to false when the manager is shutdown.)
  protected isInitialized = false

  // Shared downloader manages the queue, retries, etc. for all downloads.
  private downloader: Downloader

  // Optional error dispatcher. If available download errors are sent to this dispatcher.
  private errorDispatcher?: GrandCentral

  // Shared Promise for the equirectangular-texture asset. It wraps the texture data with
  // a status flag signaling whether the alternate url was used.
  private equirectTexContainer?: Promise<TextureRecord>

  // Optional equirectangular alternate url, used when none is provided in the manifest.
  private equirectAlternateUrl: string | null = null

  // TODO(georges): Keeping this callback for backward compatibility. Once the UI
  // receives errors through the notification dispatcher then we should be able
  // to get rid of this.
  private onFailCallback?: InitializationFailureCallback

  // A map assetName => Promise<TextureRecord> of all required textures.
  private textures: Map<string, AssetItem<TextureRecord>> = new Map()

  // A map assetName => Promise<TextureRecord> of all textures that are shared between multiple
  // asset manager instances.
  private static sharedTextures: Map<string, AssetItem<TextureRecord>> = new Map()

  // A map assetName => Promise<PixelDataRecord> of all required pixels data.
  private pixelsData: Map<string, AssetItem<PixelDataRecord>> = new Map()

  // AssetSelector is used to analyze the scene manifest and provide the list of assets to download.
  protected assetSelector: AssetSelector

  // The list of textures currently selected by AssetSelector and downloaded.
  protected selectedTextures?: Map<string, string | null>

  // The list of pixel data currently selected by AssetSelector and downloaded.
  protected selectedPixelData?: Map<string, string | null>

  // A map assetName => hooks array, of functions that will be called.after assetName texture
  // is downloaded, and before any client will be able to access it.
  private textureReadyHooks: Map<string, Array<TextureReadyHook>> = new Map()

  // A map assetName => hooks array, of functions that will be called.after assetName pixels data
  // is ready, and before any client will be able to access it.
  private pixelsReadyHooks: Map<string, Array<PixelsReadyHook>> = new Map()

  private downloadAbortCallbackForTest?: (assetName: string) => void

  private assetSelectorOptions: AssetSelectorOptions

  private deviceConfig: AssetSelectorDeviceConfig

  constructor(
    assetsList: AssetsList,
    cameraIndex: number,
    options: AssetSelectorOptions,
    deviceConfig: AssetSelectorDeviceConfig,
    errorDispatcher?: GrandCentral,
    onFailCallback?: InitializationFailureCallback,
  ) {
    this.downloader = new Downloader(0 /* unlimited # of simultaneous downloads */, constants.DOWNLOAD_RETRY_DELAY_MS)
    this.assetSelectorOptions = options
    this.deviceConfig = deviceConfig
    this.assetSelector = new AssetSelector(assetsList, this.assetSelectorOptions, deviceConfig, cameraIndex)
    this.useWasm = this.deviceConfig.hasAlphaPremultBug // See Type.ts for why this is needed.
    this.errorDispatcher = errorDispatcher
    this.onFailCallback = onFailCallback
  }

  forceUseWasmForTest() {
    this.useWasm = true
  }

  setDownloadAbortCallbackForTest(callback: (assetName: string) => void) {
    this.downloadAbortCallbackForTest = callback
  }

  getMobileNoWallColorFlag(): boolean {
    return this.assetSelectorOptions.mobileNoWallColor
  }

  getSupportFragmentDepth(): boolean {
    return this.deviceConfig.supportFragmentDepth
  }

  getIsInitialized() {
    return this.isInitialized
  }

  // Call this on shutdown to dispose of assets the AssetManager holds on to.
  shutdown() {
    this.isInitialized = false
    this.cleanup()
  }

  protected cleanup() {
    this.equirectTexContainer?.then((textureRecord) => AssetManager.disposeTexture(textureRecord));
    this.equirectTexContainer = undefined;

    this.textures.forEach(assetItem => AssetManager.disposeTextureAsset(assetItem))
    this.pixelsData.forEach((assetItem) => {
      if (assetItem?.request?.abortDownload) {
        assetItem.request.abortDownload()
      }
    })

    this.textures.clear()
    this.pixelsData.clear()
  }

  private static disposeTexture(textureRecord: TextureRecord) {
    if (!textureRecord?.texture) {
      return
    }
    textureRecord.texture.dispose()
    if (textureRecord.texture.image?.close) {
      textureRecord.texture.image.close()
    }
  }

  public static cleanupShared() {
    AssetManager.sharedTextures.forEach(assetItem => AssetManager.disposeTextureAsset(assetItem))
    AssetManager.sharedTextures.clear()
  }

  private static disposeTextureAsset(assetItem: AssetItem<TextureRecord>) {
    if (!assetItem.request) {
      if (assetItem.assetPromise) {
        assetItem.assetPromise
          .then((textureRecord) => AssetManager.disposeTexture(textureRecord))
          .catch(() => {})
      }
    } else if (assetItem.request.abortDownload) {
      assetItem.request.abortDownload()
    }
  }

  // Provides a fallback url for the equirectangular url from the manifest. This should be
  // set before the equirectangular is requested through the 'getEquirectTexture` API.
  setEquirectAlternateUrl(url: string) {
    this.equirectAlternateUrl = url
  }

  startDownload() {
    this.cleanup()
    this.assetSelector.refresh()

    this.selectedTextures = this.assetSelector.requiredTextureAssets
    this.selectedPixelData = this.assetSelector.requiredPixelDataAssets

    this.startDownloadTextures()
    this.startDownloadPixelData()
    this.startDownloadRawPngs()
    this.startDownloadEquirectangular()
    this.isInitialized = true
  }

  // Get the assetItem representing a texture, this function is used in unit tests.
  getTextureAssetItemForTest(assetName: string) {
    return this.textures.get(assetName)
  }

  // Get the assetItem representing pixels data, this function is used in unit tests.
  getPixelsAssetItemForTest(assetName: string) {
    return this.pixelsData.get(assetName)
  }

  // Returns a promise that resolves to the requested texture.
  // Resolves immediately if the texture is already available.
  // Automatically increments asset's reference count.
  getTexture(assetName: string): Promise<TextureRecord> {
    const assetItem = this.textures.get(assetName)
    if (assetItem && assetItem.assetPromise) {
      assetItem.refCounter += 1
      return assetItem.assetPromise
    }
    const errorString = this.selectedTextures && this.selectedTextures.has(assetName)
      ? this.ERROR_ASSET_PURGED
      : this.ERROR_ASSET_NOT_SELECTED
    return Promise.reject(new Error(errorString))
  }

  // Decrement asset's reference count. Assets that have zero reference count will be deleted
  // when AssetManager.purge is called.
  releaseTexture(assetName: string) {
    const assetItem = this.textures.get(assetName)
    if (assetItem && assetItem.refCounter > 0) {
      assetItem.refCounter -= 1
    }
  }

  // Decrement asset's reference count. Assets that have zero reference count will be deleted
  // when AssetManager.purge is called.
  releasePixelData(assetName: string) {
    const assetItem = this.pixelsData.get(assetName)
    if (assetItem && assetItem.refCounter > 0) {
      assetItem.refCounter -= 1
    }
  }

  // A version of getTexture, which never rejects, and returns null in case of error.
  getTextureOrNull(assetName: string): Promise<TextureRecord | null> {
    return this.getTexture(assetName).catch(() => null)
  }

  // Returns a promise that resolves to the requested pixel data.
  // Resolves immediately if the data is already available.
  // Automatically increments asset's reference count.
  getTexturePixels(assetName: string): Promise<PixelDataRecord> {
    const assetItem = this.pixelsData.get(assetName)
    if (assetItem && assetItem.assetPromise) {
      assetItem.refCounter += 1
      return assetItem.assetPromise
    }
    const errorString = this.selectedPixelData && this.selectedPixelData.has(assetName)
      ? this.ERROR_ASSET_PURGED
      : this.ERROR_ASSET_NOT_SELECTED
    return Promise.reject(new Error(errorString))
  }

  // A version of getTexturePixels, which never rejects, and returns null in case of error.
  getTexturePixelsOrNull(assetName: string): Promise<PixelDataRecord | null> {
    return this.getTexturePixels(assetName).catch(() => null)
  }

  // A shortcut method to get mask data pixels, according to the current asset selector configuration.
  getMaskDataPixelsOrNull(): Promise<PixelDataRecord | null> {
    const assetName = this.assetSelector.assetConfiguration.segmentationAssetName
    return this.getTexturePixelsOrNull(assetName)
  }

  releaseMaskDataPixelsOrNull() {
    const assetName = this.assetSelector.assetConfiguration.segmentationAssetName
    this.releasePixelData(assetName)
  }

  purge() {
    const texturesToPurge: AssetItem<TextureRecord>[] = []
    const selectedTextures = Array.from(this.textures.keys())
    selectedTextures.forEach((assetName) => {
      const assetItem = this.textures.get(assetName)
      if (assetItem && assetItem.refCounter === 0 && !AssetManager.sharedTextures.has(assetName)) {
        this.textures.delete(assetName)
        texturesToPurge.push(assetItem)
      }
    })

    const texturePromises = texturesToPurge.map((item) => {
      if (item.assetPromise) {
        return item.assetPromise.catch(() => null)
      }
      return null;
    }).filter(promise => !!promise)

    Promise.all(texturePromises)
      .then((results) => {
        results.forEach((record) => {
          if (!record) {
            return
          }
          AssetManager.disposeTexture(record)
        })
      })

    const pixelDataToPurge: AssetItem<PixelDataRecord>[] = []
    const selectedPixelData = Array.from(this.pixelsData.keys())
    selectedPixelData.forEach((assetName) => {
      const assetItem = this.pixelsData.get(assetName)
      if (assetItem && assetItem.refCounter === 0) {
        this.pixelsData.delete(assetName)
        pixelDataToPurge.push(assetItem)
      }
    })
    const pixelsPromises = pixelDataToPurge.map((item) => {
      if (item.assetPromise) {
        return item.assetPromise.catch(() => null);
      }
      return null;
    })

    Promise.all(pixelsPromises)
      .then((results) => {
        results.forEach((record) => {
          if (!record) {
            return
          }
          record.pixels = null
        })
      })
  }

  protected startDownloadTextures() {
    if (!this.selectedTextures || !this.selectedPixelData) {
      return
    }

    // To read pixels without wasm, we need to download the corresponding texture too.
    const texturesToDownload = this.useWasm
      ? this.selectedTextures
      : new Map([...this.selectedTextures, ...this.selectedPixelData])

    texturesToDownload.forEach((url, assetName) => {
      const sharedTexture = AssetManager.sharedTextures.get(assetName)
      if (sharedTexture) {
        this.textures.set(assetName, sharedTexture)
      } else {
        const assetItem: AssetItem<TextureRecord> = {
          refCounter: 0,
        }
        const texturePromise = this.internalLoadTextureByAssetName(assetName, url, assetItem, null)
          .then((textureRecord) => {
            assetItem.request = undefined
            return this.executeTextureHooks(assetName, textureRecord)
          })
        texturePromise.catch(() => {})
        assetItem.assetPromise = texturePromise
        if (this.assetSelector.sharableAssetNames.includes(assetName)) {
          AssetManager.sharedTextures.set(assetName, assetItem)
        }
        this.textures.set(assetName, assetItem)
      }
    })
  }

  private startDownloadPixelData() {
    if (!this.selectedPixelData) {
      return
    }

    this.selectedPixelData.forEach((url, assetName) => {
      const assetItem: AssetItem<PixelDataRecord> = {
        refCounter: 0,
      }
      const pixelsPromise = this.internalLoadManifestImagePixels(assetName, url, assetItem)
        .then((pixelsDataRecord) => {
          assetItem.request = undefined
          return this.executePixelsHooks(assetName, pixelsDataRecord)
        });
      pixelsPromise.catch(() => {});
      assetItem.assetPromise = pixelsPromise;
      this.pixelsData.set(assetName, assetItem);
    })
  }

  private startDownloadRawPngs() {
    if (!this.selectedTextures) {
      return
    }

    const requiredRawPngAssets = this.assetSelector.requiredRawPngAssets
    this.selectedTextures = new Map([...this.selectedTextures, ...requiredRawPngAssets])
    requiredRawPngAssets.forEach((url, assetName) => {
      const assetItem: AssetItem<TextureRecord> = {
        refCounter: 0,
      }
      const texturePromise = this.internalLoadRawPngTexture(assetName, url, assetItem).then((textureRecord) => {
        assetItem.request = undefined
        return this.executeTextureHooks(assetName, textureRecord)
      });
      texturePromise.catch(() => {});
      assetItem.assetPromise = texturePromise;
      this.textures.set(assetName, assetItem);
    })
  }

  private startDownloadEquirectangular() {
    const info = this.assetSelector.equirectangularTextureInfo
    let equirectangularTextureName = info[0]
    const equirectangularTextureUrl = info[1]
    if (!equirectangularTextureName && this.equirectAlternateUrl) {
      equirectangularTextureName = constants.EQUIRECTANGULAR_ASSET_NAME
    }
    if (equirectangularTextureName) {
      const assetName = equirectangularTextureName
      const sharedTexture = AssetManager.sharedTextures.get(assetName)
      if (sharedTexture) {
        const assetItem: AssetItem<TextureRecord> = {
          refCounter: 0,
          assetPromise: sharedTexture.assetPromise,
        }
        this.textures.set(assetName, assetItem)
      } else {
        const textureLoader = new RGBELoader()
        textureLoader.setDataType(THREE.HalfFloatType)
        const assetItem: AssetItem<TextureRecord> = {
          refCounter: 0,
        }
        const texturePromise = this.internalLoadTextureByAssetName(
          assetName,
          equirectangularTextureUrl,
          assetItem,
          this.equirectAlternateUrl,
          textureLoader,
        ).then((textureRecord) => {
          assetItem.request = undefined
          return this.executeTextureHooks(assetName, textureRecord)
        })
        texturePromise.catch(() => {})
        assetItem.assetPromise = texturePromise
        this.textures.set(assetName, assetItem)
        if (this.assetSelector.sharableAssetNames.includes(assetName)) {
          AssetManager.sharedTextures.set(assetName, {
            ...assetItem
          })
        }
      }
    }
  }

  // Execute all texture hooks, if any, for a given assetName and downloaded texture.
  private executeTextureHooks(assetName: string, textureRecord: TextureRecord) {
    const hooks = this.textureReadyHooks.get(assetName)
    if (hooks) {
      // Reduce will call all the hooks in the hooks array one-by-one, each next
      // one will be called after previous is resolved.
      return hooks.reduce((curr, accum) => curr.then((d) => accum(this, d)), Promise.resolve(textureRecord))
    }
    return Promise.resolve(textureRecord)
  }

  // Execute all pixel data hooks, if any, for a given assetName and read pixel data.
  private executePixelsHooks(assetName: string, pixelsDataRecord: PixelDataRecord) {
    const hooks = this.pixelsReadyHooks.get(assetName)
    if (hooks) {
      // Reduce will call all the hooks in the hooks array one-by-one, each next
      // one will be called after previous is resolved.
      return hooks.reduce((curr, accum) => curr.then((d) => accum(this, d)), Promise.resolve(pixelsDataRecord))
    }
    return Promise.resolve(pixelsDataRecord)
  }

  private static configureTexture(assetName: string, textureRecord: TextureRecord, config: TextureConfig) {
    if (!textureRecord || !textureRecord.texture) {
      return
    }
    const textureConfig = {
      ...config[assetName],
      ...getE2ETestingEnv() ? texturesForTestingConfig.default : {},
    }
    if (textureConfig) {
      Object.assign(textureRecord.texture, textureConfig)
      textureRecord.texture.needsUpdate = true
    }
  }

  // Helper function: download a texture given its manifest asset name.
  private async internalLoadTextureByAssetName<TargetType>(
    assetName: string,
    url: string | null,
    assetItem: AssetItem<TargetType>,
    alternateUrl: string | null,
    textureLoader: RGBELoader | TextureLoader = new TextureLoader(),
  ): Promise<TextureRecord> {
    let usingAlternateUrl = false
    if (!url && !alternateUrl) {
      return Promise.reject(new Error(this.ERROR_ASSET_NOT_AVAILABLE))
    }
    let useUrl = url
    if (!useUrl && alternateUrl) {
      useUrl = alternateUrl
      usingAlternateUrl = true
    }

    if (useUrl) {
      const downloadUrl = useUrl
      const request: RequestInfo = {
        maxNumTries: constants.DOWNLOAD_RETRIES_COUNT,
        startDownload: (onSuccess, onFailure) => {
          textureLoader.load(downloadUrl, onSuccess, undefined, (err: unknown) => {
            onFailure(new Error((err as ErrorEvent).message))
          })
        },
        abortDownload: () => {
          // In case of RGBELoader, implementing download abort would require rewriting the whole
          // hierarchy of three's loaders down to THREE.FileLoader. ThreeJS has plans to add request abort
          // there in the future.
          if (textureLoader instanceof TextureLoader) {
            textureLoader.abortDownload()
            this.reportDownloadAbortForTest(assetName)
          }
        },
      }
      assetItem.request = request
      return this.internalLoadTextureWithRequest(request, useUrl, assetName).then((texture) => {
        AssetManager.configureTexture(assetName, texture, texturesConfig)
        texture.usingAlternateUrl = usingAlternateUrl
        return texture
      })
    }
    return Promise.reject(new Error(this.ERROR_ASSET_NOT_AVAILABLE))
  }

  // Helper function: download a texture given a download request.
  private internalLoadTextureWithRequest(request: RequestInfo, url: string, assetName: string): Promise<TextureRecord> {
    const textureResult = this.downloader.addRequest<THREE.Texture>(request)
    const sizeResult = AssetManager.getAssetFileByteSize(assetName, url)
    return new Promise<TextureRecord>((resolve, reject) => {
      Promise.all([textureResult, sizeResult])
        .then((values) => {
          resolve({
            texture: values[0],
            size: values[1],
            usingAlternateUrl: false,
          })
        })
        .catch(() => {
          this.reportDownloadError(assetName, url, `Texture load failed.`)
          reject(new Error(this.ERROR_DOWNLOAD_FAILED))
        })
    })
  }

  // Download an image as a raw png buffer, and create a THREE.DataTexture from downloaded data.
  // This is needed on iOS devices which have alpha premultiplication bug
  // (see AssetSelectorDeviceConfig declaration).
  private internalLoadRawPngTexture(assetName: string, url: string | null,
    assetItem: AssetItem<TextureRecord>): Promise<TextureRecord> {
    return initializeLPng()
      .then((result) => {
        if (!result) {
          return Promise.reject(new Error(this.ERROR_PNG_INIT_FAILED))
        }
        return this.loadManifestImagePixelsWithAsm(assetName, url, assetItem)
      })
      .then((pixelsDataRecord) => {
        if (!pixelsDataRecord.pixels) {
          return Promise.reject(new Error(this.ERROR_PNG_INIT_FAILED))
        }
        const texture = new THREE.DataTexture(
          pixelsDataRecord.pixels.data,
          pixelsDataRecord.pixels.width,
          pixelsDataRecord.pixels.height,
        )
        const result = {
          texture,
          size: 0,
          usingAlternateUrl: false,
          referenceCount: 0,
          purged: false,
        }
        AssetManager.configureTexture(assetName, result, texturesConfig)
        return result
      })
  }

  // Asynchronously download and return raw image data given the image-asset name in the
  // manifest. Download errors are dispatched to the errorDispatcher if available.
  private async internalLoadManifestImagePixels(assetName: string, url: string | null,
    assetItem: AssetItem<PixelDataRecord>)
    : Promise<PixelDataRecord> {
    if (!url) {
      return Promise.reject(new Error(this.ERROR_ASSET_NOT_AVAILABLE))
    }
    let retPromise: Promise<PixelDataRecord>
    if (this.useWasm && (await initializeLPng())) {
      retPromise = this.loadManifestImagePixelsWithAsm(assetName, url, assetItem);
    } else {
      retPromise = this.loadManifestImagePixelsNoAsm(assetName, url);
    }
    if (assetName === this.assetSelector.assetConfiguration.segmentationAssetName &&
      this.assetSelector.assetConfiguration.segmentationUsesGreenChannel) {
        retPromise = retPromise.then((pixelsRecord) => AssetManager.shiftGreenChannelToBlue(pixelsRecord))
    }
    return retPromise
  }

  // Helper function: download the image asset as a texture first, then extract the raw image
  // pixels from that texture.
  private async loadManifestImagePixelsNoAsm(assetName: string, url: string | null) {
    return new Promise<PixelDataRecord>((resolve, reject) => {
      // Assuming here that corresponding texture is already being downloaded in startDownload.
      const texturePromise = this.getTexture(assetName)
      this.releaseTexture(assetName)
      texturePromise
        .then((textureResult) => {
          if (textureResult && textureResult.texture) {
            // eslint-disable-next-line no-param-reassign
            textureResult.texture.flipY = false
            AssetManager.configureTexture(assetName, textureResult, texturesForPixelDataConfig)
            const { width, height } = textureResult.texture.image
            const textureHelper = new TextureHelper()
            const pixelData = textureHelper.readPixels(textureResult.texture)
            textureHelper.dispose()

            // Sometimes the texture helper returns null. That happens, notably, when the
            // renderer is destroyed while downloading data. In such case, we can fail
            // quietly.
            if (pixelData === null) {
              reject(new Error('internal error'))
            } else {
              resolve({
                pixels: { data: pixelData.data, width, height },
                size: textureResult.size,
              })
            }
          }
        })
        .catch((err) => {
          this.reportDownloadError(assetName, url || '', `Texture load failed.`)
          reject(err)
        })
    })
  }

  // Helper function: download raw image data directly as a PNG image, then use lodepng to
  // extract the pixel data.
  private async loadManifestImagePixelsWithAsm<TargetType>(assetName: string, url: string | null, 
    assetItem: AssetItem<TargetType>) {
    if (!url) {
      return Promise.reject(new Error(this.ERROR_ASSET_NOT_AVAILABLE))
    }

    const abortController = new AbortController();
    const request: RequestInfo = {
      maxNumTries: constants.DOWNLOAD_RETRIES_COUNT,
      startDownload: (onSuccess, onFailure) => {
        axios({
          method: 'GET',
          url,
          responseType: 'arraybuffer',
          signal: abortController.signal,
        })
          .then((pngBinary) => {
            const decodedPNG = decode(new Uint8Array(pngBinary.data))
            onSuccess(decodedPNG)
          })
          .catch((err) => {
            onFailure(err)
          })
      },
      abortDownload: () => {
        abortController.abort()
        this.reportDownloadAbortForTest(assetName)
      },
    }
    assetItem.request = request

    // This is the data type coming out of png function decode.
    type PngData = {
      output: Uint8ClampedArray
      width: number
      height: number
    }

    const decodedPngResult = this.downloader.addRequest<PngData>(request)
    const sizeResult = AssetManager.getAssetFileByteSize(assetName, url)
    return new Promise<PixelDataRecord>((resolve, reject) => {
      Promise.all([decodedPngResult, sizeResult])
        .then((values) => {
          resolve({
            pixels: {
              data: values[0].output,
              width: values[0].width,
              height: values[0].height,
            },
            size: values[1],
          })
        })
        .catch((err) => {
          this.reportDownloadError(assetName, url, `Texture load failed.`)
          reject(err)
        })
    })
  }

  // Report a download error to:
  // 1. Sentry.
  // 2. The onFailCallback if defined.
  // 3. The errorDispatcher if available.
  private reportDownloadError(assetName: string, url: string, onFailDescription: string) {
    // TODO(georges): move Sentry to a central reporter and let it receive the download errors
    // through the notification dispatcher.
    Sentry.captureException({ cause: `Failed to load ${url}.` })

    if (this.onFailCallback) {
      this.onFailCallback({ onFailDescription, url })
    }

    if (this.errorDispatcher) {
      // eslint-disable-next-line i18next/no-literal-string
      const downloadType = assetName === 'equirectangular' ? DOWNLOAD_TYPE_ENVMAP : DOWNLOAD_TYPE_SCENEDATA
      this.errorDispatcher.dispatchDownloadError(downloadType, url, constants.DOWNLOAD_RETRIES_COUNT, assetName)
    }
  }

  private reportDownloadAbortForTest(assetName: string) {
    if (!this.downloadAbortCallbackForTest) {
      return
    }
    this.downloadAbortCallbackForTest(assetName)
  }

  // Return an asset byte size given its name in the manifest.
  private static async getAssetFileByteSize(assetName: string, url: string | null): Promise<number> {
    // Use a HEAD-HTTP request to obtain meta-information about the url
    if (url) {
      try {
        const response = await axios({ method: 'HEAD', url })
        return response.status === 200 ? +(response.headers['content-length'] || 0) : 0
      } catch (error) {
        return 0
      }
    }

    return 0
  }

  // Register a hook function which will be called when texture under assetName is downloaded.
  // Other clients that might use the texture will be able to access it only after each promise
  // returned by all its hooks is resolved.
  // Primary use for hooks would be a situation when some code needs exclusive access to a texture,
  // e.g. an async operation in a Web Worker, in which the worker temporary takes ownership over
  // the asset, and returns ownership back to the main thread when it's done.
  registerTextureReadyHook(assetName: string, hook: TextureReadyHook) {
    const existingHooks = this.textureReadyHooks.get(assetName)
    if (existingHooks) {
      existingHooks.push(hook)
    } else {
      this.textureReadyHooks.set(assetName, [hook])
    }
  }

  // Register a hook function which will be called when pixels data under assetName is ready.
  // Other clients that might use the pixels data will be able to access it only after each promise
  // returned by all its hooks is resolved.
  // Primary use for hooks would be a situation when some code needs exclusive access to pixels,
  // e.g. an async operation in a Web Worker, in which the worker temporary takes ownership over
  // the asset, and returns ownership back to the main thread when it's done.
  registerTexturePixelsReadyHook(assetName: string, hook: PixelsReadyHook) {
    const existingHooks = this.pixelsReadyHooks.get(assetName)
    if (existingHooks) {
      existingHooks.push(hook)
    } else {
      this.pixelsReadyHooks.set(assetName, [hook])
    }
  }

  private static shiftGreenChannelToBlue(pixelData: PixelDataRecord): PixelDataRecord {
    if (!pixelData.pixels) {
      return pixelData
    }
    for (let i = 0; i < pixelData.pixels.width * pixelData.pixels.height; i += 1) {
      const pix = i * 4
      pixelData.pixels.data[pix + 2] = pixelData.pixels.data[pix + 1]
    }
    return pixelData
  }
}
