export type FileValidationResult = { ok: true } | { ok: false; reason: 'wrong_extension' | 'empty_file' }

export function validateGlbFile(file: File): FileValidationResult {
    if (file.size === 0) {
        return { ok: false, reason: 'empty_file' }
    }

    const name = file.name.toLowerCase()
    if (!name.endsWith('.glb')) {
        return { ok: false, reason: 'wrong_extension' }
    }

    return { ok: true }
}
