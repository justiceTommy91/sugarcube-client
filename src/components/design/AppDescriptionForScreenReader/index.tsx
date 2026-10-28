import React from 'react'
import { useTranslation } from 'react-i18next'

require('./styles.scss')

const AppDescriptionForScreenReader = () => {
    const { t } = useTranslation()
    return (
        <main role="main" className="AppDescriptionForScreenReader">
            <h1>{t('accessibility.app description')}</h1>
        </main>
    )
}

export default AppDescriptionForScreenReader
