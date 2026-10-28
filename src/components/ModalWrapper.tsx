import React from 'react'

import Modal from '@ingka/modal'

interface Props {
    children: React.ReactElement[] | React.ReactElement
    handleCloseBtn: () => void
    visible: boolean
    className?: string
}

const ModalWrapper = ({ children, handleCloseBtn, visible, className }: Props) => (
    <Modal className={className} focusLockProps={{ locked: false }} handleCloseBtn={handleCloseBtn} visible={visible}>
        {children}
    </Modal>
)

export default ModalWrapper
