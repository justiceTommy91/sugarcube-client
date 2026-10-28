type Color = [number, number, number, number]
// Note some colors might be different across their visible swatches in the
// UI, and the actual wall color applied in the 3d view (eg. pure white).
export const COLORS = [
    // Pure white color swatch was indistinguishable against the UI’s white background.
    // We slightly darken the swatch color here to improve visibility in the UI, yet
    // keep the pure white material color.
    { UI_COLOR: [242, 241, 237, 255], VIEWPORT_COLOR: [255, 255, 255, 255] },
    { UI_COLOR: [209, 200, 187, 255], VIEWPORT_COLOR: [209, 200, 187, 255] },
    { UI_COLOR: [227, 212, 202, 255], VIEWPORT_COLOR: [227, 212, 202, 255] },
    { UI_COLOR: [169, 91, 34, 255], VIEWPORT_COLOR: [195, 151, 87, 255] },
    { UI_COLOR: [141, 85, 68, 255], VIEWPORT_COLOR: [141, 85, 68, 255] },
    { UI_COLOR: [189, 202, 205, 255], VIEWPORT_COLOR: [189, 202, 205, 255] },
    { UI_COLOR: [104, 131, 139, 255], VIEWPORT_COLOR: [125, 155, 163, 255] },
    { UI_COLOR: [145, 151, 121, 255], VIEWPORT_COLOR: [177, 184, 167, 255] },
    { UI_COLOR: [132, 131, 126, 255], VIEWPORT_COLOR: [132, 131, 126, 255] },
    { UI_COLOR: [149, 130, 119, 255], VIEWPORT_COLOR: [149, 130, 119, 255] },
    { UI_COLOR: [117, 88, 108, 255], VIEWPORT_COLOR: [117, 88, 108, 255] },
] satisfies { UI_COLOR: Color; VIEWPORT_COLOR: Color }[]
