/* eslint-disable i18next/no-literal-string */
/* eslint-disable max-classes-per-file */

import * as THREE from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import type { SceneItemMetrics } from 'Renderer/geomviewer'
import {
    EVT_GLTFLOADER_FILE_LOAD_BEGIN,
    EVT_GLTFLOADER_FILE_LOAD_END,
    EVT_GLTFLOADER_PARSE_BEGIN,
    EVT_GLTFLOADER_PARSE_END,
} from 'Renderer/constants'
import { GLTf } from 'Renderer/gltf/gltf'
import CustomKTX2Loader from 'Renderer/CustomKTX2Loader'
import {
    GLTFParser,
    EXTENSIONS,
    GLTFBinaryExtension,
    GLTFTextureWebPExtension,
    GLTFMaterialsUnlitExtension,
    GLTFMaterialsPbrSpecularGlossinessExtension,
    GLTFDracoMeshCompressionExtension,
    GLTFTextureTransformExtension,
    GLTFMeshQuantizationExtension
} from 'Renderer/gltf/gltfParser'
import { GltfParseOptions, applyGltfParsingOptions } from './gltfUtils'
import { createAreaLightProxyGLTFPlugin } from './areaLightGLTFPlugin'

const BINARY_EXTENSION_HEADER_MAGIC = 'glTF'
const meshCompressionNone = 'none'
const meshCompressionDraco = 'draco'
const textureCompressionNone = 'none'
const textureCompressionBasisU = 'basisU'
const errorDuringFileLoad = 'errorDuringFileLoad'
const errorDuringGltfJsonAnalyze = 'errorDuringGltfJsonAnalyze'

interface CustomGLTFLoader extends GLTFLoader {
    pluginCallbacks: { (parser: GLTFParser): GLTFTextureBasisUExtension } []
    ktx2Loader: CustomKTX2Loader
    meshoptDecoder: object
}

class GLTFTextureBasisUExtension {
    public name: string;
    private parser: GLTFParser;
    private metrics: SceneItemMetrics;

    constructor(parser: GLTFParser, metrics: SceneItemMetrics) {
        this.parser = parser
        this.name = 'KHR_texture_basisu'
        this.metrics = metrics
    }

    loadTexture (textureIndex: number) {
        const parser = this.parser
        const json = parser.json as GLTf
        const options = parser.options as { ktx2Loader: CustomKTX2Loader }

        const textureDef = json.textures?.[textureIndex]

        if ( !textureDef?.extensions || !textureDef?.extensions[this.name]) {
            return null
        }

        const extension = textureDef.extensions[this.name]
        const source = json.images?.[extension.source]
        const loader = options.ktx2Loader

        if (!loader) {
            if (json.extensionsRequired && json.extensionsRequired.indexOf(this.name) >= 0) {
                throw new Error( 'THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures' )
            } else {
                // Assumes that the extension is optional and that a fallback texture is present
                return null
            }
        }

        if (this.metrics) {
            this.metrics.TextureCompression = textureCompressionBasisU
        }
        return parser.loadTextureImage(textureIndex, source, loader)
            .then((texture: THREE.Texture) => {
                /* eslint-disable no-param-reassign */
                texture.magFilter = THREE.LinearFilter
                texture.minFilter = THREE.LinearFilter
                /* eslint-enable no-param-reassign */
                if (loader.transcodingTimes.has(texture.uuid) && this.metrics) {
                    this.metrics.msBasisUniversalTextureTranscodingTime += loader.transcodingTimes.get(texture.uuid)
                }
                return texture
            })
    }
}

class CustomGLTFLoader extends GLTFLoader {

    constructor(manager?: THREE.LoadingManager) {
        super(manager)
        this.register((parser) => new GLTFTextureWebPExtension(parser))
        this.register((parser) => createAreaLightProxyGLTFPlugin(parser))
    }

    public dispose() {
        this.pluginCallbacks = [];
    }

