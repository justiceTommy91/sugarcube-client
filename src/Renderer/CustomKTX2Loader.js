import * as THREE from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'

const staticTaskCache = new WeakMap()
export default class CustomKTX2Loader extends KTX2Loader {
    constructor() {
        super()
        this.lastTranscodingTime = null
        this.transcodingTimes = new Map()
    }

    load(url, onLoad, onProgress, onError) {
        const loader = new THREE.FileLoader(this.manager)

        loader.setResponseType('arraybuffer')
        loader.setWithCredentials(this.withCredentials)

        const texture = new THREE.CompressedTexture()

        loader.load(url, (buffer) => {
            // Check for an existing task using this buffer. A transferred buffer cannot be transferred
            // again from this thread.
            if(staticTaskCache.has( buffer)) {
                const cachedTask = staticTaskCache.get(buffer)
                return cachedTask.promise.then( onLoad ).catch(onError)
            }

            return this.createTexture([buffer])
                .then((_texture) => {
                    texture.copy(_texture)
                    texture.needsUpdate = true
                    if (onLoad) {
                        onLoad(texture)
                    }
                })
                .catch(onError)
        }, onProgress, onError)

        return texture
    }

    createTexture(buffers, config = {}) {
        let transcodingStart = performance.now()
        const taskConfig = config;
        const texturePending = this.init()
        .then(() => {
            transcodingStart = performance.now()
            return this.workerPool.postMessage({
                type: 'transcode',
                buffers,
                taskConfig
            }, buffers)
        })
        .then((e) => {
            const transcodingTime = performance.now() - transcodingStart
            const texture = this.createTextureFrom(e.data)
            this.transcodingTimes.set(texture.uuid, transcodingTime)
            return texture
        })

        // Cache the task result.
        staticTaskCache.set(buffers[0], { promise: texturePending })
        return texturePending
    }

    static cleanup() {
        staticTaskCache.clear()
    }
}
