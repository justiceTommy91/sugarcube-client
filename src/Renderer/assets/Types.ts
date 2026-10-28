/**
 * Types
 */

import * as constants from 'Renderer/constants'
import { Matrix4x4, PlaneData, PlaneType, Point2D, Point3D, SurfaceClass } from 'Renderer/geomviewer/geom_types'
import { Point3 } from 'Renderer/geometry/Point3'
import { SceneSource, SceneType } from 'models/scenes/constants'

export type AssetName = typeof constants.PANORAMA_ASSET_NAME |
  typeof constants.PANO_INPAINT_ASSET_NAME |
  typeof constants.SEGM_INPAINT_ASSET_NAME |
  typeof constants.NORMALS_SEGM_ASSET_NAME |
  typeof constants.NORM_SEGM_INPAINT_ASSET_NAME |
  typeof constants.OCCLUSION_MAP_ASSET_NAME |
  typeof constants.OCCLUSION_INPAINT_MAP_ASSET_NAME |
  typeof constants.RESIDUAL_MAP_ASSET_NAME |
  typeof constants.RESIDUAL_INPAINT_MAP_ASSET_NAME |
  typeof constants.SEGMENTATION_ASSET_NAME |
  typeof constants.SHADING_MAP_ASSET_NAME |
  typeof constants.SHADING_INPAINT_MAP_ASSET_NAME |
  typeof constants.EQUIRECTANGULAR_ASSET_NAME |
  typeof constants.PLANE_ORIENTATION_INPAINT_ASSET_NAME |
  typeof constants.PLANE_ORIENTATION_ASSET_NAME |
  typeof constants.PLANE_POLYGON_ASSET_NAME |
  typeof constants.INTRINSICS_ASSET_NAME

// Legacy manifest-style data.
export type ManifestExtra = {
    nearValue: number,
    farValue: number,
    useFloorMask?: boolean,
}

export type DepthOcclusionMetadata = {
    min: number,
    max: number,
}

export type LightingType = {
    id: number
    color: number[]
    position: number[]
    intensity: number
    portal?: boolean
    pbr?: { power: number }
  }
  
export type LightingData = {
    lights?: {
        directional?: LightingType[]
        point?: LightingType[]
        spot?: LightingType[]
        area?: LightingType[]
        fallback?: object
    }
  }
  
export type ManifestData = {
    plane_orientation_inpaint_0?: PlaneData,
    plane_orientation_0?: PlaneData,
    extra?: ManifestExtra,
    lighting?: LightingData,
    depth_occlusion_meta_0?: DepthOcclusionMetadata,
    intrinsics_0?: {
        m11: number,
        m22: number,
        m31: number,
        m32: number,
    },
    plane_color_0?: {
        markers: Point2D[]
    },
    stackables_0?: {
        stackables?: {
            planes: {
                horizontal: []
            }
        } 
    }
    [key: string]: undefined | number | string | object,
}

// Configuration object that AssetSelector fills up, based on assets present in the manifest.
export type AssetSelectorManifestConfig = {
    useInpaint: boolean,
    useCompositeBackground: boolean,
    // The name of the asset used for mask data.
    segmentationAssetName: AssetName | '',
    // Whether maskData uses the green channel.
    segmentationUsesGreenChannel: boolean;
}

// Device parameters essential for AssetSelector.
//
// Note about hasAlphaPremultBug: On some platforms/browsers, downloading
// images automatically pre-multiplies the alpha channel. (Notably Safari on
// iOS, see https://discourse.threejs.org/t/texture-rgb-values-are-zero-when-alpha-is-zero-on-ios/6840/12)
// In this case, the texture must be downloaded as a raw buffer and then read as decoded to PNG.
// This is an issue with the occlusion map only, as it is the only data with alpha ≠ 0/1:
// when this bug is present, for occlusion texture we need to download and decode raw PNG pixels,
// and then create THREE.DataTexture using that data, instead of simply downloading the image.
export type AssetSelectorDeviceConfig = {
    supportFragmentDepth: boolean, // I.e. device supports writing to depth buffer.
    isMobile: boolean,
    hasAlphaPremultBug: boolean, // See note above.
}

