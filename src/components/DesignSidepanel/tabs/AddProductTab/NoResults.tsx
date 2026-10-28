import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { withPrefix } from 'gatsby'
import AriaLiveAnnouncer from 'components/accessibility/AriaLiveAnnouncer'
import { useProductSearch } from '../../search-filters/hooks/useProductSearch'

require('./NoResults.scss')

export const NoResults = (): React.ReactElement => {
    const { filters } = useProductSearch()
    const { t } = useTranslation()

    // Create announcement message that includes the helpful suggestions
    const announcementMessage = `${t('design.no matches', { searchQuery: filters.query })}. ${t(
        'design.try again',
    )} ${t('design.keep trying')}`

    return (
        <div className="NoResults">
            <AriaLiveAnnouncer
                message={announcementMessage}
                // eslint-disable-next-line i18next/no-literal-string
                politeness="polite"
                clearAfter={5000}
            />
            <img
                className="NoResults__image"
                width="165"
                height="165"
                src={withPrefix('/images/graphics/sad_bear.jpg')}
                alt={t('design.alt.no matches')}
            />

            <div className="NoResults__headline">
                <Trans i18nKey="design.no matches" searchQuery={filters.query} shouldUnescape>
                    Sorry, no matches for <strong>&quot;{{ searchQuery: filters.query }}&quot;</strong>
                </Trans>
            </div>

            <div className="NoResults__message">
                <p>{t('design.try again')}</p>

                <p>{t('design.keep trying')}</p>
            </div>
        </div>
    )
}
