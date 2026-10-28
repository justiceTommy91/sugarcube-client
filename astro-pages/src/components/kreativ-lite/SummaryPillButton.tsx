import React from 'react'
import Price from '@ingka/price'
import SSRIcon from '@ingka/ssr-icon'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import { useTranslation } from 'react-i18next'
import { useEasing } from '@hooks/useEasing'
import { formatCurrency } from '@utils/convertCurrency'
import { useRoomProducts } from './hooks/useRoomProducts'
import './SummaryPillButton.scss'

interface SummaryPillButtonProps {
    open: boolean
    onOpen: () => void
}

export const SummaryPillButton = ({ open, onOpen }: SummaryPillButtonProps) => {
    const { t } = useTranslation()
    const roomProducts = useRoomProducts()

    const totalPrice = roomProducts.reduce((sum, item) => sum + Number(item.priceNumeral ?? 0), 0)

    const price = useEasing({ target: totalPrice, duration: 800, transform: formatCurrency })
    const disabled = roomProducts.length === 0

    return (
        <button
            className="SummaryPillButton"
            onClick={onOpen}
            disabled={disabled}
            aria-label={t('design.kreativLite.summary.open summary')}
            aria-expanded={open}
        >
            <Price
                className="SummaryPillButton__price"
                size="medium"
                integerValue={price.current.integer}
                decimalValue={price.current.fraction}
                decimalSign={price.current.decimal}
                currencyLabel={price.current.currency}
                currencyPosition={price.current.currencyPosition === 'before' ? 'leading' : 'trailing'}
                currencySpacing="thin"
                currencyVerticalAlignment={price.current.currencyScriptType === 'superscript' ? 'super' : 'base'}
                aria-hidden="true"
            />
            <span className="SummaryPillButton__divider" aria-hidden="true" />
            <span className="SummaryPillButton__arrow" aria-hidden="true">
                <SSRIcon paths={arrowRight} />
            </span>
        </button>
    )
}
