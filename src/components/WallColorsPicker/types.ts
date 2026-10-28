export type Color = [number, number, number]

export interface WallColorGradients {
    id: string
    fromColor: number[]
    toColor: number[]
    colors: { UI_COLOR: Color; VIEWPORT_COLOR: Color; COLOR_NAME: string }[]
}
