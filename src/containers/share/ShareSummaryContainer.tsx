import React from 'react'
import { connect } from 'react-redux'
import { openComposition as openCompositionAction } from 'models/compositions/actions'
import ShareSummary from 'components/ShareSummary'

type ShareSummaryContainerProps = {
    compositionUuid: string
    openComposition: typeof openCompositionAction
}

const ShareSummaryContainer: React.FunctionComponent<ShareSummaryContainerProps> = ({
    openComposition,
    compositionUuid,
}) => <ShareSummary compositionUuid={compositionUuid} openComposition={openComposition} />

const mapDispatchToProps = {
    openComposition: openCompositionAction,
}

export default connect(null, mapDispatchToProps)(ShareSummaryContainer)
