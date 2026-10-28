import { AvailabilityStatus, OUT_OF_STOCK } from 'models/furniture/constants'
import type { APIProduct, ProductAvailability, ProductData, Socket } from 'models/furniture'
import type { FurnitureItemParameters } from 'Renderer/geomviewer/geom_types'
import { ART_ITEM, FURNITURE_ITEM, ART_ITEM_GEOMETRY_TYPE, RenderType } from 'constants/renderItemTypes'

// Availability
export const HOME_DELIVERY = 'HOME_DELIVERY'
export const CASH_AND_CARRY = 'CASH_AND_CARRY'
export type AvailabilityType = typeof HOME_DELIVERY | typeof CASH_AND_CARRY

type AvailabilityTypeSearch = Array<{
    type2: AvailabilityType
    status: AvailabilityStatus
    text?: string
    prefix?: string
    store?: string
    suffix?: string
}>

interface AvailabilityTypeCIAM {
    availableForHomeDelivery: boolean | undefined
    availableForCashCarry: boolean | undefined
    availableForClickCollect: boolean | undefined
    buyingOption: {
        homeDelivery: {
            availability: null | {
                probability: {
                    thisDay: {
                        messageType: AvailabilityStatus
                    }
                }
            }
        }
        cashCarry: {
            availability: null | {
                probability: {
                    thisDay: {
                        messageType: AvailabilityStatus
                    }
                }
                // quantity: 123,
                restocks: [
                    {
                        // type: DELIVERY,
                        // quantity: 135,
                        // reliability: HIGH,
                    },
                ]
            }
        }
    }
}

export function makeDefaultAvailability(): ProductAvailability {
    return {
        online: null,
        store: null,
        pickup: null,
    }
}

export function makeProductAvailability(rawAvailability: AvailabilityTypeSearch | AvailabilityTypeCIAM) {
    const availability = makeDefaultAvailability()

    if (!rawAvailability) {
        return availability
    }

    if (Array.isArray(rawAvailability)) {
        rawAvailability.forEach((a) => {
            if (a.type2 === HOME_DELIVERY) {
                availability.online = a.status
            } else if (a.type2 === CASH_AND_CARRY) {
                availability.store = a.status
            }
        })
    } else {
        if (rawAvailability.availableForHomeDelivery !== undefined) {
            if (rawAvailability.buyingOption.homeDelivery?.availability) {
                availability.online =
                    rawAvailability.buyingOption.homeDelivery.availability?.probability?.thisDay?.messageType || null
            } else {
                availability.online = OUT_OF_STOCK
            }
        }
        if (rawAvailability.availableForCashCarry !== undefined) {
            if (rawAvailability.buyingOption.cashCarry?.availability) {
                availability.store =
                    rawAvailability.buyingOption.cashCarry.availability?.probability?.thisDay?.messageType || null
            } else {
                availability.store = OUT_OF_STOCK
            }
        }
        if (rawAvailability.availableForClickCollect !== undefined) {
            availability.pickup = rawAvailability.availableForClickCollect
        }
    }

    return availability
}

export const renderTypeFromGeometryTypes = (geometryTypes: string[]): RenderType =>
    geometryTypes.includes(ART_ITEM_GEOMETRY_TYPE) ? ART_ITEM : FURNITURE_ITEM

function hasMatrixModelData(placeablesData: FurnitureItemParameters['placeables']): boolean {
    return !!placeablesData?.anchors.some((e) => e.matrixModel !== undefined)
}

export function isItemSnapRotable(placeablesData?: FurnitureItemParameters['placeables']): boolean {
    if (!placeablesData || Object.keys(placeablesData).length === 0) {
        return false
    }

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    return (
        hasMatrixModelData(placeablesData) &&
        placeablesData.anchors.some((e) => !!e.matrixModel) &&
        placeablesData.anchors.some((e) => e.matrixModel!.length === 4) &&
        placeablesData.anchors.some((e) => e.matrixModel![0].length === 4) &&
        placeablesData.anchors.some((e) => e.matrixModel![1].length === 4) &&
        placeablesData.anchors.some((e) => e.matrixModel![2].length === 4) &&
        placeablesData.anchors.some((e) => e.matrixModel![3].length === 4)
    )
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
}

export function findSocketProductGeometry(socketName: string, itemProduct: APIProduct | ProductData,
                                          parentProduct: APIProduct | ProductData, parentSockets: Socket[]) {
    const socket = parentSockets.find((s) => s.name === socketName)
    if (!socket) {
        return undefined
    }

    const dynamicGeom = itemProduct.productGeometries.dynamic?.find((geom) => {
        const socketType = geom.socketType ?? geom.rules.socketType
        const socketRules =
            socketType?.category === socket.type.category &&
            socketType?.size === socket.type.size

        const parentRules = geom.rules.parentHasMetadata
            ? Object.entries(geom.rules.parentHasMetadata).every(
                ([key, value]) => !value ||
                parentProduct.combinablesMetadata?.[key as keyof typeof parentProduct.combinablesMetadata] === value
            )
            : true

        return socketRules && parentRules && geom.geometry
    })

    return dynamicGeom?.geometry || itemProduct.productGeometries.simple
}