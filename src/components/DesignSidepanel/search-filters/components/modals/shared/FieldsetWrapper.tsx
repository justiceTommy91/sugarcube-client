import React from 'react'
import { useTranslation } from 'react-i18next'

export type FieldsetWrapperProps = {
    filterId: string
    filterName: string
    className?: string
    children: React.ReactNode
    legendSuffix?: string
}

/**
 * Shared FieldsetWrapper component for modal filters
 */
export const FieldsetWrapper = ({
    filterId,
    filterName,
    className = 'FilterOptions',
    children,
    legendSuffix = 'options',
}: FieldsetWrapperProps) => {
    const { t } = useTranslation()

    return (
        <fieldset className={className} role="group" aria-labelledby={`${filterId}-legend`}>
            <legend id={`${filterId}-legend`} className="sr-only">
                {t('aria.legends.fieldsetFilter', { filterName, legendSuffix })}
            </legend>
            {children}
        </fieldset>
    )
}
