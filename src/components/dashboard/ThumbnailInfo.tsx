import classNames from 'classnames'
import { LOCALES_USING_IMPERIAL_SYSTEM } from 'models/location/constants'
import { getRegion } from 'models/location/selectors'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

require('./ThumbnailInfo.scss')

interface Props {
    name: string
    size: number | null
    shape: string | null
}

const ThumbnailInfo = ({ name, size, shape }: Props) => {
    const locale = getRegion()
    const { t } = useTranslation('dashboard')
    const nameRef = useRef<HTMLParagraphElement>(null)
    const [isTruncated, setIsTruncated] = useState(false)

    useEffect(() => {
        const el = nameRef.current
        if (!el) {
            return undefined
        }

        const checkTruncation = () => {
            setIsTruncated(el.scrollWidth > el.clientWidth)
        }

        checkTruncation() // Initial check

        const resizeObserver = new ResizeObserver(() => {
            checkTruncation()
        })
        resizeObserver.observe(el)

        return () => {
            resizeObserver.disconnect()
        }
    }, [name])

    const metricCheck = () => {
        if (LOCALES_USING_IMPERIAL_SYSTEM.includes(locale) && size) {
            return `${Math.floor(size * 10.764)} ${t('dashboard.square feet abbreviated')}`
        }
        return `${size} ${t('dashboard.square meters abbreviated')}`
    }

    return (
        <div className="ThumbnailInfo">
            <p className="showroomName">{name}</p>
            <div className={classNames({ multiViewInfo: shape })}>
                <div className="textInfo">
                    <p ref={nameRef} title={isTruncated ? name : ''}>
                        {name.trim()}
                    </p>
                    {size !== null ? <div className="size">{metricCheck()}</div> : null}
                </div>
            </div>
        </div>
    )
}
export default ThumbnailInfo
