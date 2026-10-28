import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate, withPrefix } from 'gatsby'
import arrowLeft from '@ingka/ssr-icon/paths/arrow-left'
import Button from '@ingka/button'
import QRCode from 'qrcode'
import { getH22ShareUrl } from 'models/kiosk/helpers'
import { getRenderer } from 'models/refStore/selectors'
import SSRIcon from '@ingka/ssr-icon'
import camera from '@ingka/ssr-icon/paths/camera'
import scanQrCode from '@ingka/ssr-icon/paths/scan-qr-code'
import mobileHandover from '@ingka/ssr-icon/paths/mobile-handover'

require('./styles.scss')

interface KioskShareProps {
    closeModal: () => void
    uuid: string
}

const KioskShare = ({ closeModal, uuid }: KioskShareProps) => {
    const { t } = useTranslation()
    const [qrSrc, setQrSrc] = useState('')
    const panoImageRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        const h22ShareUrl = getH22ShareUrl(uuid)
        QRCode.toDataURL(h22ShareUrl, { color: { light: '#0000' } }).then((data) => setQrSrc(data))
    }, [uuid])

    useEffect(() => {
        const renderer = getRenderer()
        renderer?.takeRoomScreenshot(
            (thumb: { thumbDataUrl: string }) => {
                const imageElement = panoImageRef && panoImageRef.current

                if (imageElement) {
                    imageElement.src = thumb.thumbDataUrl
                }
            },
            null,
            'KioskShareModal', // eslint-disable-line i18next/no-literal-string
        )
    }, [])

    const onAllDoneClick = () => {
        closeModal()
        navigate(`/dashboard`)
    }

    return (
        <div className="KioskShare">
            <div className="columnsContainer">
                <div className="stepsColumn">
                    <Button
                        className="backButton"
                        onClick={closeModal}
                        type="secondary"
                        ssrIcon={arrowLeft}
                        text={t('kiosk.go back')}
                    />
                    <div className="qrContainer">
                        <div className="qrCode">
                            <img className="qrCodeImage" src={qrSrc} alt="" />
                        </div>
                        <div className="qrStepsWrapper">
                            <div className="qrSteps">
                                <img
                                    src={withPrefix('/images/kiosk/swigglyArrow.svg')}
                                    alt=""
                                    className="swigglyArrow"
                                />
                                <div className="stepsTitle">{t('kiosk.scan this qr code to get')}</div>
                                <div className="step">
                                    <div className="stepHeader">
                                        <span>
                                            <SSRIcon paths={camera} />
                                        </span>
                                        {t('kiosk.open your camera app')}
                                    </div>
                                    <div className="stepDescription">{t('kiosk.open camera app from home screen')}</div>
                                </div>
                                <div className="step">
                                    <div className="stepHeader">
                                        <span>
                                            <SSRIcon paths={scanQrCode} />
                                        </span>
                                        {t('kiosk.scan qr code')}
                                    </div>
                                    <div className="stepDescription">{t('kiosk.hold your device')}</div>
                                </div>
                                <div className="step">
                                    <div className="stepHeader">
                                        <span>
                                            <SSRIcon paths={mobileHandover} />
                                        </span>
                                        {t('kiosk.tap the link')}
                                    </div>
                                    <div className="stepDescription">{t('kiosk.device recognizes qr code')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="previewColumn">
                    <div className="title">{t('kiosk.looking good')}</div>
                    <div className="description">{t('kiosk.share with the world')}</div>
                    <div className="compositionImageContainer">
                        <img className="compositionImage" src="" alt="" ref={panoImageRef} />
                    </div>
                    <div className="ctas">
                        <Button onClick={onAllDoneClick} type="primary" text={t('kiosk.all done')} />
                    </div>
                </div>
                <div />
            </div>
        </div>
    )
}

export default KioskShare
