import React from 'react'
import { Link } from 'gatsby'
import { useTranslation } from 'react-i18next'
import './Breadcrumb.scss'

export interface Crumb {
    pathname?: string
    crumbLabel: string | null | undefined
    isCurrent?: boolean
}

interface BreadcrumbProps {
    crumbs: Crumb[]
}

const BreadcrumbLink: React.FC<{ crumb: Crumb }> = ({ crumb }) => {
    if (!crumb?.isCurrent && crumb.pathname) {
        return (
            <Link to={crumb.pathname} className="link">
                {crumb.crumbLabel}
            </Link>
        )
    }
    return (
        <span className="link current" aria-current="page">
            {crumb?.crumbLabel}
        </span>
    )
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ crumbs }) => {
    const { t } = useTranslation()
    return (
        <nav className="breadcrumb-container" aria-label={t('aria.breadcrumb-navigation')}>
            <div className="breadcrumb-row">
                <ol className="breadcrumb">
                    {crumbs.map((crumb, index) => (
                        <li key={crumb?.crumbLabel}>
                            <BreadcrumbLink crumb={crumb} />
                            {index < crumbs.length - 1 && (
                                <span className="separator" aria-hidden="true">
                                    {'>'}
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
            </div>
        </nav>
    )
}
