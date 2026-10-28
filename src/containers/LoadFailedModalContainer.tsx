import React from 'react'
import { connect } from 'react-redux'

import LoadFailedModal from 'components/LoadFailedModal'
import { openDesignLab, reloadPage } from 'models/ui/actions'
import { workflow } from 'utils/tracker'

interface LoadFailedModalContainerProps {
    onRefresh: () => void
    onLeave: () => void
}

const LoadFailedModalContainer = ({ onLeave, onRefresh }: LoadFailedModalContainerProps) => {
    const leave = () => {
        workflow('DecorateRoom.LoadFailedLeave').then(onLeave)
    }

    const refresh = () => {
        workflow('DecorateRoom.LoadFailedRefresh').then(onRefresh)
    }

    return <LoadFailedModal onLeave={leave} onRefresh={refresh} />
}

const mapDispatchToProps = {
    onRefresh: reloadPage,
    onLeave: openDesignLab,
}

export default connect(null, mapDispatchToProps)(LoadFailedModalContainer)
