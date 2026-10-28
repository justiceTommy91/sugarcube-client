import { withPrefix } from 'gatsby'

// Unused code
// const colors = {
//     1: {
//         name: 'Brushed Metal',
//         hex: '#2c2c2c',
//         material: withPrefix('/testAssets/frames/textures/1/brushed-metal-dark.jpg'),
//     },
//     2: {
//         name: 'Oak',
//         hex: '#ffffff',
//         material: withPrefix('/testAssets/frames/textures/1/oak.jpg'),
//     },
//     3: {
//         name: 'Wood',
//         hex: '#81481f',
//         material: withPrefix('/testAssets/frames/textures/1/wood.jpg'),
//     },
// } as const

// const rustic = {
//     1: {
//         name: 'Rustic',
//         hex: '#8c8d62',
//         material: withPrefix('/testAssets/frames/textures/woodmoss.jpg'),
//     },
//     2: {
//         name: 'Old Wood',
//         hex: '#ada480',
//         material: withPrefix('/testAssets/frames/textures/woodold.jpg'),
//     },
//     3: {
//         name: 'Rough Wood',
//         hex: '#c6af51',
//         material: withPrefix('/testAssets/frames/textures/woodrough.jpg'),
//     },
// } as const

// const modern = {
//     1: {
//         name: 'Wood Swirl',
//         hex: '#e58328',
//         material: withPrefix('/testAssets/frames/textures/woodswirl.jpg'),
//     },
//     2: {
//         name: 'Wood Grain',
//         hex: '#cec190',
//         material: withPrefix('/testAssets/frames/textures/woodgrain.jpg'),
//     },
//     3: {
//         name: 'Marble',
//         hex: '#e2e0d3',
//         material: withPrefix('/testAssets/frames/textures/marble.jpg'),
//     },
// } as const

const productSimpleMaterials = {
    1: {
        id: 1,
        hex: '#ffffff',
        material: withPrefix('/testAssets/frames/textures/white.png'),
    },
    2: {
        id: 2,
        hex: '#8a5b1e',
        material: withPrefix('/testAssets/frames/textures/contrastGrain.jpg'),
        albedo: '#9b6622',
    },
    3: {
        id: 3,
        hex: '#222222',
        material: withPrefix('/testAssets/frames/textures/contrastGrain.jpg'),
        albedo: '#222228',
    },
} as const

export const ART_SIZES = {
    1: {
        id: 1,
    },
    2: {
        id: 2,
        height: 0.4,
    },
    3: {
        id: 3,
        height: 0.5,
    },
    4: {
        id: 4,
        height: 0.6,
    },
    999: {
        id: 999,
    },
} as const

const noMatte = {
    id: 1,
    hex: null,
    key: 'noMatte',
} as const

// const offWhiteMat = {
//     id: 2,
//     name: 'Off White',
//     hex: '#ffe2Ac',
//     key: 'offWhite',
//     sections: [
//         {
//             Extrude: true,
//             ScaleAbsolute: false,
//             scaleU: 0.25,
//             scaleV: 0.01,
//             textureName: withPrefix('/testAssets/frames/textures/paper.png'),
//             albedo: 0xffffff,
//             profile: [
//                 [0, 0],
//                 [0, 0.02],
//                 [0.005, 0.025],
//             ],
//         },
//         {
//             Extrude: true,
//             ScaleAbsolute: false,
//             scaleU: 0.25,
//             scaleV: 0.1,
//             textureName: withPrefix('/testAssets/frames/textures/paper.png'),
//             albedo: 0xffe2ac,
//             profile: [
//                 [0, 0.025],
//                 [0.04, 0.025],
//             ],
//         },
//     ],
// } as const

const productSimpleMats = {
    [noMatte.id]: noMatte,
    10: {
        id: 10,
        hex: '#ffffff',
        key: 'whiteMat',
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xffffff,
                profile: [
                    [0, 0],
                    [0, 0.01],
                    [0.0025, 0.0125],
                    [0.05, 0.0125],
                ],
            },
        ],
    },
    11: {
        id: 11,
        hex: '#FFFFFF',
        key: 'whiteBlkCore',
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0x222222,
                profile: [
                    [0, 0],
                    [0, 0.01],
                    [0.0025, 0.0125],
                ],
            },
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xffffff,
                profile: [
                    [0.0, 0.0125],
                    [0.0475, 0.0125],
                ],
            },
        ],
    },
    12: {
        id: 12,
        hex: '#AAAAAA',
        key: 'greyMat',
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xffffff,
                profile: [
                    [0, 0],
                    [0, 0.01],
                    [0.0025, 0.0125],
                ],
            },
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xaaaaaa,
                profile: [
                    [0.0, 0.0125],
                    [0.0475, 0.0125],
                ],
            },
        ],
    },
    // 13: {
    //     id: 13,
    //     name: 'Off White Mat',
    //     hex: '#FFE2AC',
    //     key: 'owMat',
    //     sections: [
    //         {
    //             Extrude: true,
    //             ScaleAbsolute: false,
    //             scaleU: 0.25,
    //             scaleV: 0.01,
    //             textureName: withPrefix('/testAssets/frames/textures/white.png'),
    //             albedo: 0xffffff,
    //             profile: [
    //                 [0, 0],
    //                 [0, 0.01],
    //                 [0.0025, 0.0125],
    //             ],
    //         },
    //         {
    //             Extrude: true,
    //             ScaleAbsolute: false,
    //             scaleU: 0.25,
    //             scaleV: 0.01,
    //             textureName: withPrefix('/testAssets/frames/textures/white.png'),
    //             albedo: 0xffe2ac,
    //             profile: [
    //                 [0.0, 0.0125],
    //                 [0.0475, 0.0125],
    //             ],
    //         },
    //     ],
    // },
} as const

