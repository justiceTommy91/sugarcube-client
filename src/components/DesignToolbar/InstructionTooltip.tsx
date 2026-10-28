import React from 'react'

interface InstructionTooltipProps {
    visible: boolean
    content: string
}

const InstructionTooltip: React.FC<InstructionTooltipProps> = ({ visible, content }) => {
    if (!visible) return null

    return (
        <div className="SceneToolbar__instructionTooltip">
            <div className="SceneToolbar__instructionTooltip__content">{content}</div>
            <div className="SceneToolbar__instructionTooltip__arrow" />
        </div>
    )
}

export default InstructionTooltip
