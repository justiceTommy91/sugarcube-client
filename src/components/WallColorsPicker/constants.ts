import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TranslationKeys } from 'types/i18next'
import { Color, WallColorGradients } from './types'

export const ColorGroupIds = {
    NEUTRAL: 'Neutral colors',
    WARM: 'Warm colors',
    COOL: 'Cool colors',
    BLUE_GREEN: 'Blue green colors',
}

export const getColorNameTranslationKey = (colorName: string) => `wallColors.${colorName.toLowerCase()}`

const lift = (v: number, g: number) => Math.min(255, Math.round(255 * (v / 255) ** g))

function boostViewportColor([r, g, b]: Color): Color {
    const avg = (r + g + b) / 3
    const gamma = avg < 60 ? 0.6 : avg < 100 ? 0.7 : avg < 130 ? 0.7 : null
    if (gamma === null) return [r, g, b]
    return [lift(r, gamma), lift(g, gamma), lift(b, gamma)]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const l = (max + min) / 2
    if (max === min) return [0, 0, l]
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h = 0
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
    return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): Color {
    if (s === 0) {
        const v = Math.round(l * 255)
        return [v, v, v]
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (t: number) => {
        const tn = t < 0 ? t + 1 : t > 1 ? t - 1 : t
        if (tn < 1 / 6) return p + (q - p) * 6 * tn
        if (tn < 1 / 2) return q
        if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6
        return p
    }
    return [Math.round(hue2rgb(h + 1 / 3) * 255), Math.round(hue2rgb(h) * 255), Math.round(hue2rgb(h - 1 / 3) * 255)]
}

function adjustSaturation([r, g, b]: Color, amount: number): Color {
    const [h, s, l] = rgbToHsl(r, g, b)
    return hslToRgb(h, Math.min(1, Math.max(0, s + amount)), l)
}

const BRIGHT_SATURATION_REDUCTION = -0.2

function computeViewportColor(color: Color): Color {
    const avg = (color[0] + color[1] + color[2]) / 3

    if (avg >= 130) return adjustSaturation(color, BRIGHT_SATURATION_REDUCTION)
    return boostViewportColor(color)
}

export const RAW_WALL_COLORS_GRADIENTS: WallColorGradients[] = [
    {
        id: ColorGroupIds.NEUTRAL,
        fromColor: [242, 241, 237],
        toColor: [200, 188, 164],
        colors: [
            { COLOR_NAME: 'White', UI_COLOR: [242, 241, 237], VIEWPORT_COLOR: [255, 255, 255] },
            { COLOR_NAME: 'Soft silver', UI_COLOR: [216, 219, 220], VIEWPORT_COLOR: [216, 219, 220] },
            { COLOR_NAME: 'Cloud white', UI_COLOR: [236, 235, 235], VIEWPORT_COLOR: [236, 235, 235] },
            { COLOR_NAME: 'Porcelain veil', UI_COLOR: [231, 231, 226], VIEWPORT_COLOR: [231, 231, 226] },
            { COLOR_NAME: 'Pale dune', UI_COLOR: [234, 232, 229], VIEWPORT_COLOR: [234, 232, 229] },

            { COLOR_NAME: 'Alabaster mist', UI_COLOR: [246, 246, 236], VIEWPORT_COLOR: [246, 246, 236] },
            { COLOR_NAME: 'Live fog', UI_COLOR: [215, 217, 217], VIEWPORT_COLOR: [215, 217, 217] },
            { COLOR_NAME: 'Silver mist', UI_COLOR: [178, 185, 187], VIEWPORT_COLOR: [178, 185, 187] },
            { COLOR_NAME: 'Stone haze', UI_COLOR: [182, 181, 179], VIEWPORT_COLOR: [182, 181, 179] },
            { COLOR_NAME: 'Ashen drift', UI_COLOR: [185, 181, 176], VIEWPORT_COLOR: [185, 181, 176] },

            { COLOR_NAME: 'Warm pebble', UI_COLOR: [189, 181, 172], VIEWPORT_COLOR: [189, 181, 172] },
            { COLOR_NAME: 'Soft oat', UI_COLOR: [225, 222, 206], VIEWPORT_COLOR: [225, 222, 206] },
            { COLOR_NAME: 'Cool cement', UI_COLOR: [161, 163, 162], VIEWPORT_COLOR: [161, 163, 162] },
            { COLOR_NAME: 'Urban slate', UI_COLOR: [137, 143, 147], VIEWPORT_COLOR: [137, 143, 147] },
            { COLOR_NAME: 'Weathered stone', UI_COLOR: [132, 131, 126], VIEWPORT_COLOR: [132, 131, 126] },

            { COLOR_NAME: 'Driftwood grey', UI_COLOR: [144, 137, 129], VIEWPORT_COLOR: [144, 137, 129] },
            { COLOR_NAME: 'Clay earth', UI_COLOR: [140, 126, 111], VIEWPORT_COLOR: [140, 126, 111] },
            { COLOR_NAME: 'Sandstone', UI_COLOR: [200, 188, 164], VIEWPORT_COLOR: [200, 188, 164] },
            { COLOR_NAME: 'Iron grey', UI_COLOR: [109, 112, 112], VIEWPORT_COLOR: [109, 112, 112] },
            { COLOR_NAME: 'Graphite', UI_COLOR: [62, 69, 75], VIEWPORT_COLOR: [62, 69, 75] },

            { COLOR_NAME: 'Charred ash', UI_COLOR: [86, 85, 80], VIEWPORT_COLOR: [86, 85, 80] },
            { COLOR_NAME: 'Woodland bark', UI_COLOR: [101, 94, 82], VIEWPORT_COLOR: [101, 94, 82] },
            { COLOR_NAME: 'Rustic mocha', UI_COLOR: [103, 85, 67], VIEWPORT_COLOR: [103, 85, 67] },
            { COLOR_NAME: 'Warm khaki', UI_COLOR: [188, 163, 129], VIEWPORT_COLOR: [188, 163, 129] },
            { COLOR_NAME: 'Midnight charcoal', UI_COLOR: [38, 38, 38], VIEWPORT_COLOR: [38, 38, 38] },

            { COLOR_NAME: 'Obsidian', UI_COLOR: [40, 44, 47], VIEWPORT_COLOR: [40, 44, 47] },
            { COLOR_NAME: 'Coal black', UI_COLOR: [48, 47, 45], VIEWPORT_COLOR: [48, 47, 45] },
            { COLOR_NAME: 'Espresso', UI_COLOR: [66, 56, 44], VIEWPORT_COLOR: [66, 56, 44] },
            { COLOR_NAME: 'Deep chestnut', UI_COLOR: [61, 40, 21], VIEWPORT_COLOR: [61, 40, 21] },
            { COLOR_NAME: 'Dark cocoa', UI_COLOR: [81, 54, 31], VIEWPORT_COLOR: [81, 54, 31] },
        ],
    },
    {
        id: ColorGroupIds.WARM,
        fromColor: [252, 211, 107],
        toColor: [210, 78, 83],
        colors: [
            { COLOR_NAME: 'Vanilla cream', UI_COLOR: [255, 243, 211], VIEWPORT_COLOR: [255, 243, 211] },
            { COLOR_NAME: 'Soft custard', UI_COLOR: [250, 235, 208], VIEWPORT_COLOR: [250, 235, 208] },
            { COLOR_NAME: 'Apricot cream', UI_COLOR: [248, 224, 203], VIEWPORT_COLOR: [248, 224, 203] },
            { COLOR_NAME: 'Peach whip', UI_COLOR: [250, 216, 200], VIEWPORT_COLOR: [250, 216, 200] },
            { COLOR_NAME: 'Rosewater', UI_COLOR: [248, 233, 227], VIEWPORT_COLOR: [248, 233, 227] },
            { COLOR_NAME: 'Pink frost', UI_COLOR: [246, 222, 223], VIEWPORT_COLOR: [246, 222, 223] },

            { COLOR_NAME: 'Lemon soufflé', UI_COLOR: [253, 230, 167], VIEWPORT_COLOR: [253, 230, 167] },
            { COLOR_NAME: 'Honeycomb', UI_COLOR: [244, 206, 142], VIEWPORT_COLOR: [244, 206, 142] },
            { COLOR_NAME: 'Warm sandstone', UI_COLOR: [239, 179, 131], VIEWPORT_COLOR: [239, 179, 131] },
            { COLOR_NAME: 'Coral mist', UI_COLOR: [246, 168, 133], VIEWPORT_COLOR: [246, 168, 133] },
            { COLOR_NAME: 'Blushing petal', UI_COLOR: [235, 188, 178], VIEWPORT_COLOR: [235, 188, 178] },
            { COLOR_NAME: 'Strawberry pop', UI_COLOR: [231, 161, 163], VIEWPORT_COLOR: [231, 161, 163] },

            { COLOR_NAME: 'Golden butter', UI_COLOR: [252, 211, 107], VIEWPORT_COLOR: [252, 211, 107] },
            { COLOR_NAME: 'Amber glow', UI_COLOR: [238, 177, 83], VIEWPORT_COLOR: [238, 177, 83] },
            { COLOR_NAME: 'Pumpkin spice', UI_COLOR: [230, 136, 68], VIEWPORT_COLOR: [230, 136, 68] },
            { COLOR_NAME: 'Tangerine pop', UI_COLOR: [243, 133, 88], VIEWPORT_COLOR: [243, 133, 88] },
            { COLOR_NAME: 'Dusty rose', UI_COLOR: [221, 142, 126], VIEWPORT_COLOR: [221, 142, 126] },
            { COLOR_NAME: 'Watermelon crush', UI_COLOR: [210, 78, 83], VIEWPORT_COLOR: [210, 78, 83] },

            { COLOR_NAME: 'Sunburst', UI_COLOR: [250, 193, 53], VIEWPORT_COLOR: [250, 193, 53] },
            { COLOR_NAME: 'Marigold', UI_COLOR: [235, 158, 48], VIEWPORT_COLOR: [235, 158, 48] },
            { COLOR_NAME: 'Autumn ember', UI_COLOR: [225, 110, 31], VIEWPORT_COLOR: [225, 110, 31] },
            { COLOR_NAME: 'Terra cotta', UI_COLOR: [213, 117, 78], VIEWPORT_COLOR: [213, 117, 78] },
            { COLOR_NAME: 'Canyon clay', UI_COLOR: [208, 98, 78], VIEWPORT_COLOR: [208, 98, 78] },
            { COLOR_NAME: 'Crimson blaze', UI_COLOR: [186, 0, 0], VIEWPORT_COLOR: [186, 0, 0] },

            { COLOR_NAME: 'Burnished olive', UI_COLOR: [81, 65, 21], VIEWPORT_COLOR: [81, 65, 21] },
            { COLOR_NAME: 'Toasted caramel', UI_COLOR: [100, 69, 24], VIEWPORT_COLOR: [100, 69, 24] },
            { COLOR_NAME: 'Molten copper', UI_COLOR: [144, 72, 22], VIEWPORT_COLOR: [144, 72, 22] },
            { COLOR_NAME: 'Baked clay', UI_COLOR: [156, 86, 58], VIEWPORT_COLOR: [156, 86, 58] },
            { COLOR_NAME: 'Mulberry wine', UI_COLOR: [131, 68, 64], VIEWPORT_COLOR: [131, 68, 64] },
            { COLOR_NAME: 'Black cherry', UI_COLOR: [99, 0, 0], VIEWPORT_COLOR: [99, 0, 0] },
        ],
    },
    {
        id: ColorGroupIds.COOL,
        fromColor: [206, 103, 131],
        toColor: [99, 134, 178],
        colors: [
            { COLOR_NAME: 'Soft blush', UI_COLOR: [250, 233, 240], VIEWPORT_COLOR: [250, 233, 240] },
            { COLOR_NAME: 'Pale bloom', UI_COLOR: [228, 214, 224], VIEWPORT_COLOR: [228, 214, 224] },
            { COLOR_NAME: 'Lilac veil', UI_COLOR: [216, 208, 229], VIEWPORT_COLOR: [216, 208, 229] },
            { COLOR_NAME: 'Ice lilac', UI_COLOR: [234, 235, 245], VIEWPORT_COLOR: [234, 235, 245] },
            { COLOR_NAME: 'Pale smoke', UI_COLOR: [206, 210, 226], VIEWPORT_COLOR: [206, 210, 226] },

            { COLOR_NAME: 'Mist blue', UI_COLOR: [194, 211, 223], VIEWPORT_COLOR: [194, 211, 223] },
            { COLOR_NAME: 'Pink mist', UI_COLOR: [233, 187, 199], VIEWPORT_COLOR: [233, 187, 199] },
            { COLOR_NAME: 'Mauve glow', UI_COLOR: [195, 161, 185], VIEWPORT_COLOR: [195, 161, 185] },
            { COLOR_NAME: 'Orchid tint', UI_COLOR: [178, 163, 205], VIEWPORT_COLOR: [178, 163, 205] },
            { COLOR_NAME: 'Frost blue', UI_COLOR: [202, 207, 232], VIEWPORT_COLOR: [202, 207, 232] },

            { COLOR_NAME: 'Slate grey', UI_COLOR: [161, 168, 197], VIEWPORT_COLOR: [161, 168, 197] },
            { COLOR_NAME: 'Cool lake', UI_COLOR: [135, 164, 198], VIEWPORT_COLOR: [135, 164, 198] },
            { COLOR_NAME: 'Rose pop', UI_COLOR: [206, 103, 131], VIEWPORT_COLOR: [206, 103, 131] },
            { COLOR_NAME: 'Plum dust', UI_COLOR: [150, 109, 138], VIEWPORT_COLOR: [150, 109, 138] },
            { COLOR_NAME: 'Violet edge', UI_COLOR: [133, 108, 172], VIEWPORT_COLOR: [133, 108, 172] },

            { COLOR_NAME: 'Sky fade', UI_COLOR: [154, 161, 210], VIEWPORT_COLOR: [154, 161, 210] },
            { COLOR_NAME: 'Dust blue', UI_COLOR: [98, 109, 156], VIEWPORT_COLOR: [98, 109, 156] },
            { COLOR_NAME: 'Ocean', UI_COLOR: [99, 134, 178], VIEWPORT_COLOR: [99, 134, 178] },
            { COLOR_NAME: 'Cherry rush', UI_COLOR: [188, 49, 86], VIEWPORT_COLOR: [188, 49, 86] },
            { COLOR_NAME: 'Berry dark', UI_COLOR: [96, 63, 95], VIEWPORT_COLOR: [96, 63, 95] },

            { COLOR_NAME: 'Night plum', UI_COLOR: [87, 71, 111], VIEWPORT_COLOR: [87, 71, 111] },
            { COLOR_NAME: 'Blue dusk', UI_COLOR: [109, 114, 164], VIEWPORT_COLOR: [109, 114, 164] },
            { COLOR_NAME: 'Indigo', UI_COLOR: [44, 58, 119], VIEWPORT_COLOR: [44, 58, 119] },
            { COLOR_NAME: 'Deep sea', UI_COLOR: [63, 96, 143], VIEWPORT_COLOR: [63, 96, 143] },
            { COLOR_NAME: 'Wine deep', UI_COLOR: [100, 29, 48], VIEWPORT_COLOR: [100, 29, 48] },

            { COLOR_NAME: 'Ink grape', UI_COLOR: [62, 42, 62], VIEWPORT_COLOR: [62, 42, 62] },
            { COLOR_NAME: 'Deep plum', UI_COLOR: [46, 38, 58], VIEWPORT_COLOR: [46, 38, 58] },
            { COLOR_NAME: 'Midnight', UI_COLOR: [43, 41, 79], VIEWPORT_COLOR: [43, 41, 79] },
            { COLOR_NAME: 'Deep indigo', UI_COLOR: [38, 50, 100], VIEWPORT_COLOR: [38, 50, 100] },
            { COLOR_NAME: 'Night blue', UI_COLOR: [15, 36, 65], VIEWPORT_COLOR: [15, 36, 65] },
        ],
    },
    {
        id: ColorGroupIds.BLUE_GREEN,
        fromColor: [121, 168, 191],
        toColor: [91, 118, 83],
        colors: [
            { COLOR_NAME: 'Ice blue', UI_COLOR: [203, 228, 235], VIEWPORT_COLOR: [203, 228, 235] },
            { COLOR_NAME: 'Fresh aqua', UI_COLOR: [206, 232, 236], VIEWPORT_COLOR: [206, 232, 236] },
            { COLOR_NAME: 'Mist grey', UI_COLOR: [214, 227, 225], VIEWPORT_COLOR: [214, 227, 225] },
            { COLOR_NAME: 'Light ash', UI_COLOR: [208, 209, 207], VIEWPORT_COLOR: [208, 209, 207] },
            { COLOR_NAME: 'Pale fog', UI_COLOR: [236, 238, 226], VIEWPORT_COLOR: [236, 238, 226] },

            { COLOR_NAME: 'Light sage', UI_COLOR: [215, 227, 210], VIEWPORT_COLOR: [215, 227, 210] },
            { COLOR_NAME: 'Sky tint', UI_COLOR: [166, 203, 220], VIEWPORT_COLOR: [166, 203, 220] },
            { COLOR_NAME: 'Clear teal', UI_COLOR: [140, 200, 210], VIEWPORT_COLOR: [140, 200, 210] },
            { COLOR_NAME: 'Pale surf', UI_COLOR: [187, 203, 202], VIEWPORT_COLOR: [187, 203, 202] },
            { COLOR_NAME: 'Pale stone', UI_COLOR: [163, 166, 159], VIEWPORT_COLOR: [163, 166, 159] },

            { COLOR_NAME: 'Soft sage', UI_COLOR: [187, 190, 162], VIEWPORT_COLOR: [187, 190, 162] },
            { COLOR_NAME: 'Leaf', UI_COLOR: [136, 162, 126], VIEWPORT_COLOR: [136, 162, 126] },
            { COLOR_NAME: 'Cool bay', UI_COLOR: [121, 168, 191], VIEWPORT_COLOR: [121, 168, 191] },
            { COLOR_NAME: 'Blue reef', UI_COLOR: [100, 178, 192], VIEWPORT_COLOR: [100, 178, 192] },
            { COLOR_NAME: 'Soft wave', UI_COLOR: [146, 165, 169], VIEWPORT_COLOR: [146, 165, 169] },

            { COLOR_NAME: 'Cool rock', UI_COLOR: [128, 130, 122], VIEWPORT_COLOR: [128, 130, 122] },
            { COLOR_NAME: 'Moss grey', UI_COLOR: [129, 131, 104], VIEWPORT_COLOR: [129, 131, 104] },
            { COLOR_NAME: 'Deep moss', UI_COLOR: [91, 118, 83], VIEWPORT_COLOR: [91, 118, 83] },
            { COLOR_NAME: 'Blue lake', UI_COLOR: [72, 124, 151], VIEWPORT_COLOR: [72, 124, 151] },
            { COLOR_NAME: 'Dark teal', UI_COLOR: [45, 129, 147], VIEWPORT_COLOR: [45, 129, 147] },

            { COLOR_NAME: 'Storm grey', UI_COLOR: [108, 128, 130], VIEWPORT_COLOR: [108, 128, 130] },
            { COLOR_NAME: 'Dark rock', UI_COLOR: [80, 82, 76], VIEWPORT_COLOR: [80, 82, 76] },
            { COLOR_NAME: 'Olive', UI_COLOR: [75, 78, 43], VIEWPORT_COLOR: [75, 78, 43] },
            { COLOR_NAME: 'Forest', UI_COLOR: [68, 95, 62], VIEWPORT_COLOR: [68, 95, 62] },
            { COLOR_NAME: 'Deep sea', UI_COLOR: [37, 73, 92], VIEWPORT_COLOR: [37, 73, 92] },

            { COLOR_NAME: 'Night sea', UI_COLOR: [29, 79, 90], VIEWPORT_COLOR: [29, 79, 90] },
            { COLOR_NAME: 'Deep storm', UI_COLOR: [52, 66, 68], VIEWPORT_COLOR: [52, 66, 68] },
            { COLOR_NAME: 'Coal', UI_COLOR: [53, 57, 46], VIEWPORT_COLOR: [53, 57, 46] },
            { COLOR_NAME: 'Dark olive', UI_COLOR: [46, 49, 22], VIEWPORT_COLOR: [46, 49, 22] },
            { COLOR_NAME: 'Pine', UI_COLOR: [29, 65, 38], VIEWPORT_COLOR: [29, 65, 38] },
        ],
    },
] satisfies WallColorGradients[]

export const useWallColorsGradients = (): WallColorGradients[] => {
    const { t } = useTranslation()
    return useMemo(
        () =>
            RAW_WALL_COLORS_GRADIENTS.map((group) => ({
                ...group,
                colors: group.colors.map(({ COLOR_NAME, UI_COLOR, VIEWPORT_COLOR }) => ({
                    COLOR_NAME: t(getColorNameTranslationKey(COLOR_NAME) as TranslationKeys) as unknown as string,
                    UI_COLOR,
                    VIEWPORT_COLOR: computeViewportColor(VIEWPORT_COLOR),
                })),
            })),
        [t],
    )
}
