import React from 'react'
import Button from '@ingka/button'
import SSRIcon from '@ingka/ssr-icon'
import arrowRight from '@ingka/ssr-icon/paths/arrow-right'
import { useTranslation } from 'react-i18next'
import { formatCurrency, currencyPartsToString } from 'utils/convertCurrency'

import { useEasing } from 'hooks/useEasing'

import './SummaryPrice.scss'
import classNames from 'classnames'

type SummaryPriceProps = {
    totalPrice: number
    disabled: boolean
    onClick: (value: boolean) => void
    onMouseDown: () => void
}

const SummaryPrice: React.FC<SummaryPriceProps> = ({ totalPrice, disabled, onClick, onMouseDown }) => {
    const price = useEasing({ target: totalPrice, duration: 800, transform: formatCurrency })
    const { t } = useTranslation()

    // ACCESSIBILITY: Include the price in the aria-label to match the visual label
    const priceString = currencyPartsToString(price.current)
    const ariaLabel = `${priceString} ${t('tooltip.open summary')}`

    return (
        <div className="SummaryPrice">
            <span className="price">
                {price.current.currencyPosition === 'before' && (
                    <span
                        className={classNames('currency', {
                            subscript: price.current.currencyScriptType === 'subscript',
                        })}
                    >
                        {price.current.currency}
                    </span>
                )}
                <span className="integer">{price.current.integer}</span>
                <span className="decimal">{price.current.decimal}</span>
                <span className="fraction">{price.current.fraction}</span>
                {price.current.currencyPosition === 'after' && (
                    <span
                        className={classNames('currency', {
                            subscript: price.current.currencyScriptType === 'subscript',
                        })}
                    >
                        {price.current.currency}
                    </span>
                )}
            </span>
            <Button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation() // Don't deselect items
                    onClick(true)
                }}
                type="emphasised"
                onMouseDown={onMouseDown}
                disabled={disabled}
                size="small"
                data-tip={t('tooltip.open summary')}
                aria-label={ariaLabel}
            >
                <span>{t('design.summary')}</span>
                <SSRIcon paths={arrowRight} />
            </Button>
        </div>
    )
}

export default SummaryPrice
