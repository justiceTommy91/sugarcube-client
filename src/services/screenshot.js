import fetch from 'services'
import uploadFiles from 'services/upload'

export const createScreenshot = (uploadUuid, renderSessionId, metadata = {}) =>
    fetch(`/screenshots/`, {
        method: 'POST',
        data: {
            upload: uploadUuid,
            renderSessionId,
            metadata,
        },
    })

export const uploadScreenshot = (file, renderSessionId, metadata = {}) =>
    uploadFiles([file]).then((uuid) => createScreenshot(uuid, renderSessionId, metadata).then(() => uuid))
