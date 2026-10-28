import type { APIScene } from 'models/scenes'
import fetchWrapper from './index'

export const fetchScene = (sceneId: string, allowGuest?: boolean): Promise<APIScene> =>
    fetchWrapper(`/scenes/${sceneId}?manifest_mode=manifest,gltf_manifest`, {}, { allowGuest })
