import { Page } from 'constants/pages'
import React from 'react'
import { getLanguageCode, getCountryCode } from 'models/location/selectors'

export type PageMetadataProps = {
    page: Page
}

const PageMetadata: React.FunctionComponent<PageMetadataProps> = ({ page }) => {
    const country = getCountryCode()
    const language = getLanguageCode()
    return (
        <script
            type="text/javascript"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
                __html: `
                window.utag_data = window.utag_data || {}
                window.utag_data.country = ${JSON.stringify(`${country}`)}
                window.utag_data.language = ${JSON.stringify(`${language}`)}
                window.utag_data.page_name = ${JSON.stringify(`home-design>${page}`)}
                `,
            }}
        />
    )
}

export default PageMetadata
