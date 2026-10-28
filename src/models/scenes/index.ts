import type { ManifestData } from 'Renderer/geomviewer'
import type { GLTf } from 'Renderer/gltf/gltf'
import type { RoomType, SourceType } from './constants'

export type SceneViewport = {
    id: string
    thumbnailUrl: string
}

export type APIScene = {
    adminCaptureVideoUrl: string | null
    adminUrl: string | null
    clientCapturedAt: string
    compositionCount: number
    createdAt: string
    creation: string
    gltfBaseUrl: string | null
    gltfManifest: GLTf | null
    isHidden: boolean
    isRated: boolean
    isShared: boolean
    isStock: boolean
    jobId: string
    jobState: string | null
    lastModifiedTs: string
    manifest: ManifestData | null
    name: string
    roomType: RoomType
    sceneId: number
    scenePath: string
    sourceType: SourceType
    state: string
    status: number
    thumbnails: {
        url: string
    } | null
    uuid: string
    viewports: SceneViewport[]
    wid: number
}

export type Scene = {
    adminCaptureVideoUrl: string | null
    adminUrl: string | null
    compositionCount: number
    creationDate: string
    defaultX: number
    defaultY: number
    depthUrl?: string
    gltfBaseUrl: string | null
    gltfManifest: GLTf | null
    hasFloor: boolean
    hasWall: boolean
    hasWallPaint: boolean
    isStock: boolean
    jobId: string
    jobState: string | null
    state: string
    status: number
    // value will be derived from lastModifiedTs of APIScene
    createdAt: string
    lastModifiedDate: string
    manifest: ManifestData | null
    name: string
    roomType: RoomType | null
    sceneId: string
    sourceType: SourceType
    staticStackingSurfacesCount: number
    supportsDepthOcclusion: boolean
    supportsForegroundOcclusion: boolean
    supportsOcclusion: boolean
    hasTexturedWalls?: boolean
    supportsShadows: boolean
    thumbUrl: string | null
    viewports: SceneViewport[]
    uuid?: string
    wid: number
}
