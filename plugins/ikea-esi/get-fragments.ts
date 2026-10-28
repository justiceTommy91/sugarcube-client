/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'
import http from 'http'
import https from 'https'

import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'

import {
    getEsiHeaderFooterPath,
    getEsiProductPath,
    thisIsSafeIPinkyPromise,
} from './utils'

// Resolve ECONNRESET issue in node 19/20 (see https://geomagical.atlassian.net/browse/WALL-3510)
axios.defaults.httpAgent = new http.Agent({ keepAlive: false })
axios.defaults.httpsAgent = new https.Agent({ keepAlive: false })

// Folder to use for caching fragments.
const CACHE_PATH = path.join(process.cwd(), '.cache', 'ikea-esi')

export const readCachedEsiFragment = (url: string) => {
    const cachePath = path.join(CACHE_PATH, path.basename(url))
    return thisIsSafeIPinkyPromise(fs.readFileSync, cachePath, { encoding: 'utf-8' })
}

// The fragment files to fetch.
const URLS = [
    getEsiHeaderFooterPath(`header-collapsed-fragment-recursive.html`),
    getEsiHeaderFooterPath(`footer-fragment-recursive.html`),
    getEsiHeaderFooterPath(`style-fragment-recursive.html`),
    getEsiHeaderFooterPath(`script-fragment-recursive.html`),
    getEsiProductPath(`price-package-styles.html`),
    getEsiProductPath(`price-package-scripts.html`),
]

export const processEsiUrl = (url: string, requestPath: boolean): string => {
    const searchParams = new URLSearchParams(new URL(url).searchParams)
    if (requestPath) {
        searchParams.set('request-path', '$(REQUEST_PATH)')
    }
    searchParams.set('ikexp_override', 'berlioz')
    // NOTE: Akamai's ESI implementation requires that variables like '$(REQUEST_PATH)' NOT be URL-escaped,
    //       but we also want to ensure that other URL params are correctly set via URL.prototype.searchParams.
    //       To work around this issue, we simply URL decode the resulting url since only '$(REQUEST_PATH)' is
    //       incorrectly URL-encoded. In the future, if we have spaces or other invalid URL characters that need to
    //       be encoded this solution won't work since it'll unescape those invalid characters, but this solves the
    //       problem for now.
    return `${url}?${decodeURIComponent(searchParams.toString())}`
}

async function get(pageUrl: string) {
    const opts: AxiosRequestConfig = {}
    if (process.env.X_IKEA_M2 !== undefined) {
        opts.headers = { 'X-IKEA-M2': process.env.X_IKEA_M2 }
    }
    const resp = await axios.get(pageUrl, opts)
    return resp.data as string
}

async function expandHIncludes(data: string): Promise<string> {
    const match = data.match(/<h-include(?:-lazy)? src="([^"]+)"><\/h-include(?:-lazy)?>/)
    // No includes, we're good to go.
    if (match === null) {
        return data
    }
    console.log(`Resolving h-include of ${match[1]}`)
    const rawData = await get(match[1])
    const newData = data.replace(match[0], rawData || '')
    const expandedData = await expandHIncludes(newData)
    return expandedData
}

async function getFragment(fragUrl: string) {
    const processedUrl = processEsiUrl(fragUrl, false)
    console.log(`Fetching ESI fragment from ${processedUrl}`)
    const data = await get(processedUrl)
    const fragmentData = await expandHIncludes(data)
    return fragmentData
}

export const cacheEsiFragments = async () => {
    for (const url of URLS) {
        const cachePath = path.join(CACHE_PATH, path.basename(url))
        // console.log(`Caching ${url} to ${cachePath}`)
        fs.mkdirSync(path.dirname(cachePath), { recursive: true })
        const content = await getFragment(url)
        fs.writeFileSync(cachePath, content)
    }
}
