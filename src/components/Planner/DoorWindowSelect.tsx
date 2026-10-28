import React from 'react'
import { useTranslation } from 'react-i18next'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { SurfaceClass } from 'Renderer/geomviewer/geom_types'
import { useAppSelector, useAppDispatch } from 'hooks'
import { wallElementAdded } from 'models/planner/slice'
import { getDoors, getWindows, getIsLoadingDoors, getIsLoadingWindows } from 'models/planner/selectors'
import { click } from 'utils/tracker'
import SSRIcon from '@ingka/ssr-icon'
import plusIcon from '@ingka/ssr-icon/paths/plus'
import { Asset } from 'models/planner'
import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import { usePlannerViewer } from 'Planner/ui/hooks/usePlannerViewer'
import { usePlannerTrackingInfo } from 'hooks/editor/usePlannerTrackingInfo'

require('./DoorWindowSelect.scss')

type AddAssetButtonProps = {
    asset: Asset
    onClick: () => void
}

const AssetCard = ({ asset, onClick }: AddAssetButtonProps) => (
    <div className="Asset" key={asset.uuid}>
        <button className="thumbnailWrapper" onClick={onClick}>
            <img
                className="thumbnail"
                loading="lazy"
                // NOTE: the url param ?f=u selects a smaller variant of the thumbnail suitable for display in the sidebar.
                src={`${asset.thumbnail}?f=u`}
                alt={asset.name}
            />

            <div className="thumbnailOverlay" role="presentation" aria-hidden="true">
                <div className="thumbnailOverlayIcon">
                    <SSRIcon paths={plusIcon} />
                </div>
            </div>
        </button>
        <div className="name">{asset.name}</div>
    </div>
)

type DoorWindowSelectProps = {
    viewerId: string
    showInfoToast: () => void
}

const DoorWindowSelect = ({ viewerId, showInfoToast }: DoorWindowSelectProps) => {
    const { t } = useTranslation('dashboard')
    const dispatch = useAppDispatch()
    const doors = useAppSelector(getDoors)
    const windows = useAppSelector(getWindows)
    const doorsArray = Object.values(doors)
    const windowsArray = Object.values(windows)
    const isLoadingDoors = useAppSelector(getIsLoadingDoors)
    const isLoadingWindows = useAppSelector(getIsLoadingWindows)
    const { forceSelectedWallElement } = usePlannerViewer(viewerId)
    const { plannerApi } = usePlannerApi()
    const plannerTrackingInfo = usePlannerTrackingInfo()

    if (isLoadingDoors || isLoadingWindows) {
        return <BouncingBallLoader />
    }

    const addWallElement = async (asset: Asset) => {
        const { uuid, baseUrl, data, semanticClass, name } = asset
        if (!data) {
            return
        }
        let type: SurfaceClass = `window`
        const assetSemanticClass = semanticClass[0]
        if (assetSemanticClass === 'DOOR') {
            type = `door`
        }
        try {
            const elementId = await plannerApi.addWallElement(data, baseUrl, uuid, type, viewerId)
            if (elementId) {
                forceSelectedWallElement(elementId)
            }
            dispatch(wallElementAdded({ semanticType: assetSemanticClass }))
            const trackingInfo = {
                ...plannerTrackingInfo,
                AssetUuid: uuid,
                AssetName: name,
                SemanticClass: assetSemanticClass,
            }
            click('RoomBuilder.AddWallElement', trackingInfo)
        } catch (error) {
            showInfoToast()
        }
    }

    return (
        <div className="DoorWindowSelect">
            <section className="doors">
                <h4>{t('dashboard.planner.door styles')}</h4>
                <div className="grid">
                    {doorsArray.map((door) => (
                        <AssetCard asset={door} onClick={() => addWallElement(door)} />
                    ))}
                </div>
            </section>
            <section className="windows">
                <h4>{t('dashboard.planner.window styles')}</h4>
                <div className="grid">
                    {windowsArray.map((window) => (
                        <AssetCard asset={window} onClick={() => addWallElement(window)} />
                    ))}
                </div>
            </section>
        </div>
    )
}

export default DoorWindowSelect
