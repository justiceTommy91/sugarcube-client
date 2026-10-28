const ALLOWED_HOST = 'storage.googleapis.com'

const ALLOWED_BUCKET_PREFIXES = [
    '/wallspice-3d-models/',
    '/wallspice-cdn-prod/',
    '/cdn-develop/',
    '/catalog-processed/',
    '/catalog-origin/',
    '/processed-prod/',
    '/processed-develop/',
    '/wallspice-prod/',
    '/wallspice-develop/',
    '/wallspice-assets/',
    '/geomagical-upload-prod/',
    '/geomagical-upload-dev/',
] as const

export type UrlAllowlistResult =
    | { ok: true; matchedPrefix: string }
    | { ok: false; reason: 'invalid_url' | 'wrong_host' | 'wrong_path' }

export function validateGlbUrl(rawUrl: string): UrlAllowlistResult {
    let parsed: URL
    try {
        parsed = new URL(rawUrl)
    } catch {
        return { ok: false, reason: 'invalid_url' }
    }

    if (parsed.protocol !== 'https:') {
        return { ok: false, reason: 'invalid_url' }
    }

    if (parsed.hostname !== ALLOWED_HOST) {
        return { ok: false, reason: 'wrong_host' }
    }

    const matched = ALLOWED_BUCKET_PREFIXES.find((prefix) => parsed.pathname.startsWith(prefix))
    if (!matched) {
        return { ok: false, reason: 'wrong_path' }
    }

    return { ok: true, matchedPrefix: matched }
}

export const ALLOWED_HOSTS_DESCRIPTION = `https://${ALLOWED_HOST}/{${ALLOWED_BUCKET_PREFIXES.map((p) =>
    p.replace(/^\/|\/$/g, ''),
).join('|')}}/...`
