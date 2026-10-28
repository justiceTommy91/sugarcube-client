import fetchWrapper from 'services'

export const mergeGuestData = (guestToken: string) =>
    fetchWrapper<void>('/users/merge_guest/', {
        method: 'POST',
        headers: { 'X-Guest-Token': guestToken },
    })
