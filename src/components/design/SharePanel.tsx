import React, { useState, useEffect, useRef, ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import Icon from 'components/uiElements/Icon'
import { FacebookShareButton } from 'react-share'
import { click } from 'utils/tracker'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'
import { usePrevious } from 'hooks'
import type { Composition, CompositionSharingWithIdData } from 'models/compositions'
import RadioButtonGroup from '@ingka/radio-button-group'
import TextArea from '@ingka/text-area'
import classNames from 'classnames'
import Button from '@ingka/button'
import arrowCounterclockwise from '@ingka/ssr-icon/paths/arrow-counterclockwise'
import mail from '@ingka/ssr-icon/paths/mail'
import { TRACK_LOCATION_DESIGN_SUMMARY, TRACK_LOCATION_DESIGN_HEADER } from 'models/tracking/constants'
import OpenCompositionTrackingType from 'models/tracking'

import Modal, { ModalBody, ModalHeader, Sheets } from '@ingka/modal'
import SSRIcon from '@ingka/ssr-icon'

import link from '@ingka/ssr-icon/paths/link'
import checkmark from '@ingka/ssr-icon/paths/checkmark'

require('./SharePanel.scss')

interface SharedTrackingInfo {
    SharedFrom: string
}
interface SharePanelProps {
    close: (trackingInfo?: SharedTrackingInfo) => void
    composition: Composition
    isSaving: boolean
    hasSaveError: boolean
    isSavingSharing: boolean
    hasSavingShareError: boolean
    saveSharingPermissions: (compositionSharingData: CompositionSharingWithIdData) => void
    saveCompositionBeforeSharing: () => void
    isDesignSummaryVisible: boolean
    roomInfo: OpenCompositionTrackingType
}

const VIEW_ONLY = 'VIEW_ONLY'
const ALLOW_REMIX = 'ALLOW_REMIX'

const SharePanel = ({
    close,
    composition,
    isSaving,
    hasSaveError,
    isSavingSharing,
    hasSavingShareError,
    saveSharingPermissions,
    saveCompositionBeforeSharing,
    isDesignSummaryVisible,
    roomInfo,
}: SharePanelProps) => {
    const { name, shareUrl, enableRemix, isShared, sendNotifications, uuid } = composition
    const { t } = useTranslation()
    const prevIsSaving = usePrevious(isSaving)
    const prevIsSavingSharing = usePrevious(isSavingSharing)
    const hasFinishedSaving = prevIsSaving && !isSaving
    const hasFinsihedSavingSharePermissions = prevIsSavingSharing && !isSavingSharing
    const defaultDescription = t('shared.quote')
    const defaultCompositionTitle = t('design.default composition name')
    const hasTitle = name && name !== defaultCompositionTitle

    // ACCESSIBILITY FIX: Store the element that triggered the modal opening
    const triggerElementRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        // Store the currently focused element when the modal opens
        triggerElementRef.current = document.activeElement as HTMLElement

        // Cleanup function to restore focus when modal closes
        return () => {
            if (triggerElementRef.current) {
                triggerElementRef.current.focus()
            }
        }
    }, [])

    const quote = `${t('shared.quote')}${hasTitle ? ` "${name}"` : ''}`

    const [copied, setCopied] = useState(false)
    const [sharingPermissions, setSharingPermissions] = useState(enableRemix ? ALLOW_REMIX : VIEW_ONLY)
    const [description, setDescription] = useState(defaultDescription)

    useEffect(() => {
        const copiedTimer = setTimeout(() => setCopied(false), 1000)
        return () => clearTimeout(copiedTimer)
    }, [copied])

    useEffect(() => {
        setSharingPermissions(enableRemix ? ALLOW_REMIX : VIEW_ONLY)
    }, [enableRemix])

    // ACCESSIBILITY FIX: Refs for radio buttons to manage focus
    // The @ingka/radio-button-group component doesn't properly handle focus management
    // when radio buttons are temporarily disabled during API calls
    const viewOnlyRadioRef = useRef<HTMLInputElement>(null)
    const allowRemixRadioRef = useRef<HTMLInputElement>(null)

    // ACCESSIBILITY FIX: Restore focus after radio buttons are re-enabled
    // When users navigate radio buttons with arrow keys, the selection changes but focus
    // gets lost when the buttons are temporarily disabled during saveSharingPermissions() call.
    // This useEffect restores focus to the selected radio button after the API call completes.
    useEffect(() => {
        if (!isSavingSharing && sharingPermissions) {
            // Wait for DOM updates to complete before restoring focus
            const timeoutId = setTimeout(() => {
                const targetRef = sharingPermissions === VIEW_ONLY ? viewOnlyRadioRef : allowRemixRadioRef
                if (targetRef.current && !targetRef.current.disabled) {
                    targetRef.current.focus()
                }
            }, 50)
            return () => clearTimeout(timeoutId)
        }
        return undefined
    }, [isSavingSharing, sharingPermissions])

    const showLoading = isSaving

    const hashtag = t('shared.hashtag')
    const showError = (hasFinishedSaving && hasSaveError) || (hasFinsihedSavingSharePermissions && hasSavingShareError)
    const emailHref = encodeURI(
        `mailto:?subject=${quote}&body=${description}\n\n${t('shared.my design link')} ${shareUrl}\n\n`,
    )

    const errMessage = (
        <div className="sharePanelMessage">
            <div className="sharePanelHeader">
                <h3>{t('shared.something went wrong')}</h3>
                <h4>{t('shared.errSavingMessage')}</h4>
                <Button
                    onClick={saveCompositionBeforeSharing}
                    type="primary"
                    ssrIcon={arrowCounterclockwise}
                    text={t('shared.refresh')}
                />
            </div>
        </div>
    )

    const handlePermissionsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const {
            target: { value },
        } = event
        setSharingPermissions(value)
        const allowEnableRemix = value === ALLOW_REMIX
        const compositionSharingData = {
            isShared,
            enableRemix: allowEnableRemix,
            sendNotifications,
            compositionId: uuid,
        }
        saveSharingPermissions(compositionSharingData)
    }

    const handleDescriptionChange = (event: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
        const {
            target: { value },
        } = event

        setDescription(value)
    }

    const permissionsOptions = [
        {
            id: 'shareViewOnly',
            name: 'sharePermissions',
            label: t('shared.view only'),
            caption: t('shared.anyone with the link can view'),
            value: VIEW_ONLY,
            disabled: isSavingSharing,
            checked: sharingPermissions === VIEW_ONLY,
            onChange: handlePermissionsChange,
            ref: viewOnlyRadioRef, // ACCESSIBILITY: Ref for focus management
        },
        {
            id: 'shareAllowRemix',
            name: 'sharePermissions',
            label: t('shared.allow design remix'),
            caption: t('shared.allow design remix description'),
            value: ALLOW_REMIX,
            disabled: isSavingSharing,
            checked: sharingPermissions === ALLOW_REMIX,
            onChange: handlePermissionsChange,
            ref: allowRemixRadioRef, // ACCESSIBILITY: Ref for focus management
        },
    ]

    const trackShareClick = (shareType: string) =>
        new Promise<void>((resolve) => {
            const { enableRemix: remixEnabled } = composition

            const trackingInfo = {
                ...roomInfo,
                ShareType: shareType,
                SharedFrom: isDesignSummaryVisible ? TRACK_LOCATION_DESIGN_SUMMARY : TRACK_LOCATION_DESIGN_HEADER,
                RemixEnabled: remixEnabled.toString(),
            }
            if (shareType) {
                click('DecorateRoom.ShareDesign', trackingInfo)
            }
            resolve()
        })

    const shareButtons = (
        <div className="sharePermissionsContainter">
            {showLoading ? (
                <div className="loader">
                    <BouncingBallLoader subheaderText={`${t('shared.saving your design')}...`} />
                </div>
            ) : (
                <>
                    <RadioButtonGroup
                        data-testid="sharepanel-radio-buttons"
                        className="sharePermissionsRadios"
                        name={t('shared.sharing permissions')}
                        list={permissionsOptions}
                        subtle
                    />
                    <div onKeyDown={(e) => e.stopPropagation()}>
                        <TextArea
                            className="shareDescription"
                            onChange={handleDescriptionChange}
                            label={t('shared.add optional description')}
                            id="shareTextArea"
                            value={description}
                            placeholder={description}
                            disabled={isSavingSharing}
                            data-testid="sharepanel-description"
                        />
                    </div>

                    {shareUrl && (
                        <>
                            <h3 className={classNames('shareButtonsTitle', { isSaving: isSavingSharing })}>
                                {t('shared.choose how to share')}
                            </h3>

                            <ul
                                className={classNames('shareButtonsContainer', { isSaving: isSavingSharing })}
                                data-testid="sharepanel-share-buttons"
                                aria-label="Sharing options"
                            >
                                <li>
                                    <CopyToClipboard
                                        text={shareUrl}
                                        onCopy={() => {
                                            setCopied(true)
                                            trackShareClick('CopyLink')
                                        }}
                                    >
                                        <button className="shareButton copyLink" aria-label={t('aria.copy-share-link')}>
                                            <div className="Icon">
                                                <SSRIcon paths={link} />
                                            </div>
                                            {copied && (
                                                <div className="linkCopied">
                                                    <SSRIcon paths={checkmark} />
                                                    <span>{t('shared.copy link')}</span>
                                                </div>
                                            )}
                                        </button>
                                    </CopyToClipboard>
                                </li>

                                <li>
                                    <FacebookShareButton
                                        quote={description}
                                        url={shareUrl}
                                        hashtag={hashtag}
                                        beforeOnClick={() => trackShareClick('Facebook')}
                                        className="shareButton"
                                        aria-label={t('aria.share-via-facebook')}
                                    >
                                        <Icon code="facebook" svg />
                                    </FacebookShareButton>
                                </li>

                                <li>
                                    <a
                                        href={emailHref}
                                        target="_top"
                                        className="shareButton"
                                        aria-label={t('aria.share-via-email')}
                                    >
                                        <div className="Icon">
                                            <SSRIcon paths={mail} onClick={() => trackShareClick('Email')} />
                                        </div>
                                    </a>
                                </li>
                            </ul>
                        </>
                    )}
                </>
            )}
        </div>
    )

    return (
        <Modal handleCloseBtn={() => close()} className="SharePanel" visible>
            <Sheets
                alignment="right"
                className="modalSheets"
                header={<ModalHeader ariaCloseTxt={t('aria.close')} className="modalHeader" />}
                footer={<div />}
                data-testid="sharePanel"
                aria-labelledby="share-panel-header"
            >
                <ModalBody className="modalBody">
                    <div className="sharePanelInner">
                        <div className="flexContainer">
                            {showError ? (
                                errMessage
                            ) : (
                                <div className="scrollable">
                                    <div className="sharePanelHeader">
                                        <h2 id="share-panel-header">{t('shared.share your design')}</h2>
                                        <p>{t('shared.subheader')}</p>
                                    </div>

                                    {shareButtons}
                                </div>
                            )}
                        </div>
                    </div>
                </ModalBody>
            </Sheets>
        </Modal>
    )
}

export default SharePanel
