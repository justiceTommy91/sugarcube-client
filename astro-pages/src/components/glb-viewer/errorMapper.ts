export type LoadErrorTag = 'network' | 'parse' | 'unknown'

export type MappedLoadError = {
    tag: LoadErrorTag
    message: string
}

const PARSE_HINT_PATTERNS = [/glb/i, /gltf/i, /draco/i, /ktx/i, /invalid typed array/i, /malformed/i, /unexpected/i]

export function mapLoadError(err: unknown): MappedLoadError {
    if (err instanceof ProgressEvent) {
        return {
            tag: 'network',
            message: 'Could not download the file. Check the URL, your network, and whether the host allows CORS.',
        }
    }

    if (err instanceof Error) {
        const text = err.message
        if (PARSE_HINT_PATTERNS.some((re) => re.test(text))) {
            return {
                tag: 'parse',
                message: `The file could not be parsed as a GLB. Details: ${text}`,
            }
        }
        return {
            tag: 'unknown',
            message: text || 'Something went wrong while loading the model.',
        }
    }

    return {
        tag: 'unknown',
        message: 'Something went wrong while loading the model.',
    }
}