const productWideMats = {
    [noMatte.id]: noMatte,
    10: {
        id: 10,
        hex: '#ffffff',
        key: 'whiteMat',
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xffffff,
                profile: [
                    [0, 0],
                    [0, 0.01],
                    [0.0025, 0.0125],
                    [0.1, 0.0125],
                ],
            },
        ],
    },
    11: {
        id: 11,
        hex: '#FFFFFF',
        key: 'whiteBlkCore',
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0x222222,
                profile: [
                    [0, 0],
                    [0, 0.01],
                    [0.0025, 0.0125],
                ],
            },
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xffffff,
                profile: [
                    [0.0, 0.0125],
                    [0.0975, 0.0125],
                ],
            },
        ],
    },
    12: {
        id: 12,
        hex: '#AAAAAA',
        key: 'greyMat',
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xffffff,
                profile: [
                    [0, 0],
                    [0, 0.01],
                    [0.0025, 0.0125],
                ],
            },
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 0.25,
                scaleV: 0.01,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xaaaaaa,
                profile: [
                    [0.0, 0.0125],
                    [0.0975, 0.0125],
                ],
            },
        ],
    },
    // 13: {
    //     id: 13,
    //     name: 'Off White Mat',
    //     hex: '#FFE2AC',
    //     key: 'owMat',
    //     sections: [
    //         {
    //             Extrude: true,
    //             ScaleAbsolute: false,
    //             scaleU: 0.25,
    //             scaleV: 0.01,
    //             textureName: withPrefix('/testAssets/frames/textures/white.png'),
    //             albedo: 0xffffff,
    //             profile: [
    //                 [0, 0],
    //                 [0, 0.01],
    //                 [0.0025, 0.0125],
    //             ],
    //         },
    //         {
    //             Extrude: true,
    //             ScaleAbsolute: false,
    //             scaleU: 0.25,
    //             scaleV: 0.01,
    //             textureName: withPrefix('/testAssets/frames/textures/white.png'),
    //             albedo: 0xffe2ac,
    //             profile: [
    //                 [0.0, 0.0125],
    //                 [0.0975, 0.0125],
    //             ],
    //         },
    //     ],
    // },
} as const

const canvasFrameMattes = {
    [noMatte.id]: noMatte,
} as const

// const newFrameMats = {
//     [noMatte.id]: noMatte,
//     [offWhiteMat.id]: offWhiteMat,
//     3: {
//         id: 3,
//         name: 'Striped Matte',
//         hex: '#ffffff',
//         key: 'stripedMatte',
//         sections: [
//             {
//                 Extrude: true,
//                 ScaleAbsolute: false,
//                 scaleU: 1.0,
//                 scaleV: 1.0,
//                 textureName: withPrefix('/testAssets/frames/textures/paper.png'),
//                 albedo: 0x222222,
//                 profile: [[0, 0], [0, 0.02], [0.005, 0.025]],
//             },
//             {
//                 Extrude: true,
//                 ScaleAbsolute: false,
//                 scaleU: 1.0,
//                 scaleV: 1.0,
//                 textureName: withPrefix('/testAssets/frames/textures/paper.png'),
//                 albedo: 0xFFDDDD,
//                 profile: [[0, 0.025], [0.02, 0.025]],
//             },
//             {
//                 Extrude: true,
//                 ScaleAbsolute: false,
//                 scaleU: 1.0,
//                 scaleV: 1.0,
//                 textureName: withPrefix('/testAssets/frames/textures/paper.png'),
//                 albedo: 0x222222,
//                 profile: [[0, 0.025], [0.005, 0.025]],
//             },
//             {
//                 Extrude: true,
//                 ScaleAbsolute: false,
//                 scaleU: 1.0,
//                 scaleV: 1.0,
//                 textureName: withPrefix('/testAssets/frames/textures/paper.png'),
//                 albedo: 0xFFDDDD,
//                 profile: [[0, 0.025], [0.02, 0.025]],
//             },
//         ],
//     },
//     4: {
//         id: 4,
//         name: 'Pattern Matte',
//         hex: '#ffffff',
//         key: 'patternMatte',
//         sections: [
//             {
//                 Extrude: true,
//                 ScaleAbsolute: false,
//                 scaleU: 0.25,
//                 scaleV: 0.01,
//                 textureName: withPrefix('/testAssets/frames/textures/paper.png'),
//                 albedo: 0xFFFFFF,
//                 profile: [[0, 0], [0, 0.02], [0.005, 0.025]],
//             },
//             {
//                 Extrude: true,
//                 ScaleAbsolute: false,
//                 scaleU: 5.0,
//                 scaleV: 1.0,
//                 textureName: withPrefix('/testAssets/frames/textures/border.png'),
//                 albedo: 0xAAE2FF,
//                 profile: [[0, 0.025], [0.06, 0.025]],
//             },
//         ],
//     },
// }

