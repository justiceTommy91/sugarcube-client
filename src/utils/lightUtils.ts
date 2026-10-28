import type { ManifestData } from 'Renderer/assets/Types'
import { GLTf } from 'Renderer/gltf/gltf'

// Available analytical light types.
export const LIGHT_DIRECTIONAL = 0
export const LIGHT_POINT = 1
export const LIGHT_SPOT = 2
export const LIGHT_AREA = 3
export const LIGHT_TYPES = {
    directional: LIGHT_DIRECTIONAL,
    point: LIGHT_POINT,
    spot: LIGHT_SPOT,
    area: LIGHT_AREA,
}

// Utility function to convert light intensity units from Watts to Lumens.
export function wattsToLumens(
    watts: number | undefined,
    LIGHT_TYPE: number,
    additionalProps?: { outer_angle?: number },
): number {
    if (watts === undefined || Number.isNaN(watts)) {
        return 0
    }
    if (LIGHT_TYPE === LIGHT_DIRECTIONAL) {
        return (watts * 2) / Math.PI
    }
    if (LIGHT_TYPE === LIGHT_POINT) {
        return watts
    }
    if (LIGHT_TYPE === LIGHT_SPOT) {
        return watts * ((additionalProps?.outer_angle || Math.PI) / (Math.PI * 2))
    }
    if (LIGHT_TYPE === LIGHT_AREA) {
        return watts
    }
    return watts
}

// Utility function to extract the lights intensities lists
// as described by debug settings from the scene manifest.
export function getLightIntensitiesLists(
    scene?: { manifest: ManifestData | null; gltfManifest: GLTf | null;},
    usingPBR?: boolean,
) {
    if (!scene)
        return {}

    const manifest = scene.manifest
    const lights = manifest?.lighting?.lights
    if (lights) {
        const lighIntensities: { [key: string]: number[] } = {}
        Object.keys(lights).forEach((keyString) => {
            const lightType = keyString as keyof typeof LIGHT_TYPES
            if (!Array.isArray(lights[lightType])) {
                return
            }
            const intensities = usingPBR
                ? lights[lightType]?.filter((l) => !l.portal).map((l) => l.pbr?.power || 0) || []
                : lights[lightType]?.map((l) => l.intensity) || []
            const intensitiesListKey = `${lightType}LightIntensities`
            lighIntensities[intensitiesListKey] = intensities
        })
        return lighIntensities    
    }

    const lightsGLTF = scene.gltfManifest?.extensions?.KHR_lights_punctual?.lights
    const lightsExtras = scene.gltfManifest?.extras?.geomagical.geomagicalLights
    if (lightsGLTF) {
        const lighIntensities: { [key: string]: number[] } = {}
        lightsGLTF.forEach((light: { type: string, intensity: number, extras: { geomagicalLight: number } }) => {
            const lightType = lightsExtras?.[light.extras.geomagicalLight].pbrType || light.type
            const intensitiesListKey = `${lightType}LightIntensities`
            if (!lighIntensities[intensitiesListKey])
                lighIntensities[intensitiesListKey] = []
            const index = lighIntensities[intensitiesListKey].length
            lighIntensities[intensitiesListKey][index] = light.intensity
        })
        return lighIntensities
    }

    return {}
}
