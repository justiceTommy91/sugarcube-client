// YP: based on SpectorJS: https://github.com/BabylonJS/Spector.js

const webglConstants = {
    R8: 33321,
    R16F: 33325,
    R32F: 33326,
    R8UI: 33330,
    RG8: 33335,
    RG16F: 33327,
    RG32F: 33328,
    ALPHA: 6406,
    RGB: 6407,
    RGBA: 6408,
    LUMINANCE: 6409,
    LUMINANCE_ALPHA: 6410,
    DEPTH_COMPONENT: 6402,
    DEPTH_STENCIL: 34041,
    SRGB_EXT: 35904,
    SRGB_ALPHA_EXT: 35906,
    RGB8: 32849,
    SRGB8: 35905,
    RGB565: 36194,
    R11F_G11F_B10F: 35898,
    RGB9_E5: 35901,
    RGB16F: 34843,
    RGB32F: 34837,
    RGB8UI: 36221,
    RGBA8: 32856,
    RGB5_A1: 32855,
    RGBA16F: 34842,
    RGBA32F: 34836,
    RGBA8UI: 36220,
    COMPRESSED_R11_EAC: 37488,
    COMPRESSED_SIGNED_R11_EAC: 37489,
    COMPRESSED_RG11_EAC: 37490,
    COMPRESSED_SIGNED_RG11_EAC: 37491,
    COMPRESSED_RGB8_ETC2: 37492,
    COMPRESSED_RGBA8_ETC2_EAC: 37493,
    COMPRESSED_SRGB8_ETC2: 37494,
    COMPRESSED_SRGB8_ALPHA8_ETC2_EAC: 37495,
    COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2: 37496,
    COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2: 37497,
    COMPRESSED_RGB_S3TC_DXT1_EXT: 33776,
    COMPRESSED_RGBA_S3TC_DXT3_EXT: 33778,
    COMPRESSED_RGBA_S3TC_DXT5_EXT: 33779,
    COMPRESSED_RGB_PVRTC_4BPPV1_IMG: 35840,
    COMPRESSED_RGBA_PVRTC_4BPPV1_IMG: 35842,
    COMPRESSED_RGB_PVRTC_2BPPV1_IMG: 35841,
    COMPRESSED_RGBA_PVRTC_2BPPV1_IMG: 35843,
    COMPRESSED_RGB_ETC1_WEBGL: 36196,
    COMPRESSED_RGB_ATC_WEBGL: 35986,
    COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL: 35986,
    COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL: 34798,

    FLOAT: 5126,
    HALF_FLOAT_OES: 36193,
    TEXTURE_2D: 3553,
    TEXTURE_BINDING_2D: 32873,
    TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
    TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
    TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
    TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
    TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
    TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
    TEXTURE_BINDING_CUBE_MAP: 34068,

    TEXTURE_2D_ARRAY: 35866,
    TEXTURE_3D: 32879,

    ARRAY_BUFFER: 34962,
    ARRAY_BUFFER_BINDING: 34964,
    ELEMENT_ARRAY_BUFFER: 34963,
    ELEMENT_ARRAY_BUFFER_BINDING: 34965,
    COPY_READ_BUFFER: 36662,
    COPY_READ_BUFFER_BINDING: 36662,
    COPY_WRITE_BUFFER: 36663,
    COPY_WRITE_BUFFER_BINDING: 36663,
    TRANSFORM_FEEDBACK_BUFFER: 35982,
    TRANSFORM_FEEDBACK_BUFFER_BINDING: 35983,
    UNIFORM_BUFFER: 35345,
    UNIFORM_BUFFER_BINDING: 35368,
    PIXEL_PACK_BUFFER: 35051,
    PIXEL_PACK_BUFFER_BINDING: 35053,
    PIXEL_UNPACK_BUFFER: 35052,
    PIXEL_UNPACK_BUFFER_BINDING: 35055,
}

