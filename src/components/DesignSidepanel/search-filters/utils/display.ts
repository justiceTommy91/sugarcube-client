/**
 * UI display and formatting utility functions
 * Generates display labels for filter pills and other UI elements
 */

import type { RawFilter } from '../types/core'
import { FILTER_IDS, FILTER_TYPES } from '../constants'
import { getAllMeasurementOptions, findValueInTypes, formatTypedClassLabel } from './filters'

/**
 * Formats multiple selections into a display string
 * @param firstOptionName - Name of the first selected option
 * @param totalCount - Total number of selected options
 * @returns Formatted string like "Red + 2"
 */
const formatMultipleSelections = (firstOptionName: string, totalCount: number): string =>
    `${firstOptionName} + ${totalCount - 1}`

/**
 * Generates display labels for filter pills based on filter type and selected values.
 * Handles special formatting for different filter types including ratings, measurements, and standard filters.
 * @param filter - The filter definition
 * @param selectedValues - Array of selected value IDs
 * @returns Formatted display label for the pill
 */
export const getPillLabel = (filter: RawFilter, selectedValues: string[]): string => {
    if (!selectedValues?.length) {
        return filter.name
    }

    // Special handling for ratings filter
    if (filter.id === FILTER_IDS.RATINGS) {
        if (selectedValues.length === 1) {
            // TODO: add translation
            return `${selectedValues[0]} stars & up`
        }
        return formatMultipleSelections(`${selectedValues[0]} stars`, selectedValues.length)
    }

    // Boolean filters always show filter name
    if (filter.type === FILTER_TYPES.BOOLEAN) {
        return filter.name
    }

    // Special handling for measurement buckets
    if (filter.id === FILTER_IDS.MEASUREMENT_BUCKETS) {
        const allOptions = getAllMeasurementOptions(filter)
        const firstOptionName = allOptions.find((option) => option.id === selectedValues[0])?.name || selectedValues[0]

        if (selectedValues.length === 1) {
            return firstOptionName
        }

        return formatMultipleSelections(firstOptionName, selectedValues.length)
    }

    // Special handling for typed class filters (e.g., REFERENCE_MEASUREMENTS)
    // Excludes MEASUREMENT_BUCKETS which is handled separately above
    if (filter.type === FILTER_TYPES.TYPED_CLASS_FILTER && filter.id !== FILTER_IDS.MEASUREMENT_BUCKETS) {
        const result = findValueInTypes(filter, selectedValues[0])

        if (result) {
            const formattedLabel = formatTypedClassLabel(result.typeName, result.value.name)

            if (selectedValues.length === 1) {
                return formattedLabel
            }

            return formatMultipleSelections(formattedLabel, selectedValues.length)
        }

        // Fallback if not found in types structure
        return selectedValues[0]
    }

    // Standard filter handling
    const filterOptions = filter.values || []
    const firstOptionName = filterOptions.find((option) => option.id === selectedValues[0])?.name || selectedValues[0]

    if (selectedValues.length === 1) {
        return firstOptionName
    }

    return formatMultipleSelections(firstOptionName, selectedValues.length)
}
