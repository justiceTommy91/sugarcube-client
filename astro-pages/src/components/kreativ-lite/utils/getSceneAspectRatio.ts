import type { SceneInfo } from '@gatsby/Renderer/geomviewer/geom_types'

type GeomagicalCamera = {
    intrinsics?: {
        imageSize?: [number, number]
        cxy?: [number, number]
    }
}

type GltfManifestExtras = {
    extras?: { geomagical?: { geomagicalCameras?: GeomagicalCamera[] } }
}

/**
 * Reads the scene's native aspect ratio from the GLTF manifest before the viewer
 * starts, so ViewerLayout can size itself correctly on first render (no grey bars
 * caused by a default 1:1 container).
 */
export function getSceneAspectRatioFromManifest(scene: SceneInfo): number | null {
    const manifest = scene.gltfManifest as GltfManifestExtras | undefined
    const cameras = manifest?.extras?.geomagical?.geomagicalCameras
    if (!cameras || cameras.length === 0) return null
    const intrinsics = cameras[0]?.intrinsics
    if (!intrinsics) return null
    const [w, h] = intrinsics.imageSize ?? [
        intrinsics.cxy?.[0] != null ? intrinsics.cxy[0] * 2 : undefined,
        intrinsics.cxy?.[1] != null ? intrinsics.cxy[1] * 2 : undefined,
    ]
    return w && h ? w / h : null
}