const byteSizePerInternalFormat = {
    [webglConstants.R8]: 1,
    [webglConstants.R16F]: 2,
    [webglConstants.R32F]: 4,
    [webglConstants.R8UI]: 1,
    [webglConstants.RG8]: 2,
    [webglConstants.RG16F]: 4,
    [webglConstants.RG32F]: 8,
    [webglConstants.ALPHA]: 1,
    [webglConstants.RGB]: 3,
    [webglConstants.RGBA]: 4,
    [webglConstants.LUMINANCE]: 1,
    [webglConstants.LUMINANCE_ALPHA]: 2,
    [webglConstants.DEPTH_COMPONENT]: 1,
    [webglConstants.DEPTH_STENCIL]: 2,
    [webglConstants.SRGB_EXT]: 3,
    [webglConstants.SRGB_ALPHA_EXT]: 4,
    // [webglConstants.RGUI]: 2,
    [webglConstants.RGB8]: 3,
    [webglConstants.SRGB8]: 3,
    [webglConstants.RGB565]: 2,
    [webglConstants.R11F_G11F_B10F]: 4,
    [webglConstants.RGB9_E5]: 2,
    [webglConstants.RGB16F]: 6,
    [webglConstants.RGB32F]: 12,
    [webglConstants.RGB8UI]: 3,
    [webglConstants.RGBA8]: 4,
    // [webglConstants.SRGB_APLHA8]: 4,
    [webglConstants.RGB5_A1]: 2,
    // [webglConstants.RGBA4444]: 2,
    [webglConstants.RGBA16F]: 8,
    [webglConstants.RGBA32F]: 16,
    [webglConstants.RGBA8UI]: 4,
    [webglConstants.COMPRESSED_R11_EAC]: 4,
    [webglConstants.COMPRESSED_SIGNED_R11_EAC]: 4,
    [webglConstants.COMPRESSED_RG11_EAC]: 4,
    [webglConstants.COMPRESSED_SIGNED_RG11_EAC]: 4,
    [webglConstants.COMPRESSED_RGB8_ETC2]: 4,
    [webglConstants.COMPRESSED_RGBA8_ETC2_EAC]: 4,
    [webglConstants.COMPRESSED_SRGB8_ETC2]: 4,
    [webglConstants.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC]: 4,
    [webglConstants.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2]: 4,
    [webglConstants.COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2]: 4,
    [webglConstants.COMPRESSED_RGB_S3TC_DXT1_EXT]: 0.5,
    [webglConstants.COMPRESSED_RGBA_S3TC_DXT3_EXT]: 1,
    [webglConstants.COMPRESSED_RGBA_S3TC_DXT5_EXT]: 1,
    [webglConstants.COMPRESSED_RGB_PVRTC_4BPPV1_IMG]: 0.5,
    [webglConstants.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG]: 0.5,
    [webglConstants.COMPRESSED_RGB_PVRTC_2BPPV1_IMG]: 0.25,
    [webglConstants.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG]: 0.25,
    [webglConstants.COMPRESSED_RGB_ETC1_WEBGL]: 0.5,
    [webglConstants.COMPRESSED_RGB_ATC_WEBGL]: 0.5,
    [webglConstants.COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL]: 1,
    [webglConstants.COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL]: 1,
}

const originalPrefix = '__gpumemoryrecorderoriginal_'
const dataPrefix = '__gpumemoryrecorderdata_'

// const textureCreateFuncs = ['createTexture'] // no creation tracking needed for now
const textureUpdateFuncs = ['texImage2D', 'compressedTexImage2D', 'texStorage2D']
const textureDeleteFuncs = ['deleteTexture']

const bufferUpdateFuncs = ['bufferData']
const bufferDeleteFuncs = ['deleteBuffer']

class GlMemoryRecorder {
    constructor(context) {
        this.gl = context

        this.currentTextureMemory = 0
        this.currentBufferMemory = 0

        this.trackUpdate = this.trackUpdate.bind(this)
        this.trackDelete = this.trackDelete.bind(this)
    }

    start() {
        // textureCreateFuncs.forEach(functionName => this.applyOverride(functionName)) // no creation tracking needed for now
        textureUpdateFuncs.forEach(functionName => this.applyOverride(functionName,
            (...args) => this.trackUpdate(functionName, ...args)))
        textureDeleteFuncs.forEach(functionName => this.applyOverride(functionName,
            this.trackDelete))

        bufferUpdateFuncs.forEach(functionName => this.applyOverride(functionName,
            (...args) => this.trackUpdate(functionName, ...args)))
        bufferDeleteFuncs.forEach(functionName => this.applyOverride(functionName,
            this.trackDelete))
    }

    stop() {
        // textureCreateFuncs.forEach(functionName => this.unapplyOverride(functionName)) // no creation tracking needed for now
        textureUpdateFuncs.forEach(functionName => this.unapplyOverride(functionName))
        textureDeleteFuncs.forEach(functionName => this.unapplyOverride(functionName))
        bufferUpdateFuncs.forEach(functionName => this.unapplyOverride(functionName))
        bufferDeleteFuncs.forEach(functionName => this.unapplyOverride(functionName))
    }