    // Downloads a single .gltf/.glb file using the file loader 
    public loadGLTFJson(
        url: string,
        onProgress: ((event: ProgressEvent<EventTarget>) => void) | undefined,
        format: 'arraybuffer' | 'text' | 'json',
        metrics?: SceneItemMetrics,
    ) : Promise<string | ArrayBuffer | GLTf> {
        // Tells the LoadingManager to track an extra item, which resolves after
        // the model is fully loaded. This means the count of items loaded will
        // be incorrect, but ensures manager.onLoad() does not fire early.
        this.manager.itemStart(url)

        const loader = new THREE.FileLoader(this.manager)

        loader.setPath(this.path)
        loader.setResponseType(format)
        loader.setRequestHeader(this.requestHeader)
        loader.setWithCredentials(this.withCredentials)

        const downloadStart = window.performance.now()
        document.dispatchEvent(new Event(EVT_GLTFLOADER_FILE_LOAD_BEGIN))
        
        return new Promise<string | ArrayBuffer | GLTf>((resolve, reject) => {
            loader.load(
                url,
                (data: string | ArrayBuffer | GLTf | PromiseLike<string | ArrayBuffer | GLTf>) => {
                    document.dispatchEvent(new Event(EVT_GLTFLOADER_FILE_LOAD_END))
                    if (metrics) {
                        /* eslint-disable no-param-reassign */
                        metrics.sFileDownloadTime = (window.performance.now() - downloadStart) / 1000
                        if (data instanceof ArrayBuffer)
                            metrics.MbFileSizeTransferred = data.byteLength / 1024 / 1024
                        else if (typeof data === 'string')
                            metrics.MbFileSizeTransferred = data.length * 2 / 1024 / 1024

                        metrics.msStartParsing = Date.now()
                        /* eslint-enable no-param-reassign */
                    }
                    resolve(data)                
                },
                onProgress,
                (e: unknown) => {
                    this.manager.itemError(url)
                    this.manager.itemEnd(url)
                    reject(new ErrorEvent(errorDuringFileLoad, e as ErrorEventInit))
                },
            )
        })
    }

    // Parses a .gltf JSON/String or a .glb binary blob into a ThreeJS Scene.
    public parseGLTFJson(
        fileData: string | ArrayBuffer | GLTf,
        resourcePath: string,
        metrics?: SceneItemMetrics,
        options?: GltfParseOptions,
    ) : Promise<GLTF>{
        // this function will be called in the beginning of this.parse, synchronously,before
        // starting any async operation, i.e. metrics variable will stay unchanged until then
        const khrTextureBasisuIdx = 2;
        this.pluginCallbacks[khrTextureBasisuIdx] = (parser: GLTFParser) =>
            new GLTFTextureBasisUExtension(parser, metrics as SceneItemMetrics)

        if (metrics) {
            // eslint-disable-next-line no-param-reassign
            metrics.TextureCompression = textureCompressionNone
        }

        document.dispatchEvent(new Event(EVT_GLTFLOADER_PARSE_BEGIN))
        return new Promise<GLTF>((resolve, reject) => {
            this.parse(
                fileData,
                resourcePath,
                (gltf) => {
                    document.dispatchEvent(new Event(EVT_GLTFLOADER_PARSE_END))
                    resolve(gltf)
                },
                (e) => {
                    reject(new ErrorEvent(errorDuringGltfJsonAnalyze, e))
                },
                metrics,
                options,
            )
        })
    }

    // Implements the public interface to use the custom load and parse methods.
    public load (
        url: string,
        onLoad: (gltf: GLTF) => void,
        onProgress: ((event: ProgressEvent<EventTarget>) => void) | undefined,
        onError: ((event: ErrorEvent) => void) | undefined,
        metrics?: SceneItemMetrics,
    ) : void {
        let resourcePath = ''

        if (this.resourcePath !== '') {
            resourcePath = this.resourcePath
        } else if (this.path !== '') {
            resourcePath = this.path
        } else {
            resourcePath = THREE.LoaderUtils.extractUrlBase(url)
        }

        const loadingPromise = this.loadGLTFJson(url, onProgress, 'arraybuffer', metrics)
        loadingPromise.then(data => { 
            const parsingPromise = this.parseGLTFJson(data, resourcePath, metrics)
            parsingPromise.then(gltf => {
                onLoad(gltf)
            }).catch(parsingError => {
                onError?.(parsingError)
            })
        }).catch(loadingError => {
            onError?.(loadingError)
        })
    }

