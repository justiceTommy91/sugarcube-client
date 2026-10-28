import qs from 'qs'
import { isClient } from './environment'

export const getWindow = (): Partial<typeof window> => (isClient ? window : {})

export const getSearch = (): string => getWindow().location?.search?.slice(1) || ''

export const getPathname = (): string => getWindow().location?.pathname?.slice(1) || ''

export const getHash = (): string => getWindow().location?.hash?.replace('#', '') || ''

export const getHostname = (): string => getWindow().location?.hostname || ''

export const getOrigin = (): string => getWindow().location?.origin || ''

export const getHref = (): string => getWindow().location?.href || ''

export const getUrlParams = (): Record<string, unknown> => qs.parse(getSearch(), { ignoreQueryPrefix: true })
