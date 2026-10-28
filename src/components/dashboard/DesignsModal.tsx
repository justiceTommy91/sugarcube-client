import Button from '@ingka/button'
import { ModalHeader, Theatre } from '@ingka/modal'
import SSRIcon from '@ingka/ssr-icon'
import { CompositionDataItem, DashboardRoom } from 'models/compositions'
import React, { useState, useRef, useEffect } from 'react'
import createNew from '@ingka/ssr-icon/paths/create-new'
import { useTranslation } from 'react-i18next'

import { renameComposition as renameCompositionAction } from 'models/compositions/actions'
import { DeletedType } from 'services/toasts'
import { useAppDispatch, useAppSelector } from 'hooks'

import { setDelete } from 'models/ui/actions'
import { getSortedCompositionsGroupedByScene } from 'models/compositions/selectors'
import { getSelectedSceneId } from 'models/scenes/selectors'
import { buildRoomUrlWithParamsAndHash } from 'models/compositions/utils'

import { TRACK_LOCATION_DASHBOARD } from 'models/tracking/constants'
import { TRACK_RENAME_COMPOSITION } from 'models/compositions/constants'
import { AccessibleModal } from 'components/AccessibleModal'
import CompositionThumbnail from './CompositionThumbnail'

import DeleteConfirmationModal from './DeleteConfirmationModal'
import './DesignsModal.scss'

interface Props {
    isDesignsModalOpen: boolean
    setDesignsModalOpen: (show: boolean) => void
    openRoom: (room: DashboardRoom) => void
    onCopyComposition: (compositionId: string, compositionName: string, compositionData: CompositionDataItem) => void
}

