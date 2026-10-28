import { PersistUserData } from 'Renderer/geomviewer/geom_types'

// From src/models/compositions/index.ts. Duplicated here because we want to keep
// dependencies between the GeomViewerApi and React UI one way.
type SavedProperties = {
    erasedSegments?: number[]
    measurements?: {
    dynamicMeasurements: boolean,
    productDimensions: boolean,
    roomDimensions: boolean,
  }
    wallPaint: Record<string, string | number>
    wallPaintInpaint: Record<string, string | number>
}

export const persistUserDataToLegacyUserData = (restoredUserData: PersistUserData): Partial<SavedProperties> => {
    // Map the API's restored user data into the saveData parameter for the old
    // Renderer interface.
    const { magicEraser, measurements, wallPaint, wallPaintInpaint } = restoredUserData;
    const erasedSegments = magicEraser?.saveData?.erasedSegments;
    return { erasedSegments, measurements, wallPaint, wallPaintInpaint };
}

export const legacyUserDataToPersistUserData = (
    legacyData: SavedProperties,
): PersistUserData => ({
    magicEraser: {
        saveData: {
            erasedSegments: legacyData.erasedSegments || [],
        },
    },
    measurements: {
        dynamicMeasurements: legacyData.measurements?.dynamicMeasurements || false,
        productDimensions: legacyData.measurements?.productDimensions || false,
        roomDimensions: legacyData.measurements?.roomDimensions || false,
    },
    wallPaint: legacyData.wallPaint,
    wallPaintInpaint: legacyData.wallPaintInpaint,
})
