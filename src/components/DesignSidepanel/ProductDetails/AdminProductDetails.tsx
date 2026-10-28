/* eslint-disable i18next/no-literal-string */
import React from 'react'
import { useAppSelector } from 'hooks'

import { getAreDebugFeaturesEnabled } from 'models/user/selectors'
import { getDebugSettings } from 'models/admin/selectors'
import { ProductData } from 'models/furniture'

import './AdminProductDetails.scss'

const AdminProductDetails = ({ productData }: { productData: ProductData }) => {
    const areDebugFeaturesEnabled = useAppSelector(getAreDebugFeaturesEnabled)
    const debugSettings = useAppSelector(getDebugSettings)
    const showAdminProductDetails = areDebugFeaturesEnabled && debugSettings.showProductAdminData

    if (!showAdminProductDetails) {
        return null
    }

    return (
        <div className="AdminProductDetails">
            <ul>
                <li>Geo Id: {productData.id}</li>
                <li>Local item number: {productData.localItemNumber}</li>
                <li>Global product id: {productData.globalProductId}</li>
                <li>QA Status: {productData.qaStatus}</li>
                <li>Stacks: {productData.stacks.toString()}</li>
                <li>RenderType: {productData.renderType}</li>
                <li>Sales End Date (Global): {productData.salesEndDateGlobal || 'NONE'}</li>
                <li>
                    View global products in:
                    <a href={productData.globalProductAdminUrl} target="_blank" rel="noopener noreferrer">
                        Jiji
                    </a>
                </li>
                <li>
                    View local products in:
                    <a href={productData.localProductStudioAdminUrl} target="_blank" rel="noopener noreferrer">
                        Studio
                    </a>
                    <a href={productData.localProductAdminUrl} target="_blank" rel="noopener noreferrer">
                        Jiji
                    </a>
                </li>
            </ul>
        </div>
    )
}

export default AdminProductDetails
