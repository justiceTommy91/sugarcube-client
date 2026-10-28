import * as ratingTypes from 'models/ratings/constants'
import fetch from 'services'

export const getRatingOptions = () =>
    fetch(`/rating/tags/`, {
        method: 'GET',
    })

export const getRatingById = (jobId) =>
    fetch(`/rating/${jobId}/`, {
        method: 'GET',
    })

export const saveRating = (data) => {
    const { kind, value, note, id, tagId, jobId } = data
    let method = 'POST'
    let url = `/rating/${jobId}`
    const rating = {
        id,
        tagId,
        value,
        note,
    }
    let options = { data: rating }
    if (
        (kind === ratingTypes.RATING && !value) ||
        (kind === ratingTypes.SEVERITY && !value) ||
        (kind === ratingTypes.NOTE && !note) ||
        (kind === ratingTypes.TAG && !value)
    ) {
        method = 'DELETE'
        url = `/rating/${jobId}/${id}/`
        options = {}
    } else if (id) {
        method = 'PUT'
    }

    return fetch(url, {
        method,
        ...options,
    })
}
