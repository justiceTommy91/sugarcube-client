import React from 'react'
import { AccordionItem } from '@ingka/accordion'
import { RawFilter } from '../../../types/core'

export type AccordionWrapperProps = {
    filter: RawFilter
    filterCaption: string | undefined
    children: React.ReactNode
}

/**
 * Shared AccordionWrapper component for modal filters
 */
export const AccordionWrapper = ({ filter, filterCaption, children }: AccordionWrapperProps) => (
    <AccordionItem
        id={filter.id}
        title={filter.name}
        caption={filterCaption}
        disabled={!filter.enabled}
        aria-describedby={`${filter.id}-description`}
    >
        {children}
    </AccordionItem>
)