const DesignsModal = ({ isDesignsModalOpen, setDesignsModalOpen, openRoom, onCopyComposition }: Props) => {
    const { t } = useTranslation(['translation', 'dashboard'])
    const [deletedCompositionId, setDeletedCompositionId] = useState<string | null>(null)
    const [deleteRestoreFocusTo, setDeleteRestoreFocusTo] = useState<HTMLElement | null>(null)
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false)

    // Refs for focus management
    const newDesignButtonRef = useRef<HTMLButtonElement>(null)
    const thumbnailRefs = useRef<Map<string, HTMLElement>>(new Map())

    const dispatch = useAppDispatch()
    const groupedCompositions = useAppSelector(getSortedCompositionsGroupedByScene)
    const selectedSceneId = useAppSelector(getSelectedSceneId)

    const renameComposition = (compositionId: string, newName: string) =>
        dispatch(
            renameCompositionAction({
                id: compositionId,
                name: newName,
                trackingInfo: { SaveType: TRACK_RENAME_COMPOSITION, SavedFrom: TRACK_LOCATION_DASHBOARD },
            }),
        )

    const group = groupedCompositions.find((g) => g.sceneId === selectedSceneId)
    const compositions = group?.compositions || []

    // Handle focus after deletion completes
    useEffect(() => {
        // Only manage focus if we just deleted something and the delete modal is now closed
        if (deletedCompositionId && !isDeleteModalVisible && isDesignsModalOpen && compositions.length > 0) {
            // Focus the first available thumbnail or the new design button
            const foundThumbnail = compositions.some((comp) => {
                const thumbnailElement = thumbnailRefs.current.get(comp.id)
                if (thumbnailElement) {
                    thumbnailElement.focus({ preventScroll: true })
                    return true
                }
                return false
            })

            if (!foundThumbnail && newDesignButtonRef.current) {
                newDesignButtonRef.current.focus({ preventScroll: true })
            }

            // Clear the deleted ID
            setDeletedCompositionId(null)
        }
    }, [isDeleteModalVisible, deletedCompositionId, isDesignsModalOpen, compositions])

    if (!group) {
        return null
    }

    const closeDesignsModal = () => {
        setDesignsModalOpen(false)
    }

    const setDeleteType = (composition: CompositionDataItem) => {
        dispatch(setDelete(composition.id, DeletedType.SINGLE_COMPOSITION, undefined))
        setDeletedCompositionId(composition.id)
    }

    return (
        <>
            <AccessibleModal
                className="DesignsModal"
                isOpen={isDesignsModalOpen}
                onClose={closeDesignsModal}
                ariaLabel={t('dashboard:dashboard.select a design')}
                wrapContent={false}
            >
                <Theatre header={<ModalHeader />}>
                    <div className="modalContainer">
                        <div className="modalHeader">
                            <h1>{t('dashboard:dashboard.select a design')}</h1>
                            <div>
                                <Button
                                    ref={newDesignButtonRef}
                                    className="newDesignButton"
                                    onClick={() =>
                                        openRoom({
                                            sceneName: group.name,
                                            sceneId: group.sceneId,
                                            roomSource: group.roomSource,
                                            roomViewType: group.roomViewType,
                                        })
                                    }
                                >
                                    <SSRIcon className="newDesignIcon" paths={createNew} />
                                    {t('dashboard:dashboard.create a new design')}
                                </Button>
                            </div>
                        </div>
                        <div className="modalContent">
                            {compositions.map((compositionData: CompositionDataItem, index: number) => {
                                // Ensure that we give each untitled design a unique number to help users identify them.
                                const designNumber = compositions.length - index
                                const displayName =
                                    compositionData.name.trim() ||
                                    `${t('translation:design.default composition name')} ${designNumber.toFixed(0)}`
                                // lastModifiedDate is a new value we are storing from the platform API response
                                // for users who have cached composition data, this will be missing so we revert to creationDate
                                const dateValue = compositionData.lastModifiedDate
                                    ? new Date(compositionData.lastModifiedDate)
                                    : new Date(compositionData.creationDate)
                                return (
                                    <CompositionThumbnail
                                        key={compositionData.id}
                                        ref={(el) => {
                                            if (el) {
                                                thumbnailRefs.current.set(compositionData.id, el)
                                            } else {
                                                thumbnailRefs.current.delete(compositionData.id)
                                            }
                                        }}
                                        name={displayName}
                                        thumbnail={compositionData.thumbUrl}
                                        date={dateValue}
                                        onClick={() => {
                                            const { name, sceneId, id } = compositionData
                                            openRoom({
                                                sceneName: name,
                                                sceneId,
                                                roomSource: group.roomSource,
                                                compositionId: id,
                                                roomViewType: group.roomViewType,
                                            })
                                        }}
                                        href={buildRoomUrlWithParamsAndHash({
                                            compositionId: compositionData.id,
                                            sceneId: compositionData.sceneId,
                                        })}
                                        onDeleteClick={() => {
                                            setDeleteType(compositionData)
                                            // Store reference to the thumbnail element for focus restoration
                                            const thumbnailElement = thumbnailRefs.current.get(compositionData.id)
                                            setDeleteRestoreFocusTo(thumbnailElement || null)
                                            setIsDeleteModalVisible(true)
                                        }}
                                        onCopy={() =>
                                            onCopyComposition(compositionData.id, compositionData.name, compositionData)
                                        }
                                        onRename={(newName) => {
                                            renameComposition(compositionData.id, newName)
                                        }}
                                    />
                                )
                            })}
                        </div>
                    </div>
                </Theatre>
            </AccessibleModal>
            <DeleteConfirmationModal
                isOpen={isDeleteModalVisible}
                setIsOpen={(isOpen) => {
                    setIsDeleteModalVisible(isOpen)
                    // Clear the restore focus reference when modal closes
                    if (!isOpen) {
                        setDeleteRestoreFocusTo(null)
                    }
                }}
                restoreFocusTo={deleteRestoreFocusTo}
                onSuccessfulDelete={() => {
                    // No need to restore focus on successful delete
                    setDeleteRestoreFocusTo(null)
                }}
            />
        </>
    )
}

export default DesignsModal