    applyOverride(functionName, trackingFunction) {
        if (!this.gl) {
            return
        }
        if (!this.gl[functionName]) {
            return
        }
        const storedOriginalName = originalPrefix + functionName
        if (this.gl[storedOriginalName]) {
            return
        }
        this.gl[storedOriginalName] = this.gl[functionName]
        this.gl[functionName] = (...args) => {
            const targetOrInstance = args[0]
            trackingFunction(targetOrInstance, args)
            return this.gl[storedOriginalName](...args)
        }
    }

    unapplyOverride(functionName) {
        if (!this.gl) {
            return
        }
        const storedOriginalName = originalPrefix + functionName
        if (this.gl[storedOriginalName]) {
            this.gl[functionName] = this.gl[storedOriginalName]
            delete this.gl[storedOriginalName]
        }
    }

    trackUpdate(functionName, target, args) {
        const boundInstance = this.getBoundInstance(target)
        if (!boundInstance) {
            return
        }

        const customInfo = GlMemoryRecorder.getCustomInfo(functionName, target, args)
        if (!customInfo) {
            return
        }

        if (GlMemoryRecorder.isTargetTexture(target)) {
            const { type } = customInfo
            let { internalFormat } = customInfo

            // YP: SpectorJS comment:
            // @ivanpopelyshev: this hack is made according to tests on PixiJS applications
            // Float textures is not a rare case
            // WebGL1 does not have RGBA32F, RGBA16F, we need to look in `type` field
            if (internalFormat === webglConstants.RGBA) {
                if (type === webglConstants.FLOAT)  {
                    internalFormat = webglConstants.RGBA32F
                }
                if (type === webglConstants.HALF_FLOAT_OES)  {
                    internalFormat = webglConstants.RGBA16F
                }
            }

            const previousMemorySize = boundInstance[dataPrefix] ? boundInstance[dataPrefix].memorySize : 0
            const cubeMapMultiplier = target === webglConstants.TEXTURE_2D ? 1 : 6
    
            customInfo.memorySize = (customInfo.width * customInfo.height * cubeMapMultiplier
                * GlMemoryRecorder.getByteSizeForInternalFormat(internalFormat)) || 0
            boundInstance[dataPrefix] = customInfo

            this.currentTextureMemory += customInfo.memorySize - previousMemorySize
        } else { // Buffer
            const previousLength = boundInstance[dataPrefix] ? boundInstance[dataPrefix].length : 0
            boundInstance[dataPrefix] = customInfo
            this.currentBufferMemory += customInfo.length - previousLength
        }
    }

    trackDelete(boundInstance) {
        if (!boundInstance) {
            return
        }
        const customInfo = boundInstance[dataPrefix]
        if (!customInfo) {
            return
        }
        if (customInfo.target === webglConstants.TEXTURE_2D_ARRAY || customInfo.target === webglConstants.TEXTURE_3D) {
            return
        }

        if (GlMemoryRecorder.isTargetTexture(customInfo.target)) {
            this.currentTextureMemory -= customInfo.memorySize
        } else {
            this.currentBufferMemory -= customInfo.length
        }
    }

    getBoundInstance(target) {
        if (target === webglConstants.TEXTURE_2D) {
            return this.gl.getParameter(webglConstants.TEXTURE_BINDING_2D)
        }
        if (target === webglConstants.TEXTURE_CUBE_MAP_POSITIVE_X ||
            target === webglConstants.TEXTURE_CUBE_MAP_POSITIVE_Y ||
            target === webglConstants.TEXTURE_CUBE_MAP_POSITIVE_Z ||
            target === webglConstants.TEXTURE_CUBE_MAP_NEGATIVE_X ||
            target === webglConstants.TEXTURE_CUBE_MAP_NEGATIVE_Y ||
            target === webglConstants.TEXTURE_CUBE_MAP_NEGATIVE_Z) {
            return this.gl.getParameter(webglConstants.TEXTURE_BINDING_CUBE_MAP)
        }
        if (target === webglConstants.ARRAY_BUFFER) {
            return this.gl.getParameter(webglConstants.ARRAY_BUFFER_BINDING)
        }
        if (target === webglConstants.ELEMENT_ARRAY_BUFFER) {
            return this.gl.getParameter(webglConstants.ELEMENT_ARRAY_BUFFER_BINDING)
        }
        if (target === webglConstants.COPY_READ_BUFFER) {
            return this.gl.getParameter(webglConstants.COPY_READ_BUFFER_BINDING)
        }
        if (target === webglConstants.COPY_WRITE_BUFFER) {
            return this.gl.getParameter(webglConstants.COPY_WRITE_BUFFER_BINDING)
        }
        if (target === webglConstants.TRANSFORM_FEEDBACK_BUFFER) {
            return this.gl.getParameter(webglConstants.TRANSFORM_FEEDBACK_BUFFER_BINDING)
        }
        if (target === webglConstants.UNIFORM_BUFFER) {
            return this.gl.getParameter(webglConstants.UNIFORM_BUFFER_BINDING)
        }
        if (target === webglConstants.PIXEL_PACK_BUFFER) {
            return this.gl.getParameter(webglConstants.PIXEL_PACK_BUFFER_BINDING)
        }
        if (target === webglConstants.PIXEL_UNPACK_BUFFER) {
            return this.gl.getParameter(webglConstants.PIXEL_UNPACK_BUFFER_BINDING)
        }
        return null
    }

