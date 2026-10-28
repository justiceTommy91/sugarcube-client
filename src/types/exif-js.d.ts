declare module 'exif-js' {
    export type ExifValue = string | number | number[] | undefined
    export type ExifTags = Record<string, ExifValue>
    
    interface ImageWithExifData extends HTMLImageElement {
        exifdata?: ExifTags
    }
    
    export function getData(img: HTMLImageElement, callback: (this: ImageWithExifData) => void): void
    export function getAllTags(img: HTMLImageElement | ImageWithExifData): ExifTags
    export function getTag(img: HTMLImageElement, tag: string): ExifValue
    export function pretty(img: HTMLImageElement): string
}
