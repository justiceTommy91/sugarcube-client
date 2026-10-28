import * as THREE from 'three'
import * as constants from 'Renderer/constants'

// AssetConfig is a map assetName => set of properties which will be assigned 
// to the corresponding downloaded texture. Properties must be the same as in THREE.Texture class.
export type TextureConfig = {
    [key: string]: {
        flipY?: boolean,
        colorSpace?: THREE.ColorSpace,
        type?: THREE.TextureDataType,
        magFilter?: THREE.TextureFilter,
        minFilter?: THREE.TextureFilter,
    }
}

// Settings for textures that are downloaded and stored as THREE.Texture.
export const texturesConfig: TextureConfig = {
    [constants.PANORAMA_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,
    },
    [constants.PANO_INPAINT_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType
    },
    [constants.SHADING_MAP_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,
    },
    [constants.RESIDUAL_MAP_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,
    },
    [constants.SHADING_INPAINT_MAP_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,
    },
    [constants.RESIDUAL_INPAINT_MAP_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,
    },
    [constants.SEGM_INPAINT_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
    },
    [constants.SEGMENTATION_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
    },
    [constants.NORM_SEGM_INPAINT_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,        
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
    },
    [constants.NORMALS_SEGM_ASSET_NAME]: {
        flipY: false,
        colorSpace: THREE.LinearSRGBColorSpace,
        type: THREE.HalfFloatType,        
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
    },
}

// Settings for transient textures that are downloaded and only used to read pixels with TextureHelper.
// Note that AssetManager sets flipY = false by default, for such textures.
export const texturesForPixelDataConfig: TextureConfig = {
    [constants.OCCLUSION_MAP_ASSET_NAME]: {
        flipY: false,
    }
}

// Settings for textures in the E2E testing environment, which help with the
// cross environment repeatability and consistency of the baselines.
export const texturesForTestingConfig: TextureConfig = {
    default: {
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
    }
}
