import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import Modal, { Prompt } from '@ingka/modal'

require('./UpptackaDesignTipsTutorial.scss')

interface Props {
    hasSeenTutorial: boolean
    handleTutorialClose: () => void
}
export const UpptackaDesignTipsTutorial = ({ hasSeenTutorial, handleTutorialClose }: Props) => {
    const { t } = useTranslation()
    return (
        <Modal handleCloseBtn={handleTutorialClose} visible={!hasSeenTutorial} className="UpptackaDesignTipsTutorial">
            <Prompt
                title={t('upptacka.design tips.tutorial.title')}
                header={null}
                titleId="UpptackaDesignTipsTutorial"
                footer={
                    <Button
                        className="UpptackaDesignTipsTutorial__cta"
                        text={t('upptacka.design tips.tutorial.cta')}
                        type="primary"
                        onClick={handleTutorialClose}
                    />
                }
            >
                <span className="UpptackaDesignTipsTutorial__body">{t('upptacka.design tips.tutorial.body')}</span>
            </Prompt>
        </Modal>
    )
}
