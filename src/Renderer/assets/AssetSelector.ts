/**
 * AssetSelector
 */
import * as constants from 'Renderer/constants'
import { AssetsList } from 'Renderer/assets/AssetsList'
import {
    AssetName,
    AssetSelectorOptions,
    AssetSelectorManifestConfig,
    AssetSelectorDeviceConfig,
} from 'Renderer/assets/Types'

const defaultConfig: AssetSelectorManifestConfig = {
    useInpaint: false,
    useCompositeBackground: false,
    // The name of the asset used for mask data.
    segmentationAssetName: '',
    // Whether maskData uses the green channel.
    segmentationUsesGreenChannel: false,
};

// AssetSelector generates a list of texture and raw-pgn assets that should be downloaded
// from the server given the scene manifest and asset-processing options. AssetSelector
// doesn't check for asset availability in the manifest. Instead, it just generates
// a list of assets that are needed based on the manifest configuration and options and
// leaves it to AssetManager to try download these assets.
//
// Usage:
//   const assetSelector = new AssetSelector(manifest, options);
//   const requiredTextures = assetSelector.requiredTextureAssets;
//   const requiredPngData = assetSelector.requiredRawPngAssets;
//   manifest.some_asset_name = 'new/url/';
//   assetSelector.refresh();
export class AssetSelector {
    // The map (assetName => url) of required texture asset names.
    protected requiredTextures: Map<string, string | null> = new Map();

    // The map (assetName => url) of assets that must be downloaded as raw PNG buffers.
    protected requiredRawPng: Map<string, string | null> = new Map();

    // The map (assetName => url) of assets for which we need pixel data.
    protected requiredPixelData: Map<string, string | null> = new Map();

    // HDR environment map, always only one per scene.
    protected equirectangularTexture: AssetName | null = null;
    protected equirectangularTextureUrl: string | null = null;

    // Assets that can be shared among multiple asset manager instances.
    protected sharableAssets: string[] = [];

    // The device options set in constructor.
    protected config: AssetSelectorManifestConfig;

    // Options based on enabled feature flags.
    protected options: AssetSelectorOptions;

    // Parameters based on the current device and platform.
    protected deviceConfig: AssetSelectorDeviceConfig;

    // The scene manifest set in the constructor.
    protected assetsList: AssetsList;

    // Camera from which to read assets information. Always 0 for legacy manifest scenes.
    private cameraIndex: number;

    constructor(assetsList: AssetsList, options: AssetSelectorOptions,
        deviceConfig: AssetSelectorDeviceConfig, cameraIndex = 0) {
        this.assetsList = assetsList;
        this.options = options;
        this.deviceConfig = deviceConfig;
        this.config = { ...defaultConfig };
        this.cameraIndex = cameraIndex;
        this.refresh();
    }

    // Get the list of required texture asset names.
    get requiredTextureAssets(): Map<string, string | null> {
        return this.requiredTextures;
    }

    // Get the list of require raw-png asset names.
    get requiredRawPngAssets(): Map<string, string | null> {
        return this.requiredRawPng;
    }

    // Get the list of require pixel-data asset names.
    get requiredPixelDataAssets(): Map<string, string | null> {
        return this.requiredPixelData;
    }

    get sharableAssetNames(): string[] {
        return this.sharableAssets
    }

    // Get the asset name and url for the HDR environment map.
    get equirectangularTextureInfo(): [string | null, string | null] {
        return [this.equirectangularTexture, this.equirectangularTextureUrl]
    }

    // Return the mask-data configuration supported by the selected assets.
    get assetConfiguration(): AssetSelectorManifestConfig {
        return this.config;
    }

    refresh() {
        this.config = { ...defaultConfig };
        this.configure();

        this.requiredTextures.clear();
        this.requiredPixelData.clear();
        this.requiredRawPng.clear();
        this.sharableAssets.length = 0;
        this.equirectangularTexture = null;
        this.equirectangularTextureUrl = null;

        this.setupEssentialAssets();
        this.setupCompositeBackgroundAssets();
        this.setupOcclusionAssets();
        this.setupMaskDataAssets();
    }

    private configure() {
        // MaskData config: more info at
        // https://github.com/geomagical/labtech-egress/blob/develop/docs/manifest.md
        if (this.assetsList.hasAssetName(constants.SEGM_INPAINT_ASSET_NAME, this.cameraIndex)) {
            this.config.segmentationAssetName = constants.SEGM_INPAINT_ASSET_NAME;
            this.config.segmentationUsesGreenChannel = true;
        } else if (this.assetsList.hasAssetName(constants.NORM_SEGM_INPAINT_ASSET_NAME, this.cameraIndex)) {
            this.config.segmentationAssetName = constants.NORM_SEGM_INPAINT_ASSET_NAME;
        }  else if (this.assetsList.hasAssetName(constants.SEGMENTATION_ASSET_NAME, this.cameraIndex)) {
            this.config.segmentationAssetName = constants.SEGMENTATION_ASSET_NAME;
            this.config.segmentationUsesGreenChannel = true;
        } else {
            this.config.segmentationAssetName = constants.NORMALS_SEGM_ASSET_NAME;
        }
        this.config.useInpaint = this.assetsList.hasInpaintData(this.cameraIndex);

        const wallColorDisabled = this.deviceConfig.isMobile && this.options.mobileNoWallColor;
        this.config.useCompositeBackground = !wallColorDisabled &&
            this.assetsList.hasWallColorData(this.cameraIndex);
    }

