import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { withPrefix } from 'gatsby'
import './NoSearchResults.scss'

interface NoSearchResultsProps {
    query: string
}

export const NoSearchResults = ({ query }: NoSearchResultsProps) => {
    const { t } = useTranslation()

    return (
        <div className="NoSearchResults">
            <p className="NoSearchResults__announcement" aria-live="polite" aria-atomic="true">
                {t('design.no matches', { searchQuery: query })}
            </p>

            <div className="NoSearchResults__headline">
                <Trans i18nKey="design.no matches" values={{ searchQuery: query }}>
                    Sorry, no matches for <strong>&quot;{query}&quot;</strong>
                </Trans>
            </div>
            <img
                className="NoSearchResults__image"
                width="165"
                height="165"
                src={withPrefix('/images/graphics/sad_bear.jpg')}
                alt={t('design.alt.no matches')}
            />

            <div className="NoSearchResults__message">
                <p>{t('design.try again')}</p>
                <p>{t('design.keep trying')}</p>
            </div>
        </div>
    )
}
