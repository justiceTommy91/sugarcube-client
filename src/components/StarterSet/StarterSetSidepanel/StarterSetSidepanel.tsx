import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import { Typography } from '@ingka/typography-shared'
import { useAppDispatch, useAppSelector } from 'hooks'
import { getSelectedSceneRoomType, isRenderItemsLoading } from 'models/compositions/selectors'
import {
    getLoadingStarterSetId,
    getStarterSetAllRoomsData,
    getStarterSetRoomCategories,
} from 'models/starterSet/selectors'
import { StarterSetByRoomType, StarterSetPayload } from 'models/starterSet/types'
import { setStarterSetSidebarVisible } from 'models/ui/actions'
import { click, trackGoogleAnalytics } from 'utils/tracker'
import { withPrefix } from 'gatsby'
import {
    ACTION_STARTER_SET_CHANGE_ROOM_TYPE,
    ACTION_STARTER_SET_CUSTOMIZE,
    GA_ACTION_STARTER_SET_CHANGE_ROOM_TYPE,
    GA_ACTION_STARTER_SET_CUSTOMIZE,
    GA_CATEGORY_DYH_SUGARCUBE,
} from 'models/tracking/constants'
import Pill from '@ingka/pill'
import { getStarterSetSidebarVisible } from 'models/ui/selectors'
import { isLoadingBySetId } from 'models/furniture/selectors'
import StarterSetThumbnailButton from './StarterSetThumbnailButton'

require('./StarterSetSidepanel.scss')

// When we get the room categories from the api , they will look like
// DINING_ROOM, BEDROOM etc, either with a underscore or not
// To render these in a more human readable format we check if the string have a underscore or not
// If no  underscore is present we capitalize the first character and make the rest lowercase
// If underscore is present we split it by the underscore, and apply the same logic as above
const formatRoomLabel = (key: string): string => {
    if (!key.includes('_')) {
        return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
    }
    return key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
}

