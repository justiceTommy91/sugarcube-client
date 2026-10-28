import React from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { type MaterialDescription } from 'models/planner/index'
import { useAppDispatch, useAppSelector } from 'hooks'
import { useExperiments } from 'hooks/useExperiments'
import { userSelectColorIndex, userSelectMaterialUuid } from 'models/planner/slice'
import {
    getIsLoadingMaterials,
    getMaterials,
    getSelectedColorIndex,
    getSelectedMaterialUuid,
} from 'models/planner/selectors'
import { setSelectedWallColor } from 'models/wallColor/slice'
import { getSelectedWallColorGroupId, getSelectedWallColorIndex } from 'models/wallColor/selectors'
import { click } from 'utils/tracker'
import { useWallColorsGradients } from 'components/WallColorsPicker/constants'
import { WallColorsPicker } from 'components/WallColorsPicker'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'
import { COLORS } from './RoomBuilderPage/constants'
import Tooltip from '../Tooltip'

require('./MaterialSelect.scss')

const MaterialSelect = () => {
    const { t } = useTranslation('dashboard')
    const { variations } = useExperiments()
    const selectedMaterialUuid = useAppSelector(getSelectedMaterialUuid)
    const colorIndex = useAppSelector(getSelectedColorIndex)
    const selectedWallColorGroupId = useAppSelector(getSelectedWallColorGroupId)
    const selectedWallColorIndex = useAppSelector(getSelectedWallColorIndex)
    const materials = useAppSelector(getMaterials)
    const materialsArray = Object.values(materials)
    const isLoadingMaterials = useAppSelector(getIsLoadingMaterials)
    const plannerTrackingInfo = usePlannerTrackingInfo()

    const { plannerApi } = usePlannerApi()
    const dispatch = useAppDispatch()
    const wallColorsGradients = useWallColorsGradients()

    const isEnabledNewWallColors = variations.EnableNewWallColors === 'enabled'

    const handleApplyWallColor = (index: number) => {
        dispatch(userSelectColorIndex(index))
        click('RoomBuilder.ColorChange', {
            ...plannerTrackingInfo,
            ColorIndex: index,
        })
    }

    const legacyApplyWallColor = (index: number) => {
        handleApplyWallColor(index)
        plannerApi.setAllWallsColor(COLORS[index].VIEWPORT_COLOR)
    }

    const newApplyWallColor = (groupId: string, index: number) => {
        const group = wallColorsGradients.find((g) => g.id === groupId)
        const wallColor = group?.colors[index]?.VIEWPORT_COLOR

        if (!wallColor) return

        handleApplyWallColor(index)
        dispatch(setSelectedWallColor({ groupId, colorIndex: index }))
        plannerApi.setAllWallsColor(wallColor)
    }

    const applyMaterial = (material: MaterialDescription) => {
        dispatch(userSelectMaterialUuid(material.uuid))
        click('RoomBuilder.MaterialChange', {
            ...plannerTrackingInfo,
            MaterialUuid: material.uuid,
            MaterialName: material.name,
        })
        plannerApi.setFloorMaterialFromGltfObject(material.uuid, material.data, material.baseUrl).catch(() => {})
    }

    if (isLoadingMaterials) {
        return <BouncingBallLoader />
    }

    const selectedMaterialName = selectedMaterialUuid ? materials[selectedMaterialUuid].name : ''
    return (
        <div className={classNames('MaterialSelect', { isEnabledNewWallColors })}>
            <section className="colors">
                <h4>{t('dashboard.planner.wall color')}</h4>
                {isEnabledNewWallColors && (
                    <WallColorsPicker
                        onColorSelect={newApplyWallColor}
                        initialGroupId={selectedWallColorGroupId}
                        initialColorIndex={selectedWallColorIndex}
                    />
                )}

                {!isEnabledNewWallColors && (
                    <div className={classNames('grid')}>
                        {COLORS.map(({ UI_COLOR }, index) => (
                            <button
                                key={UI_COLOR.toString()}
                                className={classNames('color gridItem', { isSelected: index === colorIndex })}
                                onClick={() => legacyApplyWallColor(index)}
                            >
                                <div
                                    style={{ backgroundColor: `rgb(${UI_COLOR[0]}, ${UI_COLOR[1]}, ${UI_COLOR[2]})` }}
                                />
                            </button>
                        ))}
                    </div>
                )}
            </section>
            <section className="materials">
                <h4>{t('dashboard.planner.floor style')}</h4>
                <div className="selectedItem">{selectedMaterialName}</div>
                <div className="grid">
                    {materialsArray.map((material) => (
                        <Tooltip
                            describedById="MaterialSelectTooltip"
                            place="bottom"
                            title={material.name}
                            boundaryContainerID="Planner"
                        >
                            <button
                                key={material.uuid}
                                className={classNames('material gridItem', {
                                    isSelected: material.uuid === selectedMaterialUuid,
                                })}
                                onClick={() => {
                                    applyMaterial(material)
                                }}
                            >
                                <div style={{ backgroundImage: `url('${material.thumbnail}')` }} />
                            </button>
                        </Tooltip>
                    ))}
                </div>
            </section>
        </div>
    )
}

export default MaterialSelect
