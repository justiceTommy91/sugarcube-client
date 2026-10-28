/**
 * Filter state management and measurement-specific utility functions
 */

import type { RawFilter, FilterValue } from '../types/core'
import { FILTER_TYPES, FILTER_IDS } from '../constants'

/**
 * Helper function to determine if a filter option should be disabled and if it's selected
 * An option is disabled if it has 0 count and is not currently selected
 * This is used by various filter components to determine option state
 */
export const getFilterOptionState = (item: { id: string; count?: number }, selectedIds: Set<string> | string[]) => {
    const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds)
    const selected = selectedSet.has(item.id)
    const disabled = (item.count ?? 0) === 0 && !selected
    return { selected, disabled }
}

/**
 * Finds a value and its associated type name from a filter's types array
 * @param filter - The filter containing types
 * @param id - The value ID to find
 * @returns Object with value and typeName, or null if not found
 */
export const findValueInTypes = (filter: RawFilter, id: string): { value: FilterValue; typeName: string } | null => {
    if (!filter.types) return null

    return filter.types.reduce<{ value: FilterValue; typeName: string } | null>((acc, type) => {
        if (acc) return acc
        const foundValue = type.values?.find((v) => v.id === id)
        return foundValue ? { value: foundValue, typeName: type.name } : null
    }, null)
}

/**
 * Formats a label with type name prefix for typed class filters
 * @param typeName - The type name (e.g., "Frames", "Pictures")
 * @param valueName - The value name (e.g., "4x6 \"")
 * @returns Formatted label (e.g., "Frames 4x6 \"")
 */
export const formatTypedClassLabel = (typeName: string, valueName: string): string => `${typeName} ${valueName}`

/**
 * Finds an option by ID within measurement buckets filter types
 * Supports both typed format (types array) and simple format (values array)
 * @param filter - The filter containing measurement types or values
 * @param id - The option ID to find
 * @returns The matching FilterValue or undefined
 */
export const findMeasurementOption = (filter: RawFilter, id: string) => {
    // Try typed format first
    if (filter.types) {
        return filter.types.flatMap((type) => type.values || []).find((v) => v.id === id)
    }
    // Fall back to simple format
    return filter.values?.find((v) => v.id === id)
}

/**
 * Gets all flattened options from measurement buckets filter
 * Supports both typed format (types array) and simple format (values array)
 * @param filter - The filter containing measurement types or values
 * @returns Array of all FilterValue options
 */
export const getAllMeasurementOptions = (filter: RawFilter) => {
    // Try typed format first
    if (filter.types) {
        return filter.types.flatMap((type) => type.values || [])
    }
    // Fall back to simple format
    return filter.values || []
}

/**
 * Generates filter captions based on selected values
 * Supports both standard filters (filter.values) and measurement filters (filter.types[].values)
 * @param selectedValues - Array of selected option IDs
 * @param filter - The filter containing the options
 * @returns Comma-separated string of selected option names, or undefined if none selected
 */
export const getFilterCaption = (selectedValues: string[], filter: RawFilter): string | undefined => {
    if (selectedValues.length === 0) return undefined

    const selectedNames = selectedValues.reduce<string[]>((acc, id) => {
        // First try standard filter structure
        let value = filter.values?.find((v) => v.id === id)
        let typeName: string | undefined

        // If not found, try types structure (for TYPED_CLASS_FILTER and MEASUREMENT_BUCKETS)
        if (!value) {
            const result = findValueInTypes(filter, id)
            if (result) {
                value = result.value
                typeName = result.typeName
            }
        }

        if (value?.name) {
            // For TYPED_CLASS_FILTER with REFERENCE_MEASUREMENTS ID, include the type name (e.g., "Frames 4x6 "")
            // For MEASUREMENT_BUCKETS, just use the value name (e.g., "Small (< 50cm)")
            if (
                filter.type === FILTER_TYPES.TYPED_CLASS_FILTER &&
                filter.id !== FILTER_IDS.MEASUREMENT_BUCKETS &&
                typeName
            ) {
                acc.push(formatTypedClassLabel(typeName, value.name))
            } else {
                acc.push(value.name)
            }
        }
        return acc
    }, [])

    return selectedNames.length > 0 ? selectedNames.join(', ') : undefined
}
