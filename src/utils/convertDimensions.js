import { LOCALE_US_EN, LOCALES_USING_IMPERIAL_SYSTEM } from 'models/location/constants'

const convertIntoM = (inches) => {
    const meters = inches / 39.3701
    return meters
}

const convertCmtoM = (centimeters) => {
    const meters = centimeters / 100
    return meters
}

const convertMtoIn = (meters, round) => {
    const inches = 39.3701 * meters

    return round ? Math.round(inches * 8) / 8 : inches
}

const convertMtoCm = (dimensionMeters, round) => {
    const centimeters = dimensionMeters * 100

    return round ? Math.round(centimeters) : centimeters
}

const convertInToCm = (inches, round) => {
    const centimeters = inches * 2.54
    return round ? Math.round(centimeters * 100) / 100 : centimeters
}

export const convertMeterDimensionsByLocale = (dimensionMeters, locale = LOCALE_US_EN, round = true) =>
    LOCALES_USING_IMPERIAL_SYSTEM.includes(locale)
        ? convertMtoIn(dimensionMeters, round)
        : convertMtoCm(dimensionMeters, round)

export const convertDimensionsToMeterByLocale = (dimension, locale = LOCALE_US_EN) =>
    LOCALES_USING_IMPERIAL_SYSTEM.includes(locale) ? convertIntoM(dimension) : convertCmtoM(dimension)

export const convertDimensionsToCentimeterByLocale = (dimension, locale = LOCALE_US_EN, round = true) =>
    LOCALES_USING_IMPERIAL_SYSTEM.includes(locale) ? `${dimension}"` : `${convertInToCm(dimension, round)} cm`

export const convertMetersToPartsByLocale = (meters, locale) => {
    const wallLengthInchesOrCm = convertMeterDimensionsByLocale(meters, locale)
    let wallLengthFeetPart
    let wallLengthInchesPart
    let wallLengthCm
    if (LOCALES_USING_IMPERIAL_SYSTEM.includes(locale)) {
        wallLengthFeetPart = Math.floor(wallLengthInchesOrCm / 12)
        wallLengthInchesPart = Math.round(wallLengthInchesOrCm % 12)
        if (wallLengthInchesPart === 12) {
            wallLengthFeetPart += 1
            wallLengthInchesPart = 0
        }
    } else {
        wallLengthCm = wallLengthInchesOrCm
    }

    return { wallLengthFeetPart, wallLengthInchesPart, wallLengthCm }
}

/*
 * Converts meters to either imperial (feet, inches) or metric (centimeters) parts.
 * @param {number} meters
 * @param {boolean} isImperial
 * @returns {object} An object with:
 *   - wallLengthFeetPart {number|null} Feet part (only for imperial, otherwise null)
 *   - wallLengthInchesPart {number|null} Inches part (only for imperial, otherwise null)
 *   - wallLengthCm {number|null} Centimeters (only for metric, otherwise null)
 */
export const convertMetersToParts = (meters, isImperial) => {
    if (typeof meters !== 'number' || meters < 0) {
        throw new Error('meters must be a non-negative number')
    }
    if (isImperial) {
        const inches = convertMtoIn(meters, true)
        const feet = Math.floor(inches / 12)
        const remainingInches = Math.round(inches % 12)

        // Handle rounding edge case
        if (remainingInches >= 12) {
            return {
                wallLengthFeetPart: feet + 1,
                wallLengthInchesPart: 0,
                wallLengthCm: null,
            }
        }

        return {
            wallLengthFeetPart: feet,
            wallLengthInchesPart: remainingInches,
            wallLengthCm: null,
        }
    }
    return {
        wallLengthFeetPart: null,
        wallLengthInchesPart: null,
        wallLengthCm: convertMtoCm(meters, true),
    }
}
