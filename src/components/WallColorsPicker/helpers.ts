import type { WallColorGradients } from 'components/WallColorsPicker/types'

export const rgbToHex = (r: number, g: number, b: number): string =>
    `#${[r, g, b].map((ch) => ch.toString(16).padStart(2, '0')).join('')}`

export const getWallColorHex = (
    gradients: WallColorGradients[],
    groupId: string,
    colorIndex: number,
): string | null => {
    const group = gradients.find((g) => g.id === groupId)
    const color = group?.colors[colorIndex]
    if (!color) return null

    const [r, g, b] = color.VIEWPORT_COLOR
    return rgbToHex(r, g, b)
}
