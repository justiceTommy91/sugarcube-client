import React from 'react'
import Button from '@ingka/button'
import { Typography } from '@ingka/typography-shared'
import classNames from 'classnames'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import {
    ACTION_STARTER_SET_SELECT,
    GA_ACTION_STARTER_SET_SELECT,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { useAppDispatch } from 'hooks'
import { setSelectedStarterSetData } from 'models/starterSet/actions'
import { StarterSetByRoomType } from 'models/starterSet/types'

type StarterSetThumbnailButtonProps = {
    selectedRoomType: string
    isLoading: boolean
    selectedRoomCategory: keyof StarterSetByRoomType
    thumbnailUrl: string
    roomName: string
    roomInternalName: string
    buttonRef: (el: HTMLButtonElement) => void
    handleRoomTypeKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => void
    setSelectedRoomType: React.Dispatch<React.SetStateAction<string>>
    setRoomTypeCurrentIndex: React.Dispatch<React.SetStateAction<number>>
    index: number
}

const StarterSetThumbnailButton = ({
    selectedRoomType,
    isLoading,
    selectedRoomCategory,
    thumbnailUrl,
    roomName,
    roomInternalName,
    buttonRef,
    handleRoomTypeKeyDown,
    setSelectedRoomType,
    setRoomTypeCurrentIndex,
    index,
}: StarterSetThumbnailButtonProps) => {
    const dispatch = useAppDispatch()
    return (
        <Button
            ref={buttonRef}
            className={classNames('StarterSetSidebar__content-wrapper', {
                'StarterSetSidebar__content-wrapper--selected': selectedRoomType === roomInternalName,
                'StarterSetSidebar__content-wrapper--isLoading': selectedRoomType !== roomInternalName && isLoading,
            })}
            data-testid={`starter-set-thumbnailButton-${roomInternalName}`}
            disabled={isLoading}
            tabIndex={0}
            type="primary"
            onFocus={() => setRoomTypeCurrentIndex(index)}
            onKeyDown={(e) => handleRoomTypeKeyDown(e, index)}
            onClick={() => {
                if (selectedRoomType === roomInternalName) {
                    return
                }
                setRoomTypeCurrentIndex(index)
                setSelectedRoomType(roomInternalName)
                dispatch(setSelectedStarterSetData(roomInternalName, selectedRoomCategory))
                click(ACTION_STARTER_SET_SELECT, {
                    SetRoomName: roomInternalName,
                    SetName: selectedRoomCategory,
                })
                trackGoogleAnalytics({
                    category: GA_CATEGORY_DYH_SUGARCUBE,
                    action: GA_ACTION_STARTER_SET_SELECT,
                    label: '',
                })
            }}
        >
            {isLoading && selectedRoomType === roomInternalName && <BouncingBallLoader className="bouncing-ball" />}
            <div className="StarterSetSidebar__image-wrapper">
                <img
                    src={thumbnailUrl}
                    alt=""
                    className={classNames('StarterSetSidebar__image', {
                        loading: isLoading && selectedRoomType !== roomInternalName,
                    })}
                />
            </div>
            <div className="StarterSetSidebar__room-name">
                <p className={Typography.Body.S}>{roomName}</p>
            </div>
        </Button>
    )
}

export default StarterSetThumbnailButton
