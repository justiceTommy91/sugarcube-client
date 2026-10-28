/* eslint-disable @typescript-eslint/no-explicit-any */

import { GeomagicalExtras } from 'Renderer/assets/Types'

// Adapted from official JSON schema.
// https://github.com/bwasty/gltf-loader-ts/blob/master/source/gltf.ts
// Schema was simplified for the needs of the CustomGLTFLoader.

type GlTfId = number;

// A texture and its sampler.
export interface Texture {
    // The index of the sampler used by this texture.
    // When undefined, a sampler with repeat wrapping and auto filtering should be used.
    'sampler'?: GlTfId;
    // The index of the image used by this texture.
    'source'?: GlTfId;
    'name'?: any;
    'extensions'?: any;
    'extras'?: any;
    [k: string]: any;
}

// Image data used to create a texture. 
// Image can be referenced by URI or `bufferView` index. `mimeType` is required in the latter case.
export interface Image {
    // The uri of the image.
    "uri"?: string;
    // The image's MIME type.
    "mimeType"?: "image/jpeg" | "image/png" | string;
    // The index of the bufferView that contains the image. Use this instead of the image's uri property.
    "bufferView"?: GlTfId;
    'name'?: any;
    'extensions'?: any;
    'extras'?: any;
    [k: string]: any;
}

// Reference to a texture.
export interface TextureInfo {
    // The index of the texture.
    'index': GlTfId;
    // The set index of texture's TEXCOORD attribute used for texture coordinate mapping.
    'texCoord'?: number;
    'extensions'?: any;
    'extras'?: any;
    [k: string]: any;
}

// A set of parameter values that are used to define the metallic-roughness material model
// from Physically-Based Rendering (PBR) methodology.
export interface MaterialPbrMetallicRoughness {
    // The material's base color factor.
    'baseColorFactor'?: number[];
    // The base color texture.
    'baseColorTexture'?: TextureInfo;
    // The metalness of the material.
    'metallicFactor'?: number;
    // The roughness of the material.
    'roughnessFactor'?: number;
    // The metallic-roughness texture.
    'metallicRoughnessTexture'?: TextureInfo;
    'extensions'?: any;
    'extras'?: any;
    [k: string]: any;
}
export interface MaterialNormalTextureInfo {
    'index'?: any;
    'texCoord'?: any;
    // The scalar multiplier applied to each normal vector of the normal texture.
    'scale'?: number;
    'extensions'?: any;
    'extras'?: any;
    [k: string]: any;
}
export interface MaterialOcclusionTextureInfo {
    'index'?: any;
    'texCoord'?: any;
    // A scalar multiplier controlling the amount of occlusion applied.
    'strength'?: number;
    'extensions'?: any;
    'extras'?: any;
    [k: string]: any;
}

// The material appearance of a primitive.
export interface Material {
    'name'?: any;
    'extensions'?: any;
    'extras'?: any;
    // A set of parameter values that are used to define the metallic-roughness material model
    // from Physically-Based Rendering (PBR) methodology.
    // When not specified, all the default values of `pbrMetallicRoughness` apply.
    'pbrMetallicRoughness'?: MaterialPbrMetallicRoughness;
    // The normal map texture.
    'normalTexture'?: MaterialNormalTextureInfo;
    // The occlusion map texture.
    'occlusionTexture'?: MaterialOcclusionTextureInfo;
    // The emissive map texture.
    'emissiveTexture'?: TextureInfo;
    // The emissive color of the material.
    'emissiveFactor'?: number[];
    // The alpha rendering mode of the material.
    'alphaMode'?: 'OPAQUE' | 'MASK' | 'BLEND' | string;
    // The alpha cutoff value of the material.
    'alphaCutoff'?: number;
    // Specifies whether the material is double sided.
    'doubleSided'?: boolean;
    [k: string]: any;
}

export interface Camera {
    [k: string]: any;
}

export interface Sampler {
    magFilter?: number
    minFilter?: number
    wrapS?: number
    wrapT?: number
    name?: string
    extensions?: object
    extras?: object
}

export interface Node {
    [k: string]: any;
}

// The root object for a glTF asset.
export interface GLTf {
    // Names of glTF extensions used somewhere in this asset.
    'extensionsUsed'?: string[];
    // Names of glTF extensions required to properly load this asset.
    'extensionsRequired'?: string[];
    // An array of accessors.
    'accessors'?: object[];
    // An array of keyframe animations.
    'animations'?: object[];
    // Metadata about the glTF asset.
    'asset': object;
    // An array of buffers.
    'buffers'?: object[];
    // An array of bufferViews.
    'bufferViews'?: object[];
    // An array of cameras.
    'cameras'?: Camera[];
    // An array of images.
    'images'?: Image[];
    // An array of materials.
    'materials'?: Material[];
    // An array of meshes.
    'meshes'?: object[];
    // An array of nodes.
    'nodes'?: Node[];
    // An array of samplers.
    'samplers'?: Sampler[];
    // The index of the default scene.
    'scene'?: GlTfId;
    // An array of scenes.
    'scenes'?: object[];
    // An array of textures.
    'textures'?: Texture[];
    'extensions'?: any;
    'extras'?: GeomagicalExtras;
    [k: string]: any;
}
