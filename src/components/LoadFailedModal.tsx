import React from 'react'
import { useTranslation } from 'react-i18next'
import Modal, { Prompt, ModalFooter } from '@ingka/modal'
import Button from '@ingka/button'
import { withPrefix } from 'gatsby'

require('./LoadFailedModal.scss')

interface LoadFailedModalProps {
    onRefresh: () => void
    onLeave: () => void
}

const LoadFailedModal = ({ onRefresh, onLeave }: LoadFailedModalProps) => {
    const { t } = useTranslation()

    return (
        <Modal className="LoadFailedModal" visible handleCloseBtn={() => {}}>
            <Prompt
                titleId="LoadFailedModal"
                title={t('design.load failed header')}
                header={null}
                footer={
                    <ModalFooter>
                        <Button text={t('design.load failed reload')} type="primary" onClick={onRefresh} />
                        <Button text={t('design.load failed leave')} onClick={onLeave} />
                    </ModalFooter>
                }
            >
                <img src={withPrefix('/images/graphics/load_failed.jpg')} alt="" />
                {t('design.load failed body')}
            </Prompt>
        </Modal>
    )
}

export default LoadFailedModal