const StarterSetSidePanel = () => {
    const [pillCurrentIndex, setPillCurrentIndex] = useState(0)
    const [roomTypeCurrentIndex, setRoomTypeCurrentIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const pillRef = useRef<(HTMLButtonElement | null)[]>([])
    const roomTypeButtonRef = useRef<(HTMLButtonElement | null)[]>([])
    const userSelectedCategoryRef = useRef(false)
    const { t } = useTranslation()

    const [selectedRoomCategory, setSelectedRoomCategory] = useState<keyof StarterSetByRoomType>('BEDROOM')
    const [selectedRoomType, setSelectedRoomType] = useState(t('design.starterSet.sidepanel none room type'))

    const noneRoomTypeImage = withPrefix(`/images/starterSet/noneRoomTypePlaceholder.webp`)
    const dispatch = useAppDispatch()

    const {
        allRoomData,
        roomCategories,
        renderItemsLoading,
        isStarterSetSidebarVisible,
        isFurnitureLoading,
        sceneRoomType,
        loadingSetId,
    } = useAppSelector((appState) => ({
        allRoomData: getStarterSetAllRoomsData(appState),
        roomCategories: getStarterSetRoomCategories(appState),
        renderItemsLoading: isRenderItemsLoading(appState),
        isStarterSetSidebarVisible: getStarterSetSidebarVisible(appState),
        isFurnitureLoading: isLoadingBySetId(appState),
        sceneRoomType: getSelectedSceneRoomType(appState),
        loadingSetId: getLoadingStarterSetId(appState),
    }))

    useEffect(() => {
        if (userSelectedCategoryRef.current || roomCategories.length === 0) return
        const match = sceneRoomType && sceneRoomType !== 'NONE' ? sceneRoomType : undefined
        if (match && roomCategories.includes(match as keyof StarterSetByRoomType)) {
            setSelectedRoomCategory(match as keyof StarterSetByRoomType)
        } else if (!roomCategories.includes(selectedRoomCategory)) {
            setSelectedRoomCategory(roomCategories[0])
        }
    }, [roomCategories, sceneRoomType, selectedRoomCategory])

    const isThumbnailLoading = (setUuid?: string) =>                                                                                                                                                    
        isFurnitureLoading || renderItemsLoading || (setUuid !== undefined && loadingSetId === setUuid)     

    const handleKeyboardNavigation = (
        e: React.KeyboardEvent<HTMLButtonElement>,
        setIndex: React.Dispatch<React.SetStateAction<number>>,
        length: number,
    ) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            setIndex((prev) => Math.min(prev + 1, length - 1))
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setIndex((prev) => Math.max(prev - 1, 0))
        }
    }

    const handlePillKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        handleKeyboardNavigation(e, setPillCurrentIndex, roomCategories.length)
    }

    const handleRoomTypeKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const roomTypesLength = allRoomData[selectedRoomCategory as keyof StarterSetByRoomType]?.length
        if (roomTypesLength) {
            // Doing +1 to include the NONE button since its not part of the api
            const totalButtons = roomTypesLength + 1

            if (e.key === ' ' || e.key === 'Enter') {
                setRoomTypeCurrentIndex(index)
            } else {
                handleKeyboardNavigation(e, setRoomTypeCurrentIndex, totalButtons)
            }
        }
    }

    useEffect(() => {
        pillRef.current[pillCurrentIndex]?.focus()
    }, [pillCurrentIndex])

    useEffect(() => {
        // Focus when index changes
        roomTypeButtonRef.current[roomTypeCurrentIndex]?.focus()
    }, [roomTypeCurrentIndex])

    useEffect(() => {
        if (!renderItemsLoading || !isFurnitureLoading) {
            // Re-focus after loading completes
            // Once loading the other cards that werent clicked gets disabled
            // Once loading is done and disable is false, we need to refocus
            roomTypeButtonRef.current[roomTypeCurrentIndex]?.focus()
        }
    }, [renderItemsLoading, isFurnitureLoading])

    useEffect(() => {
        // Set focus on the first pill when StarterSet is rendered
        if (isStarterSetSidebarVisible) {
            pillRef.current[0]?.focus()
        }
    }, [isStarterSetSidebarVisible])

    return (
        <div className="StarterSetSidebar" ref={containerRef}>
            <div className="StarterSetSidebar__content">
                <h2 className={Typography.Heading.L}>{t('design.starterSet.sidepanel title')}</h2>
                <p className={Typography.Body.L}>{t('design.starterSet.sidepanel body')}</p>
                <div className="StarterSetSidebar__pill-wrapper">
                    {roomCategories.map((option: keyof StarterSetByRoomType, index: number) => (
                        <Pill
                            key={option}
                            ref={(el) => (pillRef.current[index] = el)}
                            data-testid={`starter-set-pill-${option}`}
                            label={formatRoomLabel(option)}
                            size="small"
                            className="StarterSetSidebar__pill"
                            selected={selectedRoomCategory === option}
                            onKeyDown={handlePillKeyDown}
                            onFocus={() => setPillCurrentIndex(index)}
                            onClick={() => {
                                userSelectedCategoryRef.current = true
                                setSelectedRoomCategory(option)
                                click(ACTION_STARTER_SET_CHANGE_ROOM_TYPE, { RoomType: option })
                                trackGoogleAnalytics({
                                    category: GA_CATEGORY_DYH_SUGARCUBE,
                                    action: GA_ACTION_STARTER_SET_CHANGE_ROOM_TYPE,
                                    label: '',
                                })
                            }}
                        />
                    ))}
                </div>
                <div className="StarterSetSidebar__grid" tabIndex={-1}>
                    {Object.keys(allRoomData).length > 0 &&
                        Object.entries(allRoomData as Record<string, StarterSetPayload[]>)
                            .filter(([roomKey]) => !selectedRoomCategory || roomKey === selectedRoomCategory)
                            .map(([categoryKey, roomArray]) => (
                                <div key={categoryKey} className="StarterSetSidebar__section">
                                    <StarterSetThumbnailButton
                                        buttonRef={(el: HTMLButtonElement) => (roomTypeButtonRef.current[0] = el)}
                                        selectedRoomType={selectedRoomType}
                                        isLoading={isFurnitureLoading || renderItemsLoading}
                                        selectedRoomCategory={selectedRoomCategory}
                                        thumbnailUrl={noneRoomTypeImage}
                                        roomInternalName={t('design.starterSet.sidepanel none room type')}
                                        roomName={t('design.starterSet.sidepanel none room type')}
                                        handleRoomTypeKeyDown={handleRoomTypeKeyDown}
                                        setSelectedRoomType={setSelectedRoomType}
                                        setRoomTypeCurrentIndex={setRoomTypeCurrentIndex}
                                        index={0}
                                    />
                                    {roomArray.map((room, index) => (
                                        <StarterSetThumbnailButton
                                            buttonRef={(el: HTMLButtonElement) =>
                                                (roomTypeButtonRef.current[index + 1] = el)
                                            }
                                            key={room.internalName}
                                            selectedRoomType={selectedRoomType}
                                            isLoading={
                                                isThumbnailLoading(room.uuid)
                                            }
                                            selectedRoomCategory={selectedRoomCategory}
                                            thumbnailUrl={room.thumbnailUrl}
                                            roomInternalName={room.internalName}
                                            roomName={room.name}
                                            handleRoomTypeKeyDown={handleRoomTypeKeyDown}
                                            setSelectedRoomType={setSelectedRoomType}
                                            setRoomTypeCurrentIndex={setRoomTypeCurrentIndex}
                                            index={index + 1}
                                        />
                                    ))}
                                </div>
                            ))}
                </div>
            </div>
            <div className="StarterSetSidebar__continue-selection-wrapper">
                <Button
                    type="primary"
                    size="medium"
                    className="StarterSetSidebar__continue-button"
                    data-testid="starter-set-sidebar-continue-button"
                    fluid
                    onClick={() => {
                        dispatch(setStarterSetSidebarVisible(false))
                        trackGoogleAnalytics({
                            category: GA_CATEGORY_DYH_SUGARCUBE,
                            action: GA_ACTION_STARTER_SET_CUSTOMIZE,
                            label: '',
                        })
                        click(ACTION_STARTER_SET_CUSTOMIZE, {
                            SetRoomName: selectedRoomCategory,
                            SetRoomType: selectedRoomType,
                        })
                    }}
                >
                    {t('design.starterSet.sidepanel continue to decorate')}
                </Button>
            </div>
        </div>
    )
}

export default StarterSetSidePanel
