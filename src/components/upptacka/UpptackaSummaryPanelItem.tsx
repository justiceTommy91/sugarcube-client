import React from 'react'
import Checkbox from '@ingka/checkbox'
import Price from '@ingka/price'

import { formatCurrency } from 'utils/convertCurrency'
import type { UpptackaShoppingListItem } from './UpptackaSummaryPanel'

require('./UpptackaSummaryPanelItem.scss')

type UpptackaSummaryPanelItemProps = {
    item: UpptackaShoppingListItem
    onChange: () => void
}

export const UpptackaSummaryPanelItem = ({ item, onChange }: UpptackaSummaryPanelItemProps) => {
    const uniqueId = item.uniqueId.toString()
    const { currency, currencyPosition, currencyScriptType, decimal, fraction, integer } = formatCurrency(
        item.priceNumeral,
    )
    return (
        <label htmlFor={uniqueId} className="UpptackaSummaryPanelItem">
            <img
                className="UpptackaSummaryPanelItem__thumbnail"
                width="92"
                height="92"
                loading="lazy"
                src={`${item.thumbUrl}?f=u`}
                alt={item.name}
            />
            <div className="UpptackaSummaryPanelItem__info">
                <span className="UpptackaSummaryPanelItem__name">{item.name}</span>
                <span className="UpptackaSummaryPanelItem__description">{item.description}</span>
                <Price
                    className="UpptackaSummaryPanelItem__price"
                    currencyLabel={currency}
                    currencyPosition={currencyPosition === 'before' ? 'leading' : 'trailing'}
                    currencySpacing="thin"
                    currencyVerticalAlignment={currencyScriptType === 'superscript' ? 'super' : 'base'}
                    decimalSign={decimal}
                    decimalValue={fraction}
                    integerValue={integer}
                    size="medium"
                />
            </div>
            <Checkbox
                id={uniqueId}
                className="UpptackaSummaryPanelItem__checkbox"
                value="0"
                checked={item.isAddedToShoppingList}
                onChange={onChange}
            />
        </label>
    )
}
