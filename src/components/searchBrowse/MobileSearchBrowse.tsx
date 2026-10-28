import React from 'react'
import { useTranslation } from 'react-i18next'
import paintbrush from '@ingka/ssr-icon/paths/paintbrush'
import SSRIcon from '@ingka/ssr-icon'

import { SearchBrowseItem } from 'containers/searchBrowse/types'
import classNames from 'classnames'

import Pill from '@ingka/pill'
import mobileHandover from '@ingka/ssr-icon/paths/mobile-handover'
import { trackGaEvent as trackGaEventAction } from 'models/tracking/actions'
import {
    APP_STORE_SOURCE_MOBILE_SEARCH_BROWSE,
    GA_ACTION_SEARCH_BROWSE_GET_APP,
    GA_LABEL_SEARCH_BROWSE_CONTEXT,
} from 'models/tracking/constants'
import { getAppStoreUrl } from 'utils/buildUrls'

import { ProductData } from 'models/furniture'
import { navigateExternal } from 'models/location/helpers'
import { click } from 'utils/tracker'
import { CompositionCard } from './CompositionCard'
import { OwnSpaceCard } from './OwnSpaceCard'

import './styles.scss'
import { SEARCH_BROWSE_ITEMS } from './constants'

const appStoreLink = getAppStoreUrl({ source: APP_STORE_SOURCE_MOBILE_SEARCH_BROWSE })

interface MobileSearchBrowseProps {
    trackGaEvent: typeof trackGaEventAction
    item?: SearchBrowseItem
    productLocalItemNo: string
    placedProductData: ProductData
    loading: boolean
}

const MobileSearchBrowse = (props: MobileSearchBrowseProps) => {
    const { t } = useTranslation()
    const { trackGaEvent, item, productLocalItemNo, placedProductData, loading } = props

    const showrooms = item?.showrooms

    const onGoToIkeaApp = async () => {
        navigateExternal(appStoreLink, {
            before: async () => {
                // FIXME: ga tracking calls do not return a promise and cannot be awaited, so they might be cancelled during navigation.
                trackGaEvent({
                    action: GA_ACTION_SEARCH_BROWSE_GET_APP,
                    label: `${GA_LABEL_SEARCH_BROWSE_CONTEXT}|${productLocalItemNo || null}`,
                })
                await click('SearchBrowse.GetIkeaApp', {
                    ProductLocalItemNo: productLocalItemNo || null,
                    ProductId: placedProductData?.id || null,
                    Context: GA_LABEL_SEARCH_BROWSE_CONTEXT,
                })
            },
        })
    }

    const title = item?.mobileHeader
        ? t(`searchBrowse.mobileWeb.${item?.mobileHeader}`)
        : t('searchBrowse.see in kreativ space', {
              category: t('searchBrowse.category.items'),
          })

    return (
        <div className="SearchBrowse">
            <div className="brandName">
                <SSRIcon paths={paintbrush} />
                <span className="label">{t('design.ikea kreativ')}</span>
            </div>

            <div className={classNames('mobileCard', { loading })} onClick={onGoToIkeaApp}>
                {!loading && (
                    <>
                        <div className="wrapper">
                            <div className={classNames('parent', { isMobile: true })}>
                                {showrooms?.slice(1, 4).map((room, index) => (
                                    <CompositionCard
                                        className={`card card${index + 1} mobileCardImage`}
                                        room={room}
                                        disabled
                                    />
                                ))}
                                <OwnSpaceCard openAppDownload={onGoToIkeaApp} disabled />
                            </div>
                            <div className="title">{title}</div>
                            <div className="subtitle">
                                {t(
                                    `searchBrowse.mobileWeb.${
                                        item?.mobileSubHeader || SEARCH_BROWSE_ITEMS[0].mobileSubHeader
                                    }`,
                                )}
                            </div>
                        </div>
                        <Pill
                            label={t('searchBrowse.go to ikea app')}
                            trailingIcon={mobileHandover}
                            className="goToApp"
                        />
                    </>
                )}
            </div>
        </div>
    )
}

export default MobileSearchBrowse
