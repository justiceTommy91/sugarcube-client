import type { Scene } from 'models/scenes'

export interface UseLoadScenesResult {
    isLoading: boolean
    error: boolean | null
    scenesData: Scene[]
}

export interface ImageFile extends File {
    name: string
    size: number
    type: string
}

export interface LocationState {
    imageFile?: File
    previewUrl?: string
    showUploadStep?: boolean
}

export type Product = {
    id: number
    name: string
    description: string
    thumbUrl: string
    price: string
    priceNumeral: number
    localItemNumber: string
}
