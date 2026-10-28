import axios from 'axios'
import fetch from 'services'

const createUpload = (files) =>
    fetch(`/uploads/`, {
        method: 'POST',
        data: {
            urls: files.map((file) => ({
                path: file.name,
                content_type: file.type,
            })),
        },
    })

const confirmUpload = (uuid, files) =>
    fetch(`/uploads/${uuid}/uploadNotify/`, {
        method: 'PATCH',
        data: {
            urls: files.map((file) => ({
                path: file.name,
            })),
        },
    })

// Upload a file to GCS.
const uploadFile = (signedUrl, file) =>
    axios({
        url: signedUrl,
        method: 'PUT',
        headers: {
            'Content-Type': file.type,
        },
        data: file,
    })

const uploadFiles = (files) =>
    createUpload(files).then((resp) => {
        const uuid = resp.data.uuid
        return Promise.all(
            resp.data.urls.map((url) => {
                const file = files.find((f) => url.path === f.name)
                return uploadFile(
                    url.url,
                    files.find((f) => url.path === f.name),
                ).then(() => confirmUpload(uuid, [file]))
            }),
        ).then(() => uuid)
    })

export default uploadFiles
