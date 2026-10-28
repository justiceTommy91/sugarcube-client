import fetch from 'services'
import type {
    APIComposition,
    CompositionSaveData,
    CompositionSharingData,
    SmartaPlacedFurnitureSingle,
    SmartaPlacedFurnitureMulti,
    SmartaPlacedFurnitureSet,
} from 'models/compositions'
import { getUpptackaAuthToken } from 'models/upptacka/helpers'
import { DEFAULT_GEOMETRY_TYPE } from './constants'

export const getCompositions = (forceLegacyManifest: boolean) =>
    fetch(`/compositions/`, {
        params: {
            manifest_mode: forceLegacyManifest ? `manifest` : `manifest,gltf_manifest`,
        },
    })

export const getComposition = (id: string) => fetch<APIComposition>(`/compositions/${id}/`)

export const deleteComposition = (id: string) =>
    fetch(`/compositions/${id}/`, {
        method: 'DELETE',
    })

export const createComposition = (compositionSaveData: CompositionSaveData, allowGuest = false) => {
    const headers: Record<string, string> = {}

    // Allow Upptacka to override the default auth token used for composition creation.
    const upptackaAuthToken = getUpptackaAuthToken()
    if (upptackaAuthToken) {
        headers.Authorization = `Bearer ${upptackaAuthToken}`
    }

    return fetch<APIComposition>(
        '/compositions/',
        {
            method: 'POST',
            data: compositionSaveData,
            params: {
                manifest_mode: `manifest,gltf_manifest`,
            },
            headers,
        },
        { allowGuest },
    )
}

export const saveComposition = (compositionSaveData: CompositionSaveData, allowGuest = false) =>
    fetch<APIComposition>(
        `/compositions/${compositionSaveData.compositionId}/`,
        {
            method: 'PUT',
            data: compositionSaveData,
            params: {
                manifest_mode: `manifest,gltf_manifest`,
            },
        },
        { allowGuest },
    )

export const copyComposition = (compositionId: string, name?: string) =>
    fetch<APIComposition>(`/compositions/${compositionId}/clone/`, {
        method: 'POST',
        params: {
            name,
        },
    })

export const renameComposition = (id: string, name: string) =>
    fetch(`/compositions/${id}/`, {
        method: 'PATCH',
        data: {
            name,
        },
    })

export const getCompiledComposition = (id: string, forceLegacyManifest: boolean, isDuvetV2Enabled: boolean) =>
    fetch(`/compositions/${id}/compiled/`, {
        params: {
            geometry_type: `${DEFAULT_GEOMETRY_TYPE}`,
            manifest_mode: forceLegacyManifest ? `manifest` : `manifest,gltf_manifest`,

            // Excludes combinablesDefaultProducts from furniture objects in the
            // compiled composition, and instead only includes the combinables
            // defaults at the top level of the response.
            combinables_default_products_noinline: true,
            material_mode: isDuvetV2Enabled,
        },
    })

export const getCompiledCompositionForEditor = (id: string) =>
    fetch(`/compositions/${id}/compiled/`, {
        params: {
            geometry_type: `${DEFAULT_GEOMETRY_TYPE}`,
            manifest_mode: `gltf_manifest`,
        },
    })

export const saveCompositionSharing = (
    compositionId: string,
    compositionSharingData: CompositionSharingData,
    forceLegacyManifest: boolean,
) =>
    fetch<APIComposition>(`/compositions/${compositionId}/shared/`, {
        method: 'POST',
        data: compositionSharingData,
        params: {
            manifest_mode: forceLegacyManifest ? `manifest` : `manifest,gltf_manifest`,
        },
    })

/**
 * Marks a composition to let platform know the user allows IKEA colleagues (Saljapro) to access the composition for the 'Expert Check' service
 */
export const saveCompositionExpertCheckConsent = (
    compositionId: string,
    compositionSharingData: CompositionSharingData,
    forceLegacyManifest: boolean,
) =>
    fetch<APIComposition>(`/compositions/${compositionId}/expert_check_consent/`, {
        method: 'POST',
        data: compositionSharingData,
        params: {
            manifest_mode: forceLegacyManifest ? `manifest` : `manifest,gltf_manifest`,
        },
    })

export const getSmartaRecommendedPlacement = (data: SmartaPlacedFurnitureSingle) =>
    fetch(
        `/smarta/place_single/`,
        {
            method: 'POST',
            data,
            headers: { 'Content-type': 'text/plain' },
        },
        {
            shardApi: true,
            baseUrl: data.smartaURL,
        },
    )

export type SmartaReturn = {
    error: boolean
    placementId: string
} & (
    | {
          placedFurniture: {
              x: number
              y: number
              z: number
              headingI: number
              headingJ: number
              headingK: number
              heading: number
              parentId: string
              parentAttachment: number
              uniqueId: string
              gfxAttributes: object
              furnitureId: number
              debug: object
          }
      }
    | {
          errorCode: string
          errorText: string
          debug: object
      }
)

export const getSmartaRecommendedMultiPlacement = (data: SmartaPlacedFurnitureMulti) =>
    fetch<{ data: SmartaReturn[] }>(
        '/smarta/place_multi/',
        {
            method: 'POST',
            data,
            headers: { 'Content-type': 'text/plain' },
        },
        {
            baseUrl: data.smartaURL,
        },
    )

export const getSmartaRecommendedSetPlacement = (data: SmartaPlacedFurnitureSet) =>
    fetch<{ data: SmartaReturn[] }>(
        '/smarta/place_set/',
        {
            method: 'POST',
            data,
            headers: { 'Content-type': 'text/plain' },
        },
        {
            baseUrl: data.smartaURL,
        },
    )
