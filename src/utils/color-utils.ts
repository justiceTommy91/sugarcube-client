/**
 * Color utility functions for calculating contrast and text colors
 */

const WHITE_COLOR = '#ffffff'
const BLACK_COLOR = '#000000'

/**
 * Caching contrast calculations for performance benefits
 * as there are a fixed amount of hex codes we get from Ingka's API
 */
const contrastCache = new Map<string, string>()

/**
 * Calculates the appropriate text color (white or black) for a given background color
 * based on the relative luminance to ensure proper contrast
 */
export const getContrastTextColor = (hexColor: string): string => {
    const cachedColor = contrastCache.get(hexColor)
    if (cachedColor !== undefined) {
        return cachedColor
    }

    // Validate hex color format and provide fallback
    const validHex = hexColor?.replace('#', '') || '000000'

    // Ensure hex is 6 characters, pad with zeros if needed
    const paddedHex = validHex.padEnd(6, '0').substring(0, 6)

    // Convert hex to RGB with error handling
    const r = parseInt(paddedHex.substring(0, 2), 16) || 0
    const g = parseInt(paddedHex.substring(2, 4), 16) || 0
    const b = parseInt(paddedHex.substring(4, 6), 16) || 0

    // Calculate relative luminance using WCAG formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Return white for dark backgrounds, black for light backgrounds
    const textColor = luminance > 0.5 ? BLACK_COLOR : WHITE_COLOR
    contrastCache.set(hexColor, textColor)
    return textColor
}