import * as THREE from 'three'

/**
 * A copy of THREE.TextureLoader with added request abort functionality.
 */
class TextureLoader extends THREE.Loader {

    private image?: HTMLImageElement

    load(url: string,
        onLoad?: (texture: THREE.Texture) => void,
        onProgress?: (event: ProgressEvent) => void,
        onError?: (event: unknown) => void,
        ) {
        const texture = new THREE.Texture()

        const imageLoader = new THREE.ImageLoader(this.manager)
        imageLoader.setCrossOrigin(this.crossOrigin)
        imageLoader.setPath(this.path)

        this.image = imageLoader.load(url, (loadedImage) => {
            texture.image = loadedImage
            texture.needsUpdate = true

            if (onLoad !== undefined) {
                onLoad(texture)
            }
        }, onProgress, onError)
        return texture
    }

    abortDownload() {
        if (!this.image) {
            return
        }
        this.image.src = ''
    }
}


export { TextureLoader }
