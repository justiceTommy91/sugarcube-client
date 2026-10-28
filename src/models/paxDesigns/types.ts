// TODO(WEBFS-1046): update fields to match real REX API response shape
export type PAXDesign = {
    id: string
    name: string
    thumbnailUrl: string
    vpcCode: string
}

export type PAXDesignsState = {
    designs: PAXDesign[]
    loading: boolean
    error: string | null
    importLoading: boolean
}
