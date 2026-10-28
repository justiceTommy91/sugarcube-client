import React from 'react'
import Modal, { Prompt, ModalBody } from '@ingka/modal'
import Skeleton from '@ingka/skeleton'
import { useTranslation } from 'react-i18next'
import { getRefParamFragment } from '@astro-hooks/useReferrer'
import { useFMFShowrooms } from '@astro-hooks/useFMFShowrooms'
import { click } from '@utils/tracker'
import { MP_FIND_MY_FIT_LANDING_SAMPLE_SPACE_OPEN } from '@lib/tracking/constants'
import { useUserContext } from '@providers/UserProvider'
import './SampleSpacesModal.scss'

interface SampleSpacesModalProps {
    isOpen: boolean
    onClose: () => void
}

const SampleSpacesModal = ({ isOpen, onClose }: SampleSpacesModalProps) => {
    const { t } = useTranslation('find-my-fit')
    const { showrooms, scenes, isLoading, error } = useFMFShowrooms()
    const { isLoggedIn } = useUserContext()

    const handleSpaceClick = (sceneUuid: string) => {
        click(MP_FIND_MY_FIT_LANDING_SAMPLE_SPACE_OPEN, { SceneUuid: sceneUuid, IsLoggedIn: isLoggedIn })
        const base = window.location.pathname.replace(/landing\/?$/, '')
        window.location.href = `${base}viewer/?sceneId=${sceneUuid}${getRefParamFragment()}`
    }

    return (
        <Modal visible={isOpen} handleCloseBtn={onClose} className="SampleSpacesModal">
            <Prompt
                title={t('find-my-fit.landing.sampleSpaces.title')}
                titleId="sample-spaces-title"
                header={null}
                footer={null}
            >
                <ModalBody>
                    {error ? (
                        <p className="SampleSpacesModal__error">{t('find-my-fit.landing.sampleSpaces.error')}</p>
                    ) : (
                        <div className="SampleSpacesModal__grid">
                            {isLoading
                                ? Array.from({ length: 4 }).map((_, i) => (
                                      // eslint-disable-next-line react/no-array-index-key
                                      <div key={i} className="SampleSpacesModal__tile">
                                          <Skeleton aria-busy height="100%" width="100%" tagName="div" />
                                      </div>
                                  ))
                                : showrooms.map((showroom, i) => {
                                      const scene = scenes[i]
                                      if (!scene) return null
                                      return (
                                          <button
                                              key={showroom.id}
                                              type="button"
                                              className="SampleSpacesModal__tile"
                                              onClick={() => handleSpaceClick(scene.uuid)}
                                          >
                                              <img
                                                  src={showroom.thumbnail}
                                                  alt={showroom.name}
                                                  className="SampleSpacesModal__tile-image"
                                              />
                                          </button>
                                      )
                                  })}
                        </div>
                    )}
                </ModalBody>
            </Prompt>
        </Modal>
    )
}

export default SampleSpacesModal
