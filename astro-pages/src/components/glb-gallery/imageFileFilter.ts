const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'] as const

export function isImageFilename(name: string): boolean {
    const lower = name.toLowerCase()
    return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function isGlbFilename(name: string): boolean {
    return name.toLowerCase().endsWith('.glb')
}
