import React, { useState, useRef } from 'react'
import { func, string } from 'prop-types'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import { useOutsideAlerter } from 'hooks'
import Modal, { Prompt, ModalFooter } from '@ingka/modal'

import cross from '@ingka/ssr-icon/paths/cross'

require('./MissingFeatureModal.scss')

const MissingFeatureModal = ({ onClose, body, headerText, imgSrc, ctaText, onCtaClick, closeBtnText }) => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(true)
    const wrapperRef = useRef(null)
    const closeModal = () => {
        setIsOpen(false)
        if (onClose) {
            onClose()
        }
    }

    // We want to stop propagation here since there is a mousedown event listener
    // on the parent component in Preview.jsx
    const onMouseDown = (e) => e.stopPropagation()
    // If the user clicks outside, the modal is closed
    useOutsideAlerter({
        ref: wrapperRef,
        onClickOutside: closeModal,
    })

    if (!isOpen) {
        return null
    }
    const closeCtaText = closeBtnText || t('design.got it')
    const header = headerText || t('design.did not find a surface')
    return (
        <Modal
            ref={wrapperRef}
            className="MissingFeatureModal"
            visible={isOpen}
            handleCloseBtn={closeModal}
            escapable={false}
        >
            <Prompt
                open={isOpen}
                footer={
                    <ModalFooter className="modalFooter" compact>
                        <Button
                            data-autofocus
                            text={closeCtaText}
                            type="primary"
                            onClick={closeModal}
                            onMouseDown={onMouseDown}
                            onTouchStart={onMouseDown}
                            onPointerDown={onMouseDown}
                        />
                        {onCtaClick && (
                            <Button
                                onMouseDown={onMouseDown}
                                onTouchStart={onMouseDown}
                                onPointerDown={onMouseDown}
                                onClick={onCtaClick}
                                type="secondary"
                                text={ctaText}
                                data-testid="place-on-floor-btn"
                            />
                        )}
                    </ModalFooter>
                }
                title={
                    <>
                        <div className="closeModal">
                            <Button
                                onClick={closeModal}
                                onMouseDown={onMouseDown}
                                onTouchStart={onMouseDown}
                                onPointerDown={onMouseDown}
                                type="tertiary"
                                iconOnly
                                ssrIcon={cross}
                                data-testid="missing-modal-close-btn"
                                text={t('translation:design.cancel')}
                            />
                        </div>
                        {imgSrc && (
                            <div className="modalImageContainer">
                                <img src={imgSrc} alt={t('design.alt.no surface detected')} />
                            </div>
                        )}
                        {header}
                    </>
                }
                className="modalPrompt"
            >
                <div className="modalContent">
                    <p>{body}</p>
                </div>
            </Prompt>
        </Modal>
    )
}

MissingFeatureModal.defaultProps = {
    onClose: null,
    ctaText: null,
    onCtaClick: null,
    headerText: null,
    imgSrc: null,
    closeBtnText: null,
}

MissingFeatureModal.propTypes = {
    onClose: func,
    body: string.isRequired,
    ctaText: string,
    onCtaClick: func,
    headerText: string,
    imgSrc: string,
    closeBtnText: string,
}

export default MissingFeatureModal
