import React, { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import Button from '@ingka/button'
import InlineMessage from '@ingka/inline-message'
import Price from '@ingka/price'
import SSRIcon from '@ingka/ssr-icon'
import cross from '@ingka/ssr-icon/paths/cross'
import documentPencil from '@ingka/ssr-icon/paths/document-pencil'
import informationCircle from '@ingka/ssr-icon/paths/information-circle'

import { useAppDispatch, useAppSelector } from 'hooks'
import type { RenderItemComplete } from 'models/compositions'
import * as compositionSelectors from 'models/compositions/selectors'
import * as sessionStorageSelectors from 'models/sessionStorage/selectors'
import * as sessionStorageActions from 'models/sessionStorage/actions'
import { upptackaActions } from 'models/upptacka/slice'
import * as upptackaSelectors from 'models/upptacka/selectors'
import { formatCurrency } from 'utils/convertCurrency'

import { trackGoogleAnalytics } from 'utils/tracker'
import {
    ACTION_UPPTACKA_ADD_TO_SHOPPING_LIST,
    ACTION_UPPTACKA_CLOSE_PANEL,
    ACTION_UPPTACKA_TOGGLE_ALL_ITEMS,
    GA_ACTION_UPPTACKA_ADD_TO_SHOPPING_LIST,
    GA_ACTION_UPPTACKA_CLOSE_PANEL,
    GA_ACTION_UPPTACKA_TOGGLE_ALL_ITEMS,
    GA_CATEGORY_DYH_SUGARCUBE,
    LABEL_UPPTACKA_CLOSE_SUMMARY_PANEL,
    LABEL_UPPTACKA_DESELECT_ALL_ITEMS,
    LABEL_UPPTACKA_SELECT_ALL_ITEMS,
} from 'models/tracking/constants'
import { useTracker } from 'apps/TrackingBoundary'
import { UpptackaQRSave } from './UpptackaQRSave'
import { UpptackaSummaryPanelItem } from './UpptackaSummaryPanelItem'
import {
    deselectAllItemsInList,
    getAllItemsAreSelected,
    getConcatenatedLocalItemNumbers,
    getShoppingListTotal,
    selectAllItemsInList,
    setShoppingListItems,
    sortShoppingList,
    toggleItemInList,
} from './utils'

require('./UpptackaSummaryPanel.scss')

export type UpptackaShoppingListItem = RenderItemComplete & {
    isAddedToShoppingList: boolean
}
export type ShoppingListState = UpptackaShoppingListItem[]

type UpptackaShoppingListAction =
    | { type: 'SET_ITEMS'; items: RenderItemComplete[] }
    | { type: 'TOGGLE_ITEM'; index: number }
    | { type: 'DESELECT_ALL' }
    | { type: 'SELECT_ALL' }

const shoppingListReducer = (
    shoppingList: ShoppingListState,
    action: UpptackaShoppingListAction,
): ShoppingListState => {
    switch (action.type) {
        case 'SET_ITEMS':
            return sortShoppingList(setShoppingListItems(shoppingList, action.items))
        case 'TOGGLE_ITEM':
            return toggleItemInList(shoppingList, action.index)
        case 'DESELECT_ALL':
            return deselectAllItemsInList(shoppingList)
        case 'SELECT_ALL':
            return selectAllItemsInList(shoppingList)
        default:
            throw new Error()
    }
}
export const UpptackaSummaryPanel = () => {
    const [shoppingList, dispatchShoppingListReducer] = useReducer(shoppingListReducer, [])
    const dispatchRedux = useAppDispatch()
    const { t } = useTranslation()
    const track = useTracker()

    const hasSeenFinalPriceMessage = useAppSelector(sessionStorageSelectors.getSeenFinalPriceMessage)
    const addedToRoomItems = useAppSelector(
        compositionSelectors.getSelectedCompositionShoppableProductData,
    ) as RenderItemComplete[]

    useEffect(() => {
        dispatchShoppingListReducer({ type: 'SET_ITEMS', items: addedToRoomItems })
    }, [addedToRoomItems])

    const isVisible = useAppSelector((state) => upptackaSelectors.getShowUpptackaSummary(state))
    const shoppingListTotal = getShoppingListTotal(shoppingList)
    const allItemsAreSelected = getAllItemsAreSelected(shoppingList)
    const concatenatedLocalItemNumbers = getConcatenatedLocalItemNumbers(shoppingList)
    const { currency, currencyPosition, currencyScriptType, decimal, fraction, integer } =
        formatCurrency(shoppingListTotal)

    return (
        <>
            <button
                className={classNames('UpptackaSummaryPanelBackdrop', { isVisible })}
                onClick={() => {
                    trackGoogleAnalytics({
                        action: GA_ACTION_UPPTACKA_CLOSE_PANEL,
                        category: GA_CATEGORY_DYH_SUGARCUBE,
                        label: LABEL_UPPTACKA_CLOSE_SUMMARY_PANEL,
                    })
                    track.click({
                        target: 'upptacka.closeSummaryPanelBackdropButton',
                        intendedAction: ACTION_UPPTACKA_CLOSE_PANEL,
                        attributes: {
                            type: LABEL_UPPTACKA_CLOSE_SUMMARY_PANEL,
                        },
                    })
                    dispatchRedux(upptackaActions.setShowUpptackaSummary(false))
                }}
                aria-label={t('aria.close')}
            />
            <div className={classNames('UpptackaSummaryPanel', { isVisible })}>
                <div className="UpptackaSummaryPanel__left-container">
                    <UpptackaQRSave />
                </div>
                <div className="UpptackaSummaryPanel__right-container">
                    <div className="UpptackaSummaryPanel__right-container-content">
                        <Button
                            className="UpptackaSummaryPanel__close"
                            iconOnly
                            ssrIcon={cross}
                            type="tertiary"
                            onClick={() => {
                                trackGoogleAnalytics({
                                    action: GA_ACTION_UPPTACKA_CLOSE_PANEL,
                                    category: GA_CATEGORY_DYH_SUGARCUBE,
                                    label: LABEL_UPPTACKA_CLOSE_SUMMARY_PANEL,
                                })
                                track.click({
                                    target: 'upptacka.closeSummaryPanelButton',
                                    intendedAction: ACTION_UPPTACKA_CLOSE_PANEL,
                                    attributes: {
                                        type: 'summary',
                                    },
                                })
                                dispatchRedux(upptackaActions.setShowUpptackaSummary(false))
                            }}
                            text={t('aria.close')}
                        />
                        <h4 className="UpptackaSummaryPanel__right-container-title">{t('upptacka.summary title')}</h4>
                        <Button
                            className="UpptackaSummaryPanel__mass-select-button"
                            text={
                                allItemsAreSelected
                                    ? t('upptacka.deselect all button')
                                    : t('upptacka.select all button')
                            }
                            type="tertiary"
                            onClick={() => {
                                trackGoogleAnalytics({
                                    action: GA_ACTION_UPPTACKA_TOGGLE_ALL_ITEMS,
                                    category: GA_CATEGORY_DYH_SUGARCUBE,
                                    label: allItemsAreSelected
                                        ? LABEL_UPPTACKA_DESELECT_ALL_ITEMS
                                        : LABEL_UPPTACKA_SELECT_ALL_ITEMS,
                                })
                                track.click({
                                    target: 'upptacka.summaryPanelToggelAllItemsButton',
                                    intendedAction: ACTION_UPPTACKA_TOGGLE_ALL_ITEMS,
                                    attributes: {
                                        type: allItemsAreSelected
                                            ? LABEL_UPPTACKA_DESELECT_ALL_ITEMS
                                            : LABEL_UPPTACKA_SELECT_ALL_ITEMS,
                                    },
                                })
                                dispatchShoppingListReducer({
                                    type: allItemsAreSelected ? 'DESELECT_ALL' : 'SELECT_ALL',
                                })
                            }}
                        />
                        {!hasSeenFinalPriceMessage && (
                            <div className="disclaimer">
                                <InlineMessage
                                    title={t('design.final pricing')}
                                    body={t('design.review price')}
                                    dismissable
                                    ssrIcon={informationCircle}
                                    collapseWhenClosed
                                    onDismissClick={() =>
                                        dispatchRedux(sessionStorageActions.dismissFinalPriceMessage())
                                    }
                                />
                            </div>
                        )}
                        <div className="UpptackaSummaryPanel__items-container">
                            {sortShoppingList(shoppingList).map((item, index) => (
                                <UpptackaSummaryPanelItem
                                    item={item}
                                    onChange={() => dispatchShoppingListReducer({ type: 'TOGGLE_ITEM', index })}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="UpptackaSummaryPanel__right-container-footer">
                        <Button
                            onClick={() => {
                                trackGoogleAnalytics({
                                    action: GA_ACTION_UPPTACKA_ADD_TO_SHOPPING_LIST,
                                    category: GA_CATEGORY_DYH_SUGARCUBE,
                                    label: concatenatedLocalItemNumbers,
                                })
                                track.click({
                                    target: 'upptacka.summaryPanelAddToShoppingListButton',
                                    intendedAction: ACTION_UPPTACKA_ADD_TO_SHOPPING_LIST,
                                    attributes: {
                                        productIds: concatenatedLocalItemNumbers,
                                    },
                                })
                                window.parent.postMessage(`upptacka_addproducts=${concatenatedLocalItemNumbers}`, '*')
                            }}
                            className="UpptackaSummaryPanel__cta-button"
                            type="emphasised"
                            fluid
                            disabled={shoppingListTotal === 0}
                        >
                            <SSRIcon paths={documentPencil} />
                            {t('upptacka.summary cta')}
                            <Price
                                className="UpptackaSummaryPanel__total-price"
                                currencyLabel={currency}
                                currencyPosition={currencyPosition === 'before' ? 'leading' : 'trailing'}
                                currencySpacing="thin"
                                currencyVerticalAlignment={currencyScriptType === 'superscript' ? 'super' : 'base'}
                                decimalSign={decimal}
                                decimalValue={fraction}
                                integerValue={integer}
                                size="medium"
                            />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