    // Implements the parse method to support Json gltf parsing.
    public parse(
        data: string | ArrayBuffer | GLTf,
        path: string,
        onLoad: (gltf: GLTF) => void,
        onError?: ((event: ErrorEvent) => void) | undefined,
        metrics?: SceneItemMetrics,
        options?: GltfParseOptions,
    ): void {
        let json
        const extensions: { [key: string]: unknown } = {}
        const plugins: { [key: string]: object } = {}
    
        if ( typeof data === 'string' ) {
            json = JSON.parse(data)
        } else if (data instanceof ArrayBuffer) {
            let content
            const magic = THREE.LoaderUtils.decodeText(new Uint8Array(data, 0, 4))
            if (magic === BINARY_EXTENSION_HEADER_MAGIC) {
                try {
                    extensions[EXTENSIONS.KHR_BINARY_GLTF] = new GLTFBinaryExtension(data)
                } catch (error) {
                    if (onError) onError(error as ErrorEvent)
                    return
                }
                content = (extensions[EXTENSIONS.KHR_BINARY_GLTF] as { content: string }).content
            } else {
                content = THREE.LoaderUtils.decodeText(new Uint8Array(data))
            }
            json = JSON.parse(content)
        } else {
            json = data
        }

        if (json.asset === undefined || json.asset.version[0] < 2) {
            if (onError) onError(
                new ErrorEvent('THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.'))
            return
        }

        if (options)
            applyGltfParsingOptions(json, options)
        
        if (metrics && json.extensionsUsed) {
            metrics.MeshCompression = json.extensionsUsed
                .some((extensionName: string) => extensionName === 'KHR_draco_mesh_compression')
                ? meshCompressionDraco
                : meshCompressionNone
        }

        const parser = new GLTFParser(json, {
            path: path || this.resourcePath || '',
            crossOrigin: this.crossOrigin,
            requestHeader: this.requestHeader,
            manager: this.manager,
            ktx2Loader: this.ktx2Loader,
            meshoptDecoder: this.meshoptDecoder
        })
        parser.fileLoader.setRequestHeader(this.requestHeader)
        for (let i = 0; i < this.pluginCallbacks.length; i += 1 ) {
            const plugin = this.pluginCallbacks[i](parser)
            plugins[plugin.name] = plugin

            // Workaround to avoid determining as unknown extension
            // in addUnknownExtensionsToUserData().
            // Remove this workaround if we move all the existing
            // extension handlers to plugin system
            extensions[plugin.name] = true;

        }

        // Instead of repeatedly checking for the existence of the extensionsRequired array inside the loop,
        // we can move this check outside the loop since it doesn't change during each iteration and
        // can create an object literal to directly map the extension names to their corresponding classes. 

        const extensionClasses = {
            [EXTENSIONS.KHR_MATERIALS_UNLIT]: GLTFMaterialsUnlitExtension,
            [EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS]: GLTFMaterialsPbrSpecularGlossinessExtension,
            [EXTENSIONS.KHR_DRACO_MESH_COMPRESSION]: GLTFDracoMeshCompressionExtension,
            [EXTENSIONS.KHR_TEXTURE_TRANSFORM]: GLTFTextureTransformExtension,
            [EXTENSIONS.KHR_MESH_QUANTIZATION]: GLTFMeshQuantizationExtension,
        }

        if (json.extensionsUsed) {
            const extensionsRequired = json.extensionsRequired || [];
        
            // eslint-disable-next-line no-plusplus
            for (let i = 0; i < json.extensionsUsed.length; ++i) {
                const extensionName = json.extensionsUsed[i];
        
                // eslint-disable-next-line no-prototype-builtins
                if (extensionClasses.hasOwnProperty(extensionName)) {
                    extensions[extensionName] = new extensionClasses[extensionName](json, this.dracoLoader);
                } else if (extensionsRequired.indexOf(extensionName) >= 0 && plugins[extensionName] === undefined) {
                        // eslint-disable-next-line no-console
                        console.warn(`THREE.GLTFLoader: Unknown extension "${extensionName}".`);
                    }
            }
        }

        parser.setExtensions( extensions );
        parser.setPlugins( plugins );
        parser.parse( onLoad, onError );    
    }
}

// const gltfLoader = new CustomGLTFLoader()
// gltfLoader.setKTX2Loader(new CustomKTX2Loader())

export default CustomGLTFLoader
