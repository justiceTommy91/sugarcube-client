import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Modal, { Prompt, ModalFooter, ModalHeader } from '@ingka/modal'
import Button from '@ingka/button'

require('./MagicEraserTutorial.scss')

interface MagicEraserTutorialProps {
    onSkip: () => void
    onComplete: () => void
}

const MagicEraserTutorial = ({ onSkip, onComplete }: MagicEraserTutorialProps) => {
    const { t } = useTranslation()
    const [screenIndex, setScreenIndex] = useState(0)
    const switchScreen = () => {
        if (screenIndex === 0) {
            setScreenIndex(1)
        } else if (screenIndex === 1) {
            setScreenIndex(0)
        }
    }

    const showFirstScreen = screenIndex === 0
    const showSecondScreen = screenIndex === 1

    return (
        <div className="MagicEraserTutorial">
            {showFirstScreen && (
                <Modal visible handleCloseBtn={onSkip} className="modalContainer">
                    <Prompt
                        title={t('design.easily remove items')}
                        titleId="MagicEraserTutorial-1"
                        header={<ModalHeader ariaCloseTxt={t('design.cancel')} />}
                        footer={
                            <ModalFooter className="tutorialFooter">
                                <Button
                                    text={t('design.skip')}
                                    type="secondary"
                                    onClick={onSkip}
                                    data-testid="skip-btn"
                                />
                                <Button text={t('design.next')} type="emphasised" onClick={switchScreen} />
                            </ModalFooter>
                        }
                        className="modalPrompt"
                    >
                        <div className="modalContent">
                            <p>{t('design.click on an outlined area')}</p>
                        </div>

                        <div className="headerImage">
                            <img
                                src={`${process.env.GATSBY_ASSET_BUCKET}/graphics/onboarding/magic_eraser/click_hide.png`}
                                alt={t('design.alt.click on outlined items')}
                            />
                            <img
                                src={`${process.env.GATSBY_ASSET_BUCKET}/graphics/onboarding/magic_eraser/click_show.png`}
                                alt={t('design.alt.click on outlined items')}
                            />
                        </div>
                    </Prompt>
                </Modal>
            )}
            {showSecondScreen && (
                <Modal visible handleCloseBtn={onSkip} className="modalContainer">
                    <Prompt
                        title={t('design.go back to design')}
                        titleId="MagicEraserTutorial-2"
                        header={<ModalHeader ariaCloseTxt={t('design.cancel')} />}
                        footer={
                            <ModalFooter className="tutorialFooter">
                                <Button text={t('kiosk.go back')} type="secondary" onClick={switchScreen} />
                                <Button text={t('kiosk.lets go')} type="emphasised" onClick={onComplete} />
                            </ModalFooter>
                        }
                        className="modalPrompt"
                    >
                        <div className="modalContent">
                            <p>{t('design.click design room')}</p>
                        </div>
                    </Prompt>
                </Modal>
            )}
        </div>
    )
}

export default MagicEraserTutorial
