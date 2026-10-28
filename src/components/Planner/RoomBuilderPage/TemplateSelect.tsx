import React, { useState } from 'react'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { GLTf } from 'Renderer/gltf/gltf'
import classNames from 'classnames'
import { setSelectedTemplateUuid } from 'models/planner/slice'
import { useAppDispatch, useAppSelector } from 'hooks'
import {
    getSelectedTemplateUuid,
    getTemplates,
    getIsLoadingTemplates,
    getIsLoadingAllData,
} from 'models/planner/selectors'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import { click } from 'utils/tracker'
import { RoomTemplate } from 'Planner/api_types'

require('./TemplateSelect.scss')

type TemplateButtonProps = {
    onClick: () => void
    uuid: string
    roomShape: string
    roomShapeHovered: string
    gltf: GLTf | RoomTemplate
    templateName: string
    isSelected: boolean
}

const TemplateButton = ({
    onClick,
    uuid,
    templateName,
    gltf,
    roomShape,
    roomShapeHovered,
    isSelected,
}: TemplateButtonProps) => {
    const [isHovered, setIsHovered] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const isActive = isHovered || isFocused
    const imgSrc = !isSelected && isActive ? roomShapeHovered : roomShape
    return (
        <button
            key={uuid}
            disabled={!gltf}
            className="TemplateButton"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
        >
            <img src={imgSrc} alt="" />
            <div className={classNames('templateName', { isActive, isSelected })}>{templateName}</div>
        </button>
    )
}

const TemplateSelect = () => {
    const dispatch = useAppDispatch()
    const selectedTemplateUuid = useAppSelector(getSelectedTemplateUuid)
    const templates = Object.values(useAppSelector(getTemplates))
    const isLoadingTemplates = useAppSelector(getIsLoadingTemplates)
    const isLoadingAllData = useAppSelector(getIsLoadingAllData)
    const plannerTrackingInfo = usePlannerTrackingInfo()

    const onTemplateClick = (uuid: string, templateName: string) => {
        click('RoomBuilder.TemplateChange', {
            ...plannerTrackingInfo,
            TemplateUuid: uuid,
            TemplateName: templateName,
        })
        dispatch(setSelectedTemplateUuid(uuid))
    }

    if (isLoadingTemplates && isLoadingAllData) {
        return <BouncingBallLoader />
    }
    return (
        <div className="TemplateSelect">
            <div className="templates">
                {templates.map((template) => {
                    const { uuid, data, roomShape, name: templateName } = template
                    const roomShapeSelectedSource = roomShape.replace(`.svg`, `_selected.svg`)
                    const roomShapeHoveredSource = roomShape.replace(`.svg`, `_hover.svg`)
                    const isSelected = uuid === selectedTemplateUuid
                    const roomShapeSource = isSelected ? roomShapeSelectedSource : roomShape
                    return (
                        <TemplateButton
                            key={uuid}
                            uuid={uuid}
                            gltf={data}
                            onClick={() => onTemplateClick(uuid, templateName)}
                            roomShape={roomShapeSource}
                            roomShapeHovered={roomShapeHoveredSource}
                            templateName={templateName}
                            isSelected={isSelected}
                        />
                    )
                })}
            </div>
        </div>
    )
}

export default TemplateSelect
