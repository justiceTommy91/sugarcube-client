import fetch from 'services'

export const getScene = (id, forceLegacyManifest) =>
    fetch(
        `/scenes/${id}`,
        {
            params: {
                manifest_mode: forceLegacyManifest ? `manifest` : `manifest,gltf_manifest`,
            },
        },
        { allowGuest: true },
    )

export const getScenes = (forceLegacyManifest, includeAllStates = false) => {
    const params = {}

    if (includeAllStates) {
        params.all = 'true'
    }

    if (!forceLegacyManifest) {
        params.manifest_mode = 'manifest,gltf_manifest'
    } else {
        params.manifest_mode = 'manifest'
    }

    return fetch(`/scenes/`, { params })
}

export const deleteScene = (id) =>
    fetch(`/scenes/${id}/`, {
        method: 'DELETE',
    })

export const createRoomBuilderScene = (name, roomType, gltf_manifest, envmap_uuid) =>
    fetch(
        '/scenes/create_room_builder/',
        {
            method: 'POST',
            data: {
                name,
                roomType,
                gltf_manifest,
                ...(envmap_uuid ? { upload: envmap_uuid } : {}),
            },
        },
        // Scene data is needed to place the items in the room builder rooms the Smarta way.
        // For non logged in users, we will be saving the room builder gltf as a scene and using the saved
        // scene to Smarta place objects. The scene is saved as an anonymous user
        // by this backend api call if no user token is passed. The 'ignoreToken' field in the settings
        // object tells the axios fetch wrapper to not pass the bearer token to the api call so that
        // room builder gltf can be saved as an anonymous user scene.
        { ignoreToken: true },
    )

export const saveRoomBuilderScene = (sceneId, name, roomType, gltf_manifest, envmap_uuid, loggedOut) =>
    fetch(
        `/scenes/${sceneId}/update_room_builder/`,
        {
            method: 'PUT',
            data: {
                name,
                roomType,
                gltf_manifest,
                ...(envmap_uuid ? { upload: envmap_uuid } : {}),
            },
        },
        // See a comment at the same place for createRoomBuilderScene request.
        { ignoreToken: loggedOut },
    )