// Feature flags and other parameters configuration that can affect assets selection.
export type AssetSelectorOptions = {
    mobileNoWallColor: boolean,
}

export type GLTFViewImageList = {
    version: string,
    panoImage: number
    depthImage: number
    segmentationImage: number
}

// GLTFGeomagicalCamera describes geomagicalCamera object from room GLTF's root "extras".
export type GLTFGeomagicalCamera = {
    viewData?: {
        base: GLTFViewImageList,
        magicEraser?: GLTFViewImageList,
        roomTint?: {
            shadingImage: number
            residualImage: number
            residualEraserImage?: number
            shadingEraserImage?: number
            markers?: Point2D[]
        }
    },
    intrinsics:
    {
        cxy: number[]
        fxy: number[]
        imageSize?: number[]
    }
}

export type GLTFGeomagicalPolygon = {
    type: SurfaceClass
    id: number
    version: string
}

export type GLTFGeomagicalScene = {
    version: string
    sceneType: SceneType
    sceneSource: SceneSource
    environmentMapCustomImage: {
        uri: string
        mimeType: string
    }
    roomTemplate?: object
}

export type GLTFGeomagicalLight = {
    version: string
    pbrType?: 'point' | 'directional' | 'spot'
}

export type GLTFImage = {
    uri: string,
    name: string,
    mimeType: string
}

// Extras object that is optionally attached to scene nodes in room gLtf files.
export type RoomGLTFNodeExtras = {
    category: string,
    id: number,
}

export type GeomagicalExtras = {
    geomagical: {
        geomagicalCameras: Array<GLTFGeomagicalCamera>
        geomagicalSurfaces: Array<GLTFGeomagicalPolygon>
        geomagicalScenes: Array<GLTFGeomagicalScene>
        geomagicalLights: Array<GLTFGeomagicalLight>
    }
}

// RoomGLTFData describes the part of room GLTF JSON object, which contains data relevant to AssetManager.
export type RoomGLTFAssetData = {
    extras?: GeomagicalExtras
    images: Array<GLTFImage>
    cameras: Array<{
        extras?: {
            geomagicalCamera: number
        }
    }>
    nodes: Array<{
        extras?: {
            geomagicalSurface: number
        }
        camera?: number
    }>
}

export type PolygonType = {
    id: number,
    class: SurfaceClass,
    style: string,
    transform: Matrix4x4,
    parameters: {
        indices: number[],
        vertices: Point2D[],
        transformedVertices?: Point3[],
    }
    plane: PlaneType,
    ignoreInStaticView?: boolean,
}

export type PolygonData = {
    plane_polygons: Array<PolygonType>;
}

export type FloorLine = {
    points: Point2D[],
    n: Point3D,
    n2: Point2D,
    t2: Point2D,
    len: number,
    surfaceId: string,
}

export type FloorLines = Array<FloorLine>;

export type RenderingParamters = {
    canvas: HTMLCanvasElement,
    antialias: boolean,
    alpha: boolean,
    context?: WebGLRenderingContext
}

export type Light = {
    color: Array<number>,
    direction: Array<number>,
    id: number,
    intensity: number,
    position: Array<number>,
    size: number,
    pbr: { power: number, color: Array<number>, outer_angle: number, inner_angle: number },
    volume: Array<Array<number>>
}

export type LightOptions = {
    castShadow: boolean,
    mobileTextureSize: number,
    usePBR: boolean,
    hexgammaCol: CallableFunction,
    isMobile: CallableFunction
}

export type ShadowMapParameters = {
    light: THREE.DirectionalLight | THREE.RectAreaLight,
    usePBR: boolean,
    sceneCam: THREE.PerspectiveCamera,
    depth_occlusion_meta_0: DepthOcclusionMetadata,
    bbox: THREE.BoxHelper,
}

export enum LightType {
    Spot,
    Directional,
    Point,
    Area
}

export enum ShadowMap {
    Directional,
    Contact,
}

export enum CustomShader {
    Pbr,
    Standard
}

export enum MaterialTypes {
    Standard,
    Basic,
    Line,
    Shadow
}