    // Assets that are always downloaded.
    protected setupEssentialAssets() {
        this.addTextureAsset(constants.PANORAMA_ASSET_NAME);
        if (this.config.useInpaint) {
            this.addTextureAsset(constants.PANO_INPAINT_ASSET_NAME);
        }

        // The equirect is not strictly essential, but when it is available it is always downloaded.
        if (this.assetsList.hasAssetName(constants.EQUIRECTANGULAR_ASSET_NAME, this.cameraIndex)) {
            this.equirectangularTexture = constants.EQUIRECTANGULAR_ASSET_NAME;
            this.equirectangularTextureUrl = this.assetsList.getAssetUrl(this.equirectangularTexture, this.cameraIndex);
            this.sharableAssets.push(this.equirectangularTexture);
        }
    }

    // Assets used for composite background, which is used for wall coloring.
    private setupCompositeBackgroundAssets() {
        if (!this.config.useCompositeBackground) {
            return;
        }
        this.addTextureAsset(constants.SHADING_MAP_ASSET_NAME);
        this.addTextureAsset(constants.RESIDUAL_MAP_ASSET_NAME);
        if (this.assetsList.hasAssetName(constants.SEGMENTATION_ASSET_NAME, this.cameraIndex)) {
            this.addTextureAsset(constants.SEGMENTATION_ASSET_NAME);
        } else {
            this.addTextureAsset(constants.NORMALS_SEGM_ASSET_NAME);
        }
        if (this.config.useInpaint) {
            this.addTextureAsset(constants.SHADING_INPAINT_MAP_ASSET_NAME);
            this.addTextureAsset(constants.RESIDUAL_INPAINT_MAP_ASSET_NAME);
            if (this.assetsList.hasAssetName(constants.SEGM_INPAINT_ASSET_NAME, this.cameraIndex)) {
                this.addTextureAsset(constants.SEGM_INPAINT_ASSET_NAME);
            } else {
                this.addTextureAsset(constants.NORM_SEGM_INPAINT_ASSET_NAME);
            }
        }
    }

    // The depth occlusion assets may be downloaded either as texture or pixels.
    private setupOcclusionAssets() {
        this.addPixelData(constants.OCCLUSION_MAP_ASSET_NAME);

        if (this.deviceConfig.supportFragmentDepth) {
            if (this.deviceConfig.hasAlphaPremultBug) {
                this.addRawPngAsset(constants.OCCLUSION_MAP_ASSET_NAME);
            } else {
                this.addTextureAsset(constants.OCCLUSION_MAP_ASSET_NAME);
            }
            if (this.config.useInpaint) {
                if (this.deviceConfig.hasAlphaPremultBug) {
                    this.addRawPngAsset(constants.OCCLUSION_INPAINT_MAP_ASSET_NAME);
                } else {
                    this.addTextureAsset(constants.OCCLUSION_INPAINT_MAP_ASSET_NAME);
                }
            }
        }
    }

    // The mask-data assets and closely related shadow assets.
    private setupMaskDataAssets() {
        if (this.config.segmentationAssetName) {
            this.addTextureAsset(this.config.segmentationAssetName);
            this.addPixelData(this.config.segmentationAssetName);
        }
        // SEGMENTATION_ASSET_NAME is always used with magic eraser, if present
        if (this.assetsList.hasAssetName(constants.SEGMENTATION_ASSET_NAME, this.cameraIndex)) {
            this.addPixelData(constants.SEGMENTATION_ASSET_NAME);
        }
    }

    // Add asset that should be downloaded as a texture.
    protected addTextureAsset(name: AssetName) {
        const url = this.assetsList.getAssetUrl(name, this.cameraIndex);
        this.requiredTextures.set(name, url);
    }

    // Add asset that should be downloaded as a raw png and converted to DataTexture.
    private addRawPngAsset(name: AssetName) {
        const url = this.assetsList.getAssetUrl(name, this.cameraIndex);
        this.requiredRawPng.set(name, url);
    }

    // Add asset for which we need to read pixel data.
    private addPixelData(name: AssetName) {
        const url = this.assetsList.getAssetUrl(name, this.cameraIndex);
        this.requiredPixelData.set(name, url);
    }
}
