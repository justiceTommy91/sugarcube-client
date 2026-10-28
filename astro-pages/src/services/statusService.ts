import fetchWrapper from './index'

export interface SupportStatus {
    outage: boolean
    messagesByLanguage: Record<string, string>
}

export const fetchSupportStatus = (): Promise<SupportStatus> =>
    fetchWrapper<SupportStatus>('/status/')
