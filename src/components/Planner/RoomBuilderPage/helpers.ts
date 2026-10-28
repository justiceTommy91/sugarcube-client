import { convertMeterDimensionsByLocale } from 'utils/convertDimensions'

export const metersToFeetAndInches = (meters: number) => {
    const wallLengthInches = convertMeterDimensionsByLocale(meters)
    let wallLengthFeetPart = Math.floor(wallLengthInches / 12)
    let wallLengthInchesPart = Math.round(wallLengthInches % 12)
    if (wallLengthInchesPart === 12) {
        wallLengthFeetPart += 1
        wallLengthInchesPart = 0
    }
    return { wallLengthFeetPart, wallLengthInchesPart }
}
