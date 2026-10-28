/**
 * PixArray
 */

// Pixel filter function, applies to pixel whose first byte start at pixIndex in pixels array.
export type PixFilter = (pixIndex: number) => boolean;

// Pixel operation, (x, y) are the grid coordinate of the pixel, while byteIndex is the index
// to the pixel's first byte in the raw-pixel array.
export type PixOp = (x: number, y: number, byteIndex: number) => void;

// Helper class to interpret byte array as rectangular array of pixels.
export class PixArray {
    // Byte array of raw pixel data.
    private rawPixels: Uint8Array | Uint8ClampedArray;

    // With of pixmap in pixels.
    private pixWidth: number;

    // Height of pixmap in pixels.
    private pixHeight: number;

    // Number of bytes per pixel. E.g. 4 for a RGBA image.
    private bytePerPix: number;

    // Wether to flip the pixels vertically.
    private flipY: boolean;

    // Create and return a pixmap wrapper for 8-bit-per-channel RGBA data.
    static createPixmapFromRgbaData(
        rawPixels: Uint8Array | Uint8ClampedArray,
        pixWidth: number,
        pixHeight: number,
        flipY: boolean): PixArray {

        return new PixArray(rawPixels, pixWidth, pixHeight, 4, flipY);
    }

    constructor(
        rawPixels: Uint8Array | Uint8ClampedArray, // Raw pixels
        pixWidth: number, // Width of pixel data in pixels.
        pixHeight: number, // Height of pixel data in pixels.
        bytesPerPix: number, // Number of bytes per pixels, e.g. 4 for RGBA image.
        flipY: boolean) { // Whether the image should be flipped upside down.

        this.bytePerPix = bytesPerPix;
        this.flipY = flipY;
        this.pixHeight = pixHeight;
        this.pixWidth = pixWidth;
        this.rawPixels = rawPixels;
    }

    // Access pixel array.
    get pixels(): Uint8Array | Uint8ClampedArray {
        return this.rawPixels;
    }

    // Return the width of the pix array in pixels.
    get width(): number { return this.pixWidth; }

    // Return the height of the pix array in pixels.
    get height(): number { return this.pixHeight; }

    // Return the pixel index for the first byte on row number <row>.
    rowIndex(row: number) {
        const y = this.flipY ? (this.pixHeight - 1 - row) : row;
        return y * this.pixWidth * this.bytePerPix;
    }

    // Return the pixel index for the first byte of pixel at coord. (col, row).
    pixIndex(col: number, row: number) {
        const y = this.flipY ? (this.pixHeight - 1 - row) : row;
        return (y * this.pixWidth + col) * this.bytePerPix;
    }

    // Read the pixel at index <atIndex> into <toPixel>. The length of array <toPixel>
    // determines how many pixels are read. Returns toPixel for convenience.
    readPixel(atIndex: number, toPixel: number[]): number[] {
        for (let i = 0; i < toPixel.length; i += 1) {
            // eslint-disable-next-line no-param-reassign
            toPixel[i] = this.rawPixels[atIndex + i];
        }

        return toPixel;
    }

    // Read pixel at col=x, row=y into toPixel. (See readPixel above).  Returns toPixel
    // for convenience.
    readPixelAtXY(x: number, y: number, toPixel: number[]): number[] {
        return this.readPixel(this.pixIndex(x, y), toPixel);
    }

    // Set the pixel at index <atIndex> from <fromPixel>. The length of array <fromPixel>
    // determines how many pixels are set.
    setPixel(atIndex: number, fromPixel: number[]) {
        for (let i = 0; i < fromPixel.length; i += 1) {
            this.rawPixels[atIndex + i] = fromPixel[i];
        }
    }

    // Apply pixel op to every pixel that match the given filter, or to all pixels
    // if no filter is provided.
    apply(op: PixOp, pixFilter?: PixFilter) {
        for (let y = 0; y < this.pixHeight; y += 1) {
            let pixIndex = this.rowIndex(y);
            for (let x = 0; x < this.pixWidth; x += 1) {
                if (!pixFilter || pixFilter(pixIndex)) {
                    op(x, y, pixIndex);
                }

                pixIndex += this.bytePerPix;
            }
        }
    }
}
