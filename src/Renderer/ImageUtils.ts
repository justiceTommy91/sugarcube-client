// Utility function to find wether an image is all black
export const isImageBlack = (data: Uint8Array): boolean => {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        if (r !== 0 || g !== 0 || b !== 0) return false
    }
    return true
}

// Utility function to convert imageData to a data URL
export function imageDataToDataURL(imageData: ImageData, type?: string, quality?: number) : string | null {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL(type, quality);
    }
    return null
}

// Utility function to blend semit-transparent pixels with a background color
export function blendTransparentPixels (data: Uint8ClampedArray, bgr: number, bgg: number, bgb: number) {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3] / 255;
        if (alpha < 1) { // If pixel is not fully opaque
            const invAlpha = (1 - alpha)
            data[i] = r * alpha + bgr * invAlpha;
            data[i + 1] = g * alpha + bgg * invAlpha;
            data[i + 2] = b * alpha + bgb * invAlpha;
            data[i + 3] = 255;
        }
    }
    return data;
}
