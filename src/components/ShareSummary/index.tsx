import React from 'react'

import { useTranslation, Trans } from 'react-i18next'
import Button from '@ingka/button'
import { Link, withPrefix } from 'gatsby'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import useSharedComposition from 'components/ShareSummary/useSharedComposition'
import { getDesignLabUrl, getSubCatalog } from 'models/location/selectors'
import { openComposition as openCompositionAction } from 'models/compositions/actions'
import './styles.scss'
import { useSugarcubeContext } from 'apps/SugarcubeContext'

interface DesignSummaryProps {
    compositionUuid: string
    openComposition: typeof openCompositionAction
}

const ShareSummary = ({ compositionUuid, openComposition }: DesignSummaryProps) => {
    const { t } = useTranslation()
    const { isLoading, error, sharedCompositionData } = useSharedComposition(compositionUuid, true)
    const { isMobile } = useSugarcubeContext()
    const subCatalog = getSubCatalog()

    const title = `${t('summary.check out')}${sharedCompositionData?.name ? ` "${sharedCompositionData.name}"` : ''}`
    const dateString =
        (sharedCompositionData?.createdAt &&
            new Date(sharedCompositionData.createdAt).toLocaleDateString(process.env.GATSBY_LOCALE, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            })) ||
        ''
    const showEditButton = !!sharedCompositionData?.enableRemix && !isMobile
    const showMobileMessageForViewOnly = isMobile && !sharedCompositionData?.enableRemix

    if (error) {
        return (
            <div className="DesignSummary">
                <div className="errorContainer">
                    <div className="headerImage">
                        <img src={withPrefix('/images/graphics/sad_bear.jpg')} alt="" />
                    </div>
                    <div className="errorHeader">{t('summary.not available')}</div>
                    <div className="errorSubheader">
                        <Trans i18nKey="summary.design does not exist">
                            Sorry, we can’t find the design you’re looking for. You’re welcome to explore some inspiring
                            showrooms{' '}
                            <Link to={`${getDesignLabUrl()}#showrooms`} className="errorLink">
                                here
                            </Link>
                            . Or you can learn more about
                            <Link to="/learnmore" className="errorLink">
                                IKEA Kreativ
                            </Link>
                            .
                        </Trans>
                    </div>
                </div>
            </div>
        )
    }
    return (
        <div className="DesignSummary">
            {isLoading ? (
                <div className="loading">
                    <BouncingBallLoader />
                </div>
            ) : (
                <>
                    <div className="header">
                        <div className="headerText">
                            <div className="title">{title}</div>
                            <div className="date">{dateString}</div>
                        </div>
                        {showEditButton && (
                            <Button
                                onClick={() => {
                                    openComposition(compositionUuid, undefined, {
                                        subCatalog: subCatalog ?? null,
                                    } as Record<string, string | null | undefined>)
                                }}
                                type="primary"
                                text={t('summary.remix')}
                                className="remixButton"
                            />
                        )}
                        {showMobileMessageForViewOnly && (
                            <div className="remixMessage" data-testid="remix-message">
                                {t('summary.use a larger screen')}
                            </div>
                        )}
                    </div>
                    {sharedCompositionData?.publicCompositionImageUrl && (
                        <div className="body">
                            <img
                                src={sharedCompositionData?.publicCompositionImageUrl}
                                alt={t('shared.alt.shared design')}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default ShareSummary
