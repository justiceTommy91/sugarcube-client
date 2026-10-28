/**
 * SceneManifest
 */
import { PlaneData, Point2D } from 'Renderer/geomviewer/geom_types'
import { AssetsList } from 'Renderer/assets/AssetsList'
import {
    AssetName,
    PolygonData,
    ManifestData,
    ManifestExtra,
    LightingData,
    DepthOcclusionMetadata
} from 'Renderer/assets/Types'
import * as constants from 'Renderer/constants'
import { CameraIntrinsics } from 'Renderer/multiview/camera_types'

// SceneManifest is a convenience wrapper around the manifest data. It add several
// functions to access and check manifest properties.
export class SceneManifest implements AssetsList {
    private manifest: ManifestData
    private cameraCount = 1

    constructor(manifest: ManifestData) {
        this.manifest = manifest;
    }

    getCamerasCount(): number {
        return this.cameraCount
    }

    hasInpaintData() {
        return this.hasAssetName(constants.PANO_INPAINT_ASSET_NAME)
    }

    getPlaneData(): PlaneData | undefined {
        let planeData = undefined
        if (this.hasAssetName(constants.SEGM_INPAINT_ASSET_NAME) ||
            this.hasAssetName(constants.NORM_SEGM_INPAINT_ASSET_NAME)) {
            planeData =  this.getAssetValue(constants.PLANE_ORIENTATION_INPAINT_ASSET_NAME) as PlaneData
        } else {
            planeData = this.getAssetValue(constants.PLANE_ORIENTATION_ASSET_NAME) as PlaneData
        }
        planeData.planeData.forEach((plane, index) => { plane.id = index })
        return planeData
    }

    getPolygonData(): PolygonData | undefined {
        return this.getAssetValue(constants.PLANE_POLYGON_ASSET_NAME) as PolygonData
    }

    getCameraIntrinsics(): CameraIntrinsics | undefined {
        return {
            focalLengthX: this.manifest.intrinsics_0?.m11 || 0,
            focalLengthY: this.manifest.intrinsics_0?.m22 || 0,
            principalPointX: this.manifest.intrinsics_0?.m31 || 0,
            principalPointY: this.manifest.intrinsics_0?.m32 || 0,
            imageWidth: (this.manifest.intrinsics_0?.m31 || 0) * 2,
            imageHeight: (this.manifest.intrinsics_0?.m32 || 0) * 2
        }
    }

    // eslint-disable-next-line class-methods-use-this
    getCameraExtrinsics() {
        return {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
        }
    }

    getRawAssetByName(assetName: AssetName) {
        return this.getAssetValue(assetName)
    }

    // Returns the value associated with an asset name in the manifest, or undefined.
    getAssetValue(name: string): undefined | number | string | object {
        return this.manifest[name];
    }

    // Returns whether the manifest has a URL for the given asset name. This functions
    // checks both name and <name>_webp.
    hasAssetName(name: string) {
        return (name in this.manifest) || (`${name}_webp` in this.manifest);
    }

    // Return an asset URL given its name in the manifest. This function tries to retrieve
    // the URL by both the bare asset name and the name with "_webp" appended.
    getAssetUrl(assetName: string): string | null {
        let url = this.manifest[assetName] as string | undefined;
        if (url) {
            return url;
        }

        url = this.manifest[`${assetName}_webp`] as string | undefined;
        return url || null;
    }

    hasOcclusionData(): boolean {
        return this.hasAssetName(constants.OCCLUSION_MAP_ASSET_NAME);
    }

    hasWallColorData(): boolean {
        return this.hasAssetName(constants.RESIDUAL_MAP_ASSET_NAME) &&
            this.hasAssetName(constants.SHADING_MAP_ASSET_NAME)
    }

    hasWallColorInpaintData(): boolean {
        return this.hasAssetName(constants.RESIDUAL_INPAINT_MAP_ASSET_NAME) &&
            this.hasAssetName(constants.SHADING_INPAINT_MAP_ASSET_NAME)
    }

    getExtraData(): ManifestExtra | undefined {
        return this.manifest.extra
    }

    getLightingData(): LightingData | undefined {
        return this.manifest.lighting
    }

    getDepthOcclusionMetadata(): DepthOcclusionMetadata | undefined {
        return this.manifest.depth_occlusion_meta_0
    }

    // Returns legacy wall color pin markers from the manifest.
    getCameraMarkers(): Point2D[] | undefined {
        return this.manifest.plane_color_0?.markers
    }

    // Returns legacy static stacking surfaces from the manifest.
    getStaticStackingSurfaces() {
        return this.manifest.stackables_0?.stackables?.planes
    }

    // eslint-disable-next-line class-methods-use-this
    getRoomTemplate() {
        return null
    }
}
