export type SubCategory = {
    categoryId: string
    name: string
}

export type RoomType = {
    humanId: string
    name: string
    imageUrl: string
    categories: SubCategory[]
    categoryIds?: string
    categoryNames?: string
    uuid: string
    region: string
    createdAt: string
    lastModifiedTs: string
}

export type RoomTypesApiResponse = {
    data: RoomType[]
}

export type RoomTypesState = {
    data: {
        rooms: RoomType[]
    }
    loading: boolean
    error: string | null
}
