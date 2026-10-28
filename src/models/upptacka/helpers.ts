import { ANDROID_PACKAGE_NAME, IOS_APP_STORE_ID, IOS_BUNDLE_ID } from './constants'

export const getUpptackaQRCodeUrl = (uuid: string | null) => {
    if (!uuid) {
        return ''
    }
    const baseUrl = 'https://ingka.page.link'
    const appUrl = `https://www.ikea.com/kreativ/share/${uuid}?source=upptacka`
    const playstoreReferrerUrl = encodeURIComponent(`${appUrl}&utm_source=upptacka`)
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}&referrer=${encodeURIComponent(
        `link=${playstoreReferrerUrl}`,
    )}`

    const url = new URL(baseUrl)
    url.searchParams.append('link', appUrl)
    url.searchParams.append('afl', playStoreUrl)
    url.searchParams.append('isi', IOS_APP_STORE_ID)
    url.searchParams.append('ibi', IOS_BUNDLE_ID)
    url.searchParams.append('apn', ANDROID_PACKAGE_NAME)
    url.searchParams.append('efr', '1')
    url.searchParams.append('utm_source', 'upptacka')
    return url.toString()
}

export const getUpptackaAuthToken = () => {
    const url = new URL(window.location.toString())
    return url.searchParams.get('upptackaAuthToken')
}
