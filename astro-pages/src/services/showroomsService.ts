import fetchWrapper from './index'

export interface FMFShowroom {
    id: number
    composition: string
    scene: string
    thumbnail: string
    name: string
    tags: string[]
}

export const fetchFMFShowrooms = (): Promise<FMFShowroom[]> =>
    fetchWrapper<FMFShowroom[]>('/showrooms/?tag=FMF')
