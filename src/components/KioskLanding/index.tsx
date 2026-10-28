import React from 'react'
import { useTranslation } from 'react-i18next'
import KioskIntroPopup from 'components/KioskIntroPopup'
import KioskCompositionSelector from 'components/KioskCompositionSelector'
import { FURNISHED, EMPTY, RoomType } from 'models/kiosk/constants'
import { useAppDispatch } from 'hooks/useAppDispatch'
import { useAppSelector } from 'hooks/useAppSelector'
import { getIsKioskIntroViewed, getKioskSelectedRoomType } from 'models/kiosk/selectors'
import { selectKioskRoomType, setKioskIntroViewed } from 'models/kiosk/slice'
import { openComposition } from 'models/compositions/actions'
import { openScene } from 'models/scenes/actions'
import { withPrefix } from 'gatsby'
import SSRIcon from '@ingka/ssr-icon'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'

require('./styles.scss')

const KioskLanding = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const isKioskIntroViewed = useAppSelector(getIsKioskIntroViewed)
    const roomType = useAppSelector(getKioskSelectedRoomType)

    const onRoomClick = (rType: RoomType) => {
        dispatch(selectKioskRoomType(rType))
    }
    return (
        <div className="KioskLanding">
            <KioskIntroPopup isVisible={!isKioskIntroViewed} closeModal={() => dispatch(setKioskIntroViewed())} />
            {roomType && (
                <div className="compSelectionModal">
                    <KioskCompositionSelector
                        closeModal={() => dispatch(selectKioskRoomType(null))}
                        roomType={roomType}
                        openComposition={(uuid, trackingInfo) => dispatch(openComposition(uuid, trackingInfo))}
                        openScene={(uuid, trackingInfo) => dispatch(openScene(uuid, trackingInfo))}
                    />
                </div>
            )}

            {!roomType && (
                <>
                    <div className="pickRoomType" onClick={() => onRoomClick(FURNISHED)}>
                        <img
                            className="roomImage"
                            src={withPrefix('/images/kiosk/furnishedSpace.jpg')}
                            alt={t('kiosk.alt.furnished space')}
                        />
                        <section className="textSection">
                            <p className="smallText">{t('kiosk.start with')}</p>
                            <p className="heading">{t('kiosk.furnished space')}</p>
                            <p className="subheading">{t('kiosk.living rooms')}</p>
                            <div className="cta">
                                <div> {t('kiosk.pick a room')}</div>
                                <SSRIcon paths={arrowRight} />
                            </div>
                        </section>
                    </div>
                    <div className="pickRoomType" onClick={() => onRoomClick(EMPTY)}>
                        <img
                            className="roomImage"
                            src={withPrefix('/images/kiosk/emptyShell.jpg')}
                            alt={t('kiosk.alt.empty shell')}
                        />
                        <section className="textSection">
                            <p className="smallText">{t('kiosk.start with')}</p>
                            <p className="heading">{t('kiosk.an empty shell')}</p>
                            <p className="subheading">{t('kiosk.design your own rooms')}</p>
                            <div className="cta">
                                <div> {t('kiosk.pick a room')}</div>
                                <SSRIcon paths={arrowRight} />
                            </div>
                        </section>
                    </div>
                </>
            )}
        </div>
    )
}

export default KioskLanding
