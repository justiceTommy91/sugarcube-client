import React, { useState, useRef, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import Image from '@ingka/image'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import ellipsesHorizontal from '@ingka/ssr-icon/paths/ellipses-horizontal'
import calendar from '@ingka/ssr-icon/paths/calendar'
import warningTriangle from '@ingka/ssr-icon/paths/warning-triangle'
import trashCan from '@ingka/ssr-icon/paths/trash-can'

import { InteractiveArea } from 'components/InteractiveArea'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { SCENE_STATE_PROCESSING, SCENE_STATE_FAILED, SCENE_STATE_SUCCESS, SceneState } from 'models/scenes/constants'

import { useImageAvailability } from 'hooks'
import { MoreActionsDropdown } from './MoreActionsDropdown'
import { RenameCompositionForm } from './RenameCompositionForm'

require('./CompositionThumbnail.scss')

export type CompositionThumbnailProps = {
    thumbnail: string | null
    name: string
    date?: Date
    count?: number
    href?: string
    onClick?: React.MouseEventHandler
    onDeleteClick: () => void
    onRename?: (newName: string) => void
    onCopy?: () => void
    onCreateNewDesign?: () => void
    sceneState?: SceneState
}

const CompositionThumbnail = forwardRef<HTMLAnchorElement, CompositionThumbnailProps>(
    (
        {
            thumbnail,
            name,
            date,
            href = '',
            onClick,
            onDeleteClick,
            onRename,
            count = 0,
            onCopy,
            onCreateNewDesign,
            sceneState = SCENE_STATE_SUCCESS,
        },
        ref,
    ) => {
        const { t } = useTranslation(['dashboard', 'translation'])
        const moreButtonRef = useRef<HTMLButtonElement>(null)

        const [isMenuOpen, setIsMenuOpen] = useState(false)
        const toggleMenu = () => {
            setIsMenuOpen((m) => !m)
        }
        const closeMenu = () => {
            setIsMenuOpen(false)
            // Focus restoration is now handled by MoreActionsDropdown component
        }

        const [isRenameFormVisible, setIsRenameFormVisible] = useState(false)
        const showRenameForm = () => {
            setIsRenameFormVisible(true)
        }
        const hideRenameForm = () => {
            setIsRenameFormVisible(false)
        }

        const canOpenScene = sceneState === SCENE_STATE_SUCCESS

        // For regular compositions (non-processing), check if thumbnail image is available
        // This helps handle cases where the thumbnail URL is returned but the image isn't ready yet
        // For processing scenes, we show a loading overlay instead
        const shouldCheckImageAvailability = sceneState !== SCENE_STATE_PROCESSING
        const thumbnailImageIsAvailable = useImageAvailability(shouldCheckImageAvailability ? thumbnail : null)

        return (
            <div
                className={classNames('CompositionThumbnail', {
                    active: isMenuOpen,
                    failed: sceneState === SCENE_STATE_FAILED,
                })}
            >
                <InteractiveArea
                    ref={ref}
                    className="thumbnailArea"
                    href={canOpenScene ? href : undefined}
                    onClick={canOpenScene ? onClick : undefined}
                    aria-label={name}
                >
                    <Image
                        // Change the key to trigger re-render when thumbnail image becomes available
                        key={`image${thumbnailImageIsAvailable ? '--has-processed' : ''}`}
                        className="thumbnail"
                        src={thumbnail ?? undefined}
                        alt=""
                    />

                    {sceneState === SCENE_STATE_PROCESSING && (
                        <div className="stateOverlay processing">
                            <BouncingBallLoader />
                            <span className="stateText">
                                {t('translation:design.composition thumbnail.processing')}
                            </span>
                        </div>
                    )}

                    {count > 0 && (
                        <div className="numberOfDesigns">
                            <SSRIcon paths={paintbrush} />

                            {t('dashboard:dashboard.design', { count })}
                        </div>
                    )}
                </InteractiveArea>

                <div className="contentArea">
                    {sceneState === SCENE_STATE_FAILED ? (
                        <div className="descriptionArea">
                            <p>
                                <SSRIcon paths={warningTriangle} className="errorTriangle" />{' '}
                                {t('translation:design.composition thumbnail.unable to process')}
                            </p>
                            <div className="errorMessage">
                                {t('translation:design.composition thumbnail.processing failed')}
                            </div>
                        </div>
                    ) : isRenameFormVisible ? (
                        <div className="descriptionArea">
                            <RenameCompositionForm
                                currentName={name}
                                onSubmit={(newName) => {
                                    onRename?.(newName)
                                    hideRenameForm()
                                }}
                            />
                        </div>
                    ) : (
                        <InteractiveArea
                            className="descriptionArea"
                            href={canOpenScene ? href : undefined}
                            onClick={canOpenScene ? onClick : undefined}
                            aria-hidden="true"
                            tabIndex={-1}
                        >
                            <p>{name}</p>
                            {date && (
                                <div className="date">
                                    <SSRIcon paths={calendar} />
                                    {date.toLocaleDateString()}
                                </div>
                            )}
                        </InteractiveArea>
                    )}

                    <div className="actionArea">
                        {sceneState === SCENE_STATE_FAILED ? (
                            <Button
                                type="tertiary"
                                onClick={onDeleteClick}
                                iconOnly
                                ssrIcon={trashCan}
                                aria-label={t('translation:design.delete')}
                            />
                        ) : (
                            <Button
                                ref={moreButtonRef}
                                type="tertiary"
                                onClick={toggleMenu}
                                iconOnly
                                ssrIcon={ellipsesHorizontal}
                                aria-label={t('translation:design.more options')}
                                aria-expanded={isMenuOpen}
                                aria-haspopup="menu"
                            />
                        )}
                        {isMenuOpen && (
                            <MoreActionsDropdown
                                isOpen={isMenuOpen}
                                onClickAway={closeMenu}
                                onDeleteClick={onDeleteClick}
                                onRenameClick={onRename ? showRenameForm : undefined}
                                onCopyClick={onCopy}
                                onCreateNewDesign={onCreateNewDesign}
                                restoreFocusTo={moreButtonRef.current}
                            />
                        )}
                    </div>
                </div>
            </div>
        )
    },
)

CompositionThumbnail.displayName = `CompositionThumbnail`

export default CompositionThumbnail
