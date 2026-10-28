/* eslint-disable i18next/no-literal-string */
import React from 'react'
import { graphql, HeadFC } from 'gatsby'

import PageMetadata from 'components/PageMetadata'
import PageContainer from 'containers/PageContainer'
import SearchBrowseContainer from 'containers/searchBrowse'
import RenderProvider from 'apps/RendererProvider'

export const SearchBrowsePage = () => (
    <div>
        <PageContainer page="SearchBrowse">
            <div id="SearchBrowsePage">
                <RenderProvider>
                    <SearchBrowseContainer />
                </RenderProvider>
            </div>
        </PageContainer>
    </div>
)

export const Head: HeadFC = () => <PageMetadata page="SearchBrowse" />

export const query = graphql`
    query ($language: String!) {
        locales: allLocale(filter: { language: { eq: $language } }) {
            edges {
                node {
                    ns
                    data
                    language
                }
            }
        }
    }
`

export default SearchBrowsePage