    static getCustomInfo(functionName, target, args) {
        if (functionName === "texImage2D") {
            return GlMemoryRecorder.getTexImage2DTextureInfo(args, target)
        }
        if (functionName === "compressedTexImage2D") {
            return GlMemoryRecorder.getCompressedTexImage2DTextureInfo(args, target)
        }
        if (functionName === "texStorage2D") {
            return GlMemoryRecorder.getTexStorage2DTextureInfo(args, target)
        }
        if (functionName === "bufferData") {
            return GlMemoryRecorder.getBufferCustomInfo(args, target)
        }
        return null
    }

    static getTexImage2DTextureInfo(args, target) {
        if (args[1] !== 0) {
            return null // Only manage main lod... so far.
        }

        let textureInfo = null
        if (args.length >= 8) {
            textureInfo = {
                target,
                // level: functionInformation.arguments[1],
                internalFormat: args[2],
                width: args[3],
                height: args[4],
                format: args[6],
                type: args[7],
                length: 0,
            }
        }
        else if (args.length === 6) {
            textureInfo = {
                target,
                // level: functionInformation.arguments[1],
                internalFormat: args[2],
                width: args[5].width,
                height: args[5].height,
                format: args[3],
                type: args[4],
                length: 0,
            }
        }
        return textureInfo
    }

    static getCompressedTexImage2DTextureInfo(args, target) {
        if (args[1] !== 0) {
            return null // Only manage main lod... so far.
        }

        let textureInfo = null
        if (args.length >= 7) {
            textureInfo = {
                target,
                // level: functionInformation.arguments[1],
                internalFormat: args[2],
                width: args[3],
                height: args[4],
                length: 0,
            };
        }
        return textureInfo
    }

    static getTexStorage2DTextureInfo(args, target) {
        let textureInfo = null
        if (args.length === 5) {
            // Custom data required to display the texture.
            textureInfo = {
                target,
                // level: functionInformation.arguments[1],
                internalFormat: args[2],
                width: args[3],
                height: args[4],
                length: 0,
            }
        }
        return textureInfo
    }

    static getBufferCustomInfo(args, target) {
        const length = GlMemoryRecorder.getBufferLength(args)
        return {
            target,
            length,
        }
    }

    static getByteSizeForInternalFormat(internalFormat) {
        return byteSizePerInternalFormat[internalFormat] || 4
    }

    static getBufferLength(args) {
        let length = -1
        let offset = 0
        if (args.length === 5) {
            length = args[4]
            offset = args[3]
        }

        if (length <= 0) {
            if (typeof args[1] === "number") {
                length = args[1]
            }
            else if (args[1]) {
                length = args[1].byteLength || args[1].length || 0
            }
            else {
                length = 0
            }
        }

        return length - offset;
    }

    static isTargetTexture(target) {
        return target === webglConstants.TEXTURE_2D ||
            target === webglConstants.TEXTURE_CUBE_MAP_POSITIVE_X ||
            target === webglConstants.TEXTURE_CUBE_MAP_POSITIVE_Y ||
            target === webglConstants.TEXTURE_CUBE_MAP_POSITIVE_Z ||
            target === webglConstants.TEXTURE_CUBE_MAP_NEGATIVE_X ||
            target === webglConstants.TEXTURE_CUBE_MAP_NEGATIVE_Y ||
            target === webglConstants.TEXTURE_CUBE_MAP_NEGATIVE_Z
    }
}

export default GlMemoryRecorder