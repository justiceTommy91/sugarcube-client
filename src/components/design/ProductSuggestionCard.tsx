import React from 'react'

import { ChoiceItem } from '@ingka/choice'
import { IconPill } from '@ingka/pill'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'

import './ProductSuggestionCard.scss'

type SuggestionCardProps = {
    title: React.ReactElement
    caption: React.ReactElement
    condition?: boolean
    onClick: () => void
    pillLabel: string
}

export const ProductSuggestionCard: React.FC<SuggestionCardProps> = ({
    title,
    caption,
    condition = true,
    onClick,
    pillLabel = '',
}) =>
    condition ? (
        <div className="suggestionCard">
            <ChoiceItem
                id={`suggestion-card-${title}`}
                title={title}
                size="large"
                caption={
                    <div className="captionRow">
                        <div>{caption}</div>
                        <IconPill ssrIcon={arrowRight} size="small" onClick={onClick} ariaLabel={pillLabel} />
                    </div>
                }
            />
        </div>
    ) : null
