import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import Button from '@ingka/button'
import Image from '@ingka/image'
import Skeleton from '@ingka/skeleton'
import SSRIcon from '@ingka/ssr-icon'
import informationCircle from '@ingka/ssr-icon/paths/information-circle'

import { useAppDispatch, useAppSelector } from 'hooks'
import BouncingBallLoader from 'components/uiElements/BouncingBallLoader'

import { requestLoginPage } from 'models/user/actions'
import { getIsLoggedIn } from 'models/user/selectors'
import { getPAXImportLoading } from 'models/paxDesigns/selectors'

const PAX_LOGIN_CONTEXT = 'pax-import'

// TODO(WEBFS-1046): replace with real data from REX API
const MOCK_DESIGNS = [
    {
        id: '1',
        name: 'PAX',
        subtitle: 'Wardrobe combination, white, 68 7/8x22 7/8x79 1/4 "',
        thumbnailUrl: 'https://www.ikea.com/us/en/images/products/pax-wardrobe-combination-white__1381984_pe962091_s5.jpg',
        vpcCode: 'MOCK1',
    },
    {
        id: '2',
        name: 'PAX',
        subtitle: 'Wardrobe combination, white, 68 7/8x22 7/8x79 1/4 "',
        thumbnailUrl: 'https://www.ikea.com/us/en/images/products/pax-wardrobe-combination-white__1381984_pe962091_s5.jpg',
        vpcCode: 'MOCK2',
    },
]

const SKELETON_COUNT = 2

type MyDesignsProps = {
    onImport: (vpcCode: string) => void
}

export const MyDesigns = ({ onImport }: MyDesignsProps) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const isLoggedIn = useAppSelector(getIsLoggedIn)
    const isImporting = useAppSelector(getPAXImportLoading)
    const [importingId, setImportingId] = useState<string | null>(null)

    const handleImport = (vpcCode: string, id: string) => {
        setImportingId(id)
        onImport(vpcCode)
    }

    // Reset the importing card when the saga finishes
    React.useEffect(() => {
        if (!isImporting) setImportingId(null)
    }, [isImporting])

    // TODO(WEBFS-1046): replace with real loading/error state from paxDesigns Redux slice
    const loading = false
    const error = null

    const renderContent = () => {
        if (!isLoggedIn) {
            return (
                <div className="PAXImportPanel__loginPrompt">
                    <p className="PAXImportPanel__loginPromptText">
                        <SSRIcon paths={informationCircle} />
                        {t('configurableProducts.pax.importPanel.loginPrompt')}
                    </p>
                    <div className="PAXImportPanel__loginCtas">
                        <Button
                            fluid
                            type="secondary"
                            text={t('configurableProducts.pax.importPanel.signUp')}
                            onClick={() => dispatch(requestLoginPage(true, PAX_LOGIN_CONTEXT))}
                        />
                        <Button
                            fluid
                            type="primary"
                            text={t('configurableProducts.pax.importPanel.logIn')}
                            onClick={() => dispatch(requestLoginPage(false, PAX_LOGIN_CONTEXT))}
                        />
                    </div>
                </div>
            )
        }

        if (loading) {
            return (
                <ul className="PAXImportPanel__designsList">
                    {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <li key={i} className="PAXImportPanel__designCard">
                            <Skeleton aria-busy height="160px" width="100%" tagName="div" />
                            <Skeleton aria-busy height="1rem" width="40%" tagName="div" />
                            <Skeleton aria-busy height="0.75rem" width="70%" tagName="div" />
                        </li>
                    ))}
                </ul>
            )
        }

        if (error != null) {
            return <p className="PAXImportPanel__codeError">{error}</p>
        }

        return (
            <ul className="PAXImportPanel__designsList">
                {MOCK_DESIGNS.map((design) => {
                    const isThisCardImporting = importingId === design.id
                    return (
                        <li key={design.id}>
                            <button
                                type="button"
                                className="PAXImportPanel__designCard"
                                onClick={() => handleImport(design.vpcCode, design.id)}
                                disabled={isImporting}
                            >
                                {isThisCardImporting ? (
                                    <div className="PAXImportPanel__designImageLoading">
                                        <BouncingBallLoader
                                            headerText={t('configurableProducts.pax.importLoading.cardTitle')}
                                        />
                                    </div>
                                ) : (
                                    <Image className="PAXImportPanel__designImage" src={design.thumbnailUrl} alt={design.name} />
                                )}
                                <p className="PAXImportPanel__designName">{design.name}</p>
                                <p className="PAXImportPanel__designSubtitle">{design.subtitle}</p>
                            </button>
                        </li>
                    )
                })}
            </ul>
        )
    }

    return (
        <section
            className={classNames('PAXImportPanel__section', { 'PAXImportPanel__section--loggedOut': !isLoggedIn })}
        >
            <h3 className="PAXImportPanel__sectionHeading">{t('configurableProducts.pax.importPanel.myDesigns')}</h3>
            {renderContent()}
        </section>
    )
}
