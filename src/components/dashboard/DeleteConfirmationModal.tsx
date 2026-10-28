import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import { Prompt, ModalFooter, ModalHeader } from '@ingka/modal'
import { DeletedType, SceneTypeLabel } from 'services/toasts'
import { AccessibleModal } from 'components/AccessibleModal'

import './DeleteConfirmationModal.scss'
import { useAppDispatch, useAppSelector } from 'hooks'
import { getDeleteType, getItemsToDelete } from 'models/ui/selectors'
import { deleteComposition } from 'models/compositions/actions'
import { deleteScene } from 'models/scenes/actions'
import { getById } from 'models/scenes/selectors'
import { getSceneTypeLabel } from 'models/scenes/utils'

export interface DeleteConfirmationModalProps {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    restoreFocusTo?: HTMLElement | null
    onSuccessfulDelete?: () => void
}

const DeleteConfirmationModal = ({
    isOpen,
    setIsOpen,
    restoreFocusTo,
    onSuccessfulDelete,
}: DeleteConfirmationModalProps) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const deleteType = useAppSelector(getDeleteType)
    const ids = useAppSelector(getItemsToDelete)
    const scenesById = useAppSelector(getById)
    const [isSuccessfulDelete, setIsSuccessfulDelete] = useState(false)

    const closeModal = () => {
        setIsOpen(false)

        // Reset the successful delete flag when modal closes
        setIsSuccessfulDelete(false)
    }

    // Get scene sourceType when deleting a scene
    const sceneId = Array.isArray(ids) ? ids[0] : ids
    const scene = scenesById[sceneId]
    const sceneTypeLabel = getSceneTypeLabel(scene?.sourceType)

    let deleteCtaText = ''
    let modalHeaderText = ''

    switch (deleteType) {
        case DeletedType.SINGLE_COMPOSITION:
            deleteCtaText = t('dashboard.delete design', { ns: 'dashboard' })
            modalHeaderText = t('dashboard.delete this design', { ns: 'dashboard' })
            break
        case DeletedType.SCENE_WITH_SINGLE_COMPOSITION:
            deleteCtaText = t('dashboard.delete design', { ns: 'dashboard' })
            if (sceneTypeLabel === SceneTypeLabel.SCAN) {
                modalHeaderText = t('dashboard.delete this scan and its design', { ns: 'dashboard' })
            } else if (sceneTypeLabel === SceneTypeLabel.IMAGE) {
                modalHeaderText = t('dashboard.delete this image and its design', { ns: 'dashboard' })
            } else {
                modalHeaderText = t('dashboard.delete this room and its design', { ns: 'dashboard' })
            }
            break
        case DeletedType.MULTIPLE_COMPOSITIONS:
            deleteCtaText = t('dashboard.delete all', { ns: 'dashboard' })
            modalHeaderText = t('dashboard.delete this room and all its designs', { ns: 'dashboard' })
            break
        case DeletedType.SCENE_WITH_NO_COMPOSITIONS:
            if (sceneTypeLabel === SceneTypeLabel.SCAN) {
                deleteCtaText = t('dashboard.delete scan', { ns: 'dashboard' })
                modalHeaderText = t('dashboard.delete this scan', { ns: 'dashboard' })
            } else if (sceneTypeLabel === SceneTypeLabel.IMAGE) {
                deleteCtaText = t('dashboard.delete image', { ns: 'dashboard' })
                modalHeaderText = t('dashboard.delete this image', { ns: 'dashboard' })
            } else {
                deleteCtaText = t('dashboard.delete room', { ns: 'dashboard' })
                modalHeaderText = t('dashboard.delete this room', { ns: 'dashboard' })
            }
            break
        case DeletedType.SCENE_WITH_COMPOSITIONS:
            deleteCtaText = t('dashboard.delete all', { ns: 'dashboard' }) as string
            if (sceneTypeLabel === SceneTypeLabel.SCAN) {
                modalHeaderText = t('dashboard.delete this scan and all its designs', { ns: 'dashboard' }) as string
            } else if (sceneTypeLabel === SceneTypeLabel.IMAGE) {
                modalHeaderText = t('dashboard.delete this image and all its designs', { ns: 'dashboard' }) as string
            } else {
                modalHeaderText = t('dashboard.delete this room and all its designs', { ns: 'dashboard' }) as string
            }
            break
        default:
            break
    }
    const closeCtaText = t('design.cancel', { ns: 'translation' })

    // Use plural description for multiple items
    const isPlural =
        deleteType === DeletedType.MULTIPLE_COMPOSITIONS || deleteType === DeletedType.SCENE_WITH_COMPOSITIONS
    const modalDescriptionText = isPlural
        ? t('dashboard.are you sure you want to delete multiple', { ns: 'dashboard' })
        : t('dashboard.are you sure you want to delete', { ns: 'dashboard' })

    const onConfirmDeleteClick = () => {
        if (deleteType === DeletedType.SCENE_WITH_NO_COMPOSITIONS) {
            dispatch(deleteScene(ids))
        } else if (deleteType === DeletedType.SCENE_WITH_COMPOSITIONS) {
            const sceneIdToDelete = ids.shift()
            dispatch(deleteScene(sceneIdToDelete))
            ids.forEach((id: string) => {
                dispatch(deleteComposition(id))
            })
        } else if (deleteType === DeletedType.SCENE_WITH_SINGLE_COMPOSITION) {
            // Scene with single design - delete both scene and composition
            const sceneIdToDelete = ids.shift()
            dispatch(deleteScene(sceneIdToDelete))
            if (ids.length > 0) {
                dispatch(deleteComposition(ids[0]))
            }
        } else if (deleteType === DeletedType.SINGLE_COMPOSITION) {
            dispatch(deleteComposition(ids))
        } else if (deleteType === DeletedType.MULTIPLE_COMPOSITIONS) {
            ids.forEach((i: string) => {
                dispatch(deleteComposition(i))
            })
        }

        // Mark as successful delete to disable automatic focus restoration
        setIsSuccessfulDelete(true)

        // Call success callback if provided (will handle focus appropriately)
        if (onSuccessfulDelete) {
            onSuccessfulDelete()
        }

        // Close the modal after callback
        setIsOpen(false)
    }

    return (
        <AccessibleModal
            className="DeleteConfirmationModal"
            isOpen={isOpen}
            onClose={closeModal}
            restoreFocusTo={isSuccessfulDelete ? null : restoreFocusTo}
            ariaLabel={modalHeaderText}
            wrapContent={false}
        >
            <Prompt
                open={isOpen}
                titleId="DeleteConfirmationModal"
                header={<ModalHeader ariaCloseTxt={t('design.cancel')} />}
                footer={
                    <ModalFooter className="modalFooter">
                        <Button
                            className="cancelButton"
                            text={closeCtaText}
                            type="secondary"
                            onClick={closeModal}
                            autoFocus
                        />
                        <Button onClick={onConfirmDeleteClick} type="danger" text={deleteCtaText} />
                    </ModalFooter>
                }
                title={modalHeaderText}
                className="modalPrompt"
            >
                <div className="modalContent">
                    <p>{modalDescriptionText}</p>
                </div>
            </Prompt>
        </AccessibleModal>
    )
}

export default DeleteConfirmationModal