// const ornateFrameMats = {
//     [noMatte.id]: noMatte,
//     [offWhiteMat.id]: offWhiteMat,
// }

export const ART_FRAMES = {
    1: {
        id: 1,
        canvasDepth: 0.02,
        thumbUrl: withPrefix('/images/graphics/customize/frames/canvas.png'),
        mattes: canvasFrameMattes,
    },
    2: {
        id: 2,
        canvasDepth: 0.01,
        thumbUrl: withPrefix('/images/graphics/customize/frames/gallery_wide.png'),
        mattes: productSimpleMats,
        colors: productSimpleMaterials,
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 1.0,
                scaleV: 0.15,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xffffff,
                profile: [
                    [0, 0],
                    [0, 0.01905],
                    [0.028575, 0.01905],
                    [0.028575, 0.0],
                ],
            },
        ],
    },
    3: {
        id: 3,
        canvasDepth: 0.01,
        thumbUrl: withPrefix('/images/graphics/customize/frames/gallery.png'),
        mattes: productWideMats,
        colors: productSimpleMaterials,
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 1.0,
                scaleV: 0.15,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xffffff,
                profile: [
                    [0, 0],
                    [0, 0.034925],
                    [0.0195, 0.034925],
                    [0.0195, 0.0],
                ],
            },
        ],
    },
    4: {
        id: 4,
        canvasDepth: 0.007,
        matOffset: -0.003,
        thumbUrl: withPrefix('/images/graphics/customize/frames/traditional.png'),
        mattes: productSimpleMats,
        colors: productSimpleMaterials,
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 1.0,
                scaleV: 0.15,
                textureName: withPrefix('/testAssets/frames/textures/white.png'),
                albedo: 0xffffff,
                profile: [
                    [0.0, 0.0],
                    [0.0, 0.01101],
                    [0.00087, 0.01183],
                    [0.00197, 0.01241],
                    [0.00275, 0.01254],
                    [0.00363, 0.01216],
                    [0.00399, 0.01114],
                    [0.02009, 0.01114],
                    [0.02057, 0.01203],
                    [0.02171, 0.01266],
                    [0.02322, 0.01304],
                    [0.02487, 0.01343],
                    [0.02703, 0.01469],
                    [0.02899, 0.01654],
                    [0.03013, 0.01844],
                    [0.03076, 0.01895],
                    [0.03749, 0.01913],
                    [0.0381, 0.01862],
                    [0.0381, 0.0],
                ],
            },
        ],
    },
    /*
    4: {
        id: 4,
        name: 'Rustic',
        canvasDepth: 0.02,
        thumbUrl: withPrefix('/testAssets/frames/inset2.png'),
        mattes: newFrameMats,
        colors: rustic,
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 1.0,
                scaleV: 0.25,
                textureName: withPrefix('/testAssets/frames/textures/woodmoss.jpg'),
                albedo: 0xFFFFFF,
                profile: [[0, 0], [0, 0.035], [0.06, 0.035], [0.06, 0.0]],
            },
        ],
    },
    5: {
        id: 5,
        name: 'Modern',
        canvasDepth: 0.02,
        thumbUrl: withPrefix('/testAssets/frames/inset2.png'),
        mattes: newFrameMats,
        colors: modern,
        sections: [
            {
                Extrude: true,
                ScaleAbsolute: false,
                scaleU: 1.0,
                scaleV: 0.25,
                textureName: withPrefix('/testAssets/frames/textures/woodswirl.jpg'),
                albedo: 0xFFFFFF,
                profile: [[0, 0], [0, 0.04], [0.03, 0.04], [0.03, 0.0]],
            },
        ],
    }, */
    // 6: {
    //     id: 6,
    //     name: 'Ornate',
    //     canvasDepth: 0.02,
    //     thumbUrl: withPrefix('/testAssets/frames/inset2.png'),
    //     mattes: ornateFrameMats,
    //     sections: [
    //         {
    //             Extrude: true,
    //             ScaleAbsolute: false,
    //             scaleU: 5.0,
    //             scaleV: 1.0,
    //             textureName: withPrefix('/testAssets/frames/textures/ornate.png'),
    //             albedo: 0xffffff,
    //             profile: [
    //                 [0, 0.02],
    //                 [0, 0.03],
    //                 [0.02, 0.04],
    //                 [0.03, 0.04],
    //                 [0.04, 0.035],
    //                 [0.06, 0.03],
    //                 [0.07, 0.03],
    //                 [0.08, 0.035],
    //                 [0.09, 0.035],
    //                 [0.1, 0.03],
    //                 [0.11, 0.02],
    //                 [0.11, 0.0],
    //             ],
    //         },
    //     ],
    // },
} as const

export const DEFAULT_ART_OPTIONS_ID = 1
