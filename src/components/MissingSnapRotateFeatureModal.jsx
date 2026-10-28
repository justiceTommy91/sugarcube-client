import React, { useState } from 'react'
import { func, string } from 'prop-types'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import { useOutsideAlerter } from 'hooks'
import Modal, { Prompt, ModalFooter } from '@ingka/modal'

import cross from '@ingka/ssr-icon/paths/cross'

require('./MissingFeatureModal.scss')

const MissingSnapRotateFeatureModal = ({
    onClose,
    body,
    headerText,
    ctaText,
    onCtaClick,
    closeBtnText,
    closeModalCallback,
}) => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(true)
    const wrapperRef = React.createRef()
    const closeModal = () => {
        setIsOpen(false)
        closeModalCallback()
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
        <Modal className="MissingFeatureModal" visible={isOpen} handleCloseBtn={closeModal} escapable={false}>
            <div ref={wrapperRef}>
                <Prompt
                    open={isOpen}
                    footer={
                        <ModalFooter className="modalFooter" compact>
                            {onCtaClick && (
                                <Button
                                    className="noWrap"
                                    data-autofocus
                                    onClick={onCtaClick}
                                    onMouseDown={onMouseDown}
                                    onPointerDown={onMouseDown}
                                    type="primary"
                                    text={ctaText}
                                    data-testid="place-on-floor-btn"
                                />
                            )}
                            <Button
                                text={closeCtaText}
                                type="secondary"
                                onClick={() => {
                                    closeModal()
                                    onClose()
                                }}
                                onMouseDown={onMouseDown}
                                onPointerDown={onMouseDown}
                            />
                        </ModalFooter>
                    }
                    title={
                        <>
                            <div className="closeModal">
                                <Button
                                    onClick={closeModal}
                                    onMouseDown={onMouseDown}
                                    onPointerDown={onMouseDown}
                                    type="tertiary"
                                    iconOnly
                                    ssrIcon={cross}
                                    data-testid="missing-modal-close-btn"
                                    text={t('translation:design.cancel')}
                                />
                            </div>
                            {header}
                        </>
                    }
                    className="modalPrompt"
                >
                    <div className="modalContent">
                        <p>{body}</p>
                    </div>
                </Prompt>
            </div>
        </Modal>
    )
}

MissingSnapRotateFeatureModal.defaultProps = {
    onClose: null,
    ctaText: null,
    onCtaClick: null,
    headerText: null,
    closeBtnText: null,
}

MissingSnapRotateFeatureModal.propTypes = {
    onClose: func,
    body: string.isRequired,
    ctaText: string,
    onCtaClick: func,
    headerText: string,
    closeBtnText: string,
    closeModalCallback: func.isRequired,
}

export default MissingSnapRotateFeatureModal
