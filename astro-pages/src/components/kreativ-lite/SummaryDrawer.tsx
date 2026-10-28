import React from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@ingka/button'
import InlineMessage from '@ingka/inline-message'
import Price from '@ingka/price'
import shoppingBagAdd from '@ingka/ssr-icon/paths/shopping-bag-add'
import lockOpen from '@ingka/ssr-icon/paths/lock-open'
import { formatCurrency } from '@utils/convertCurrency'
import { getShoppingCartUrl } from 'utils/buildUrls'
import { getRegion } from '@lib/location-selectors'
import { useAddToBag } from '@astro-hooks/useAddToBag'
import { useAddAllToBag } from '@astro-hooks/useAddAllToBag'
import { BottomSheet } from './BottomSheet'
import type { FurnitureSearchItem } from './hooks/useKreativLiteSearch'
import { useRoomProducts } from './hooks/useRoomProducts'
import './SummaryDrawer.scss'

interface SummaryDrawerProps {
    open: boolean
    onClose: () => void
    onOpenPromotion: () => void
}

const ItemPrice = ({ item }: { item: FurnitureSearchItem }) => {
    if (item.priceNumeral == null) return null
    const { integer, fraction, decimal, currency, currencyPosition, currencyScriptType } = formatCurrency(
        Number(item.priceNumeral),
    )
    return (
        <Price
            size="medium"
            integerValue={integer}
            decimalValue={fraction}
            decimalSign={decimal}
            currencyLabel={currency}
            currencyPosition={currencyPosition === 'before' ? 'leading' : 'trailing'}
            currencySpacing="thin"
            currencyVerticalAlignment={currencyScriptType === 'superscript' ? 'super' : 'base'}
        />
    )
}

export const SummaryDrawer = ({ open, onClose, onOpenPromotion }: SummaryDrawerProps) => {
    const { t } = useTranslation()
    const roomProducts = useRoomProducts()
    const showBagAction = {
        text: t('design.show'),
        onAction: () => window.open(getShoppingCartUrl(getRegion()), '_blank'),
    }
    const { addToBag } = useAddToBag(showBagAction)
    const { addAllToBag, isPending: isAddingAll } = useAddAllToBag(showBagAction)

    const totalPrice = roomProducts.reduce((sum, item) => sum + Number(item.priceNumeral ?? 0), 0)

    const totalFormatted = formatCurrency(totalPrice)

    const footer = (
        <div className="SummaryDrawer__footer">
            <Button
                type="emphasised"
                size="medium"
                text={t('design.add all to shopping bag')}
                onClick={() => addAllToBag(roomProducts)}
                disabled={roomProducts.length === 0 || isAddingAll}
                loading={isAddingAll}
                fluid
            />
        </div>
    )

    return (
        <BottomSheet open={open} onClose={onClose} dismissMode="dismiss" overlay elevated footer={footer}>
            {/* Header and product list BOTH scroll together — header is inside children, not BottomSheet header prop */}
            <div className="SummaryDrawer__content">
                <InlineMessage
                    className="SummaryDrawer__promotion"
                    // eslint-disable-next-line i18next/no-literal-string
                    variant="positive"
                    dismissable
                    ssrIcon={lockOpen}
                    title={t('design.kreativLite.summary.promotion title')}
                    body={t('design.kreativLite.summary.promotion body')}
                    actions={[
                        {
                            text: t('design.kreativLite.summary.promotion details'),
                            // eslint-disable-next-line i18next/no-literal-string
                            size: 'small',
                            onClick: () => {
                                onClose()
                                onOpenPromotion()
                            },
                        },
                    ]}
                />
                <div className="SummaryDrawer__header">
                    <h2 className="SummaryDrawer__title">{t('designSummary.shop this design')}</h2>
                    <Price
                        size="medium"
                        integerValue={totalFormatted.integer}
                        decimalValue={totalFormatted.fraction}
                        decimalSign={totalFormatted.decimal}
                        currencyLabel={totalFormatted.currency}
                        currencyPosition={totalFormatted.currencyPosition === 'before' ? 'leading' : 'trailing'}
                        currencySpacing="thin"
                        currencyVerticalAlignment={
                            totalFormatted.currencyScriptType === 'superscript' ? 'super' : 'base'
                        }
                    />
                </div>

                <ul className="SummaryDrawer__list">
                    {roomProducts.map((item) => (
                        <li key={item.sceneItemId} className="SummaryDrawer__item">
                            {item.thumbUrl && <img src={item.thumbUrl} alt="" className="SummaryDrawer__thumb" />}
                            <div className="SummaryDrawer__details">
                                <span className="SummaryDrawer__name">{item.name}</span>
                                {item.description && (
                                    <span className="SummaryDrawer__description">{item.description}</span>
                                )}
                                <div className="SummaryDrawer__row">
                                    <ItemPrice item={item} />
                                    <Button
                                        type="emphasised"
                                        size="small"
                                        iconOnly
                                        ssrIcon={shoppingBagAdd}
                                        aria-label={t('toasts.added to bag', { name: item.name })}
                                        onClick={() =>
                                            addToBag({
                                                product: {
                                                    localItemNumber: item.localItemNumber ?? '',
                                                    name: item.name,
                                                    priceNumeral: item.priceNumeral ?? 0,
                                                },
                                            })
                                        }
                                        disabled={!item.localItemNumber}
                                    />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </BottomSheet>
    )
}
