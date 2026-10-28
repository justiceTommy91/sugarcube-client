import React, { forwardRef, ReactNode, useRef } from 'react'
import { func, element, bool, oneOf } from 'prop-types'
import { useOutsideAlerter } from 'hooks'
import SSRIcon from '@ingka/ssr-icon'
import cross from '@ingka/ssr-icon/paths/cross'
import classNames from 'classnames'

require('./TheaterModal.scss')

// eslint-disable-next-line i18next/no-literal-string
const zLayers = ['base', 'mid', 'top'] as const
type ZLayer = (typeof zLayers)[number]
interface TheaterModalProps {
    onClose: () => void
    isOpen: boolean
    children: ReactNode
    zLayer?: ZLayer
}

const TheaterModal = forwardRef<HTMLDivElement, TheaterModalProps>((props, ref) => {
    const { onClose, children, isOpen, zLayer } = props

    const rootRef = useRef<HTMLDivElement | null>(null)

    // If the user clicks outside, the modal is closed
    useOutsideAlerter({
        ref: rootRef,
        onClickOutside: onClose,
    })

    return (
        <div
            className={classNames(
                'TheaterModal',
                zLayers.reduce<Record<string, boolean>>(
                    (cls, z) => ({ ...cls, [`TheaterModal--${z}Layer`]: zLayer === z }),
                    {},
                ),
            )}
        >
            {isOpen && (
                <div
                    className="theaterModalContainer"
                    ref={(el) => {
                        rootRef.current = el

                        if (typeof ref === 'function') {
                            ref(el)
                        } else if (ref !== null) {
                            // eslint-disable-next-line no-param-reassign
                            ref.current = el
                        }
                    }}
                >
                    <div className="theaterModalContent">
                        <button
                            onClick={onClose}
                            className="theaterModalCloseBtn"
                            data-testid="theater-modal-close-btn"
                        >
                            <SSRIcon paths={cross} />
                        </button>

                        <div className="theaterModalChildren">{children}</div>
                    </div>
                </div>
            )}
        </div>
    )
})

TheaterModal.defaultProps = {
    // eslint-disable-next-line i18next/no-literal-string
    zLayer: 'base',
}

TheaterModal.propTypes = {
    onClose: func.isRequired,
    children: element.isRequired,
    isOpen: bool.isRequired,
    // eslint-disable-next-line i18next/no-literal-string
    zLayer: oneOf(zLayers),
}

export default TheaterModal
