/* eslint-disable i18next/no-literal-string */
import { useCallback } from 'react'
import { convertMetersToParts } from '@gatsby/utils/convertDimensions'
import { LOCALES_USING_IMPERIAL_SYSTEM } from '@gatsby/models/location/constants'
import { useSugarcubeContext } from '@providers/SugarcubeContext'

export function formatLength(meters: number, isImperial: boolean): string {
    const { wallLengthFeetPart, wallLengthInchesPart, wallLengthCm } = convertMetersToParts(meters, isImperial)
    if (isImperial) {
        const feet = wallLengthFeetPart && wallLengthFeetPart > 0 ? `${wallLengthFeetPart}' ` : ''
        const inches = wallLengthInchesPart && wallLengthInchesPart > 0 ? `${wallLengthInchesPart}"` : ''
        return `${feet}${inches}` || '0"'
    }
    return `${wallLengthCm} cm`
}

export function useFormatLength(): (meters: number) => string {
    const { market } = useSugarcubeContext()
    const isImperial = LOCALES_USING_IMPERIAL_SYSTEM.includes(market)
    return useCallback((meters: number) => formatLength(meters, isImperial), [isImperial])
}
