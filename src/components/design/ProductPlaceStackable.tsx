import React from 'react'
import Button from '@ingka/button'
import './ProductItemDetail.scss'
import './ProductPlaceStackable.scss'
import { useTranslation } from 'react-i18next'
import { GeomViewer } from 'Renderer/geomviewer'
import SSRIcon from '@ingka/ssr-icon'
import arrowDownToLine from '@ingka/ssr-icon/paths/arrow-down-to-line-small'

const ProductPlaceStackable = () => {
    const { t } = useTranslation()

    const placeToFloorHandler = () => {
        GeomViewer.bindings?.doAction('exit-placement-mode')
    }

    // Note the usage of onMouseDown instead of onClick. This is because Preview component is subscribed to window's onMouseDown and these needs to run first.
    return (
        <div className="ProductPlaceStackable">
            <button onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <div className="centerContent">
                    <SSRIcon paths={arrowDownToLine} />
                </div>
                <div className="stackableTextDescription">{t('design.select a highlighted surface to place')}</div>
                <div className="centerContent or">{t('common.or')}</div>
            </button>
            <div
                className="centerContent"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <Button
                    className="placeOnTheFloorBtn"
                    text={t('design.place on floor')}
                    type="secondary"
                    onMouseDown={placeToFloorHandler}
                />
            </div>
        </div>
    )
}

export default ProductPlaceStackable
