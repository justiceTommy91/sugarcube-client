import axios, { AxiosPromise, AxiosRequestConfig } from 'axios'
import { isProd } from 'utils/environment'

let token: string | null = null

export const isAuthenticated = () => Boolean(token)

export const authenticate = (authToken: string) => {
    token = authToken
}

const ACTIVITY_TYPE_KREATIV_DESIGN = 'KREATIV_DESIGN'

const configs = {
    customerProjects: {
        baseUrl: isProd
            ? 'https://api.ingka.ikea.com/customer-projects'
            : 'https://api.ingka.ppe.ikeadt.com/customer-projects',
        clientId: process.env.GATSBY_ENTRA_CLIENT_ID,
    },
} as const

const customerProjectsRequest = <Result>(
    path: string,
    { headers: headerOverrides, ...config }: Partial<AxiosRequestConfig> = {},
): AxiosPromise<Result> =>
    axios({
        ...config,
        url: `${configs.customerProjects.baseUrl}${path}`,
        headers: {
            Accept: 'application/json',
            'Content-type': 'application/json',
            Authorization: `Bearer ${token}`,
            // Omit `channel` until PPE CORS includes it in Access-Control-Allow-Headers (see APIM/customer-projects).
            ...(configs.customerProjects.clientId ? { 'X-Client-ID': configs.customerProjects.clientId } : {}),
            ...headerOverrides,
        },
    })

export type HomeProjectActivityPayload = {
    type: string
    id: string
    metadata: Record<string, unknown>
}

export const createHomeProjectActivity = (
    projectId: string,
    compositionUuid: string,
): ReturnType<typeof customerProjectsRequest> =>
    customerProjectsRequest(`/v1/projects/${projectId}/activities`, {
        method: 'POST',
        data: {
            type: ACTIVITY_TYPE_KREATIV_DESIGN,
            id: compositionUuid,
            metadata: {},
        } as HomeProjectActivityPayload,
    })
