export interface RatingOption {
    id: number
    name: string
    kind: string
    position: number
}

export type Rating = {
    id: number
    ratingTag: number
    value: number
    note: string | null
    job: string
}
