import { shape, number, string, arrayOf, bool, objectOf, oneOfType, oneOf, any } from 'prop-types'

import {
    type QAStatus,
    QA_STATUS_BAD,
    QA_STATUS_GOOD,
    QA_STATUS_PENDING,
    SMARTA_STATUS_PENDING,
    SMARTA_STATUS_FAILED,
    SMARTA_STATUS_SUCCESS,
    SmartaPlacementStatus,
} from 'constants/stateTypes'
import { ART_ITEM, FURNITURE_ITEM, type RenderType } from 'constants/renderItemTypes'
import type { InferPropType, InferPropTypeShape } from 'utils/inferPropType'
import type { ArtFrameProfile, Color, Point2D, Quat4D } from 'Renderer/geomviewer'

import type { ArtFrameData, CustomerLocation, ProductAvailability, ProductData, ProductGeometry, Socket, SocketSet } from './furniture'
import {
    type AvailabilityStatus,
    HIGH_IN_STOCK,
    LOW_IN_STOCK,
    MEDIUM_IN_STOCK,
    OUT_OF_STOCK,
} from './furniture/constants'
import type {
    ArtProductData,
    ArtRenderItemComplete,
    CompositionDataItem,
    Corners,
    FurnitureRenderItemComplete,
    RenderItem,
    RenderItemComplete,
    SavedProperties,
} from './compositions'

const colorType: InferPropType<Color> = shape({
    name: string.isRequired,
    hex: string.isRequired,
    material: string.isRequired,
    albedo: oneOfType([string.isRequired, number.isRequired]).isRequired,
})

const matrixType = arrayOf(arrayOf(number.isRequired).isRequired)

const circleType = shape({
    type: oneOf(['circle'] as const).isRequired,
    radius: number.isRequired,
})

const polygonType = shape({
    type: oneOf(['polygon'] as const).isRequired,
    vertices: matrixType.isRequired,
})

const shapeType = oneOfType([circleType.isRequired, polygonType.isRequired])

const availabilityStatusType: InferPropType<AvailabilityStatus> = oneOf([
    HIGH_IN_STOCK,
    MEDIUM_IN_STOCK,
    LOW_IN_STOCK,
    OUT_OF_STOCK,
])

const qaStatusType: InferPropType<QAStatus> = oneOf([QA_STATUS_GOOD, QA_STATUS_BAD, QA_STATUS_PENDING])

const renderType: InferPropType<RenderType> = oneOf([ART_ITEM, FURNITURE_ITEM])

const smartaPlacementType: InferPropType<SmartaPlacementStatus> = oneOf([
    SMARTA_STATUS_PENDING,
    SMARTA_STATUS_SUCCESS,
    SMARTA_STATUS_FAILED,
])

const productAvailabilityType: InferPropType<ProductAvailability> = shape({
    online: availabilityStatusType,
    store: availabilityStatusType,
    pickup: bool,
})

const socket: InferPropType<Socket> = shape({
    name: string.isRequired,
    defaultProductId: number.isRequired,
    headingI: number.isRequired,
    headingJ: number.isRequired,
    headingK: number.isRequired,
    headingW: number.isRequired,
    isCartIgnored: bool.isRequired,
    isNullable: bool.isRequired,
    linkGroupName: string.isRequired,
    type: shape({ size: string.isRequired, category: string.isRequired }).isRequired,
    x: number.isRequired,
    y: number.isRequired,
    z: number.isRequired,
})

const socketSet: InferPropType<SocketSet> = shape({
    name: string.isRequired,
    sockets: arrayOf(socket.isRequired).isRequired,
})

const productGeometry: InferPropType<ProductGeometry> = shape({
    id: number.isRequired,
    modelUrl: string.isRequired,
    minX: number.isRequired,
    minY: number.isRequired,
    minZ: number.isRequired,
    maxX: number.isRequired,
    maxY: number.isRequired,
    maxZ: number.isRequired,
    scale: number.isRequired,
    rotX: number.isRequired,
}) 

export const productDataShape: InferPropTypeShape<ProductData> = {
    id: number.isRequired,
    region: string.isRequired,
    name: string.isRequired,
    thumbUrl: string.isRequired,
    collections: arrayOf(string.isRequired).isRequired,
    rootCategories: arrayOf(string.isRequired),
    categories: arrayOf(string.isRequired),
    subCategoryIds: arrayOf(string.isRequired),
    subCategories: arrayOf(string.isRequired).isRequired,
    ecommerceUrl: string,
    globalProductId: string.isRequired,
    price: string.isRequired,
    priceNumeral: number.isRequired,
    typeName: string,
    rating: string,
    ratingCount: number,
    description: string,
    validDesign: string,
    imageUrls: arrayOf(string.isRequired),
    qaStatus: qaStatusType.isRequired,
    availableInRegion: bool.isRequired,
    uncompressedModelSize: number.isRequired,
    localItemNumber: string.isRequired,
    recommended: arrayOf(number.isRequired).isRequired,
    subCatalogs: arrayOf(string.isRequired),
    swappableItems: arrayOf(number.isRequired),
    renderType: renderType.isRequired,
    requiresWallContact: bool,

    globalProductAdminUrl: string,
    localProductAdminUrl: string,
    localProductStudioAdminUrl: string,
    salesEndDateGlobal: string,
    variants: number,
    variantsSelected: arrayOf(number.isRequired),
    isSupportedAutodecorate: bool.isRequired,

    stacks: bool.isRequired,
    isSnapRotable: bool.isRequired,
    hidden: bool.isRequired,
    source: string,
    artSource: string,
    availability: productAvailabilityType.isRequired,
    mirrorType: number,
    geometryTypes: arrayOf(string.isRequired).isRequired,
    entities: string.isRequired,
    smartaClass: string.isRequired,
    isCombinableChild: bool.isRequired,
    placeables: shape({
        version: number.isRequired,
        combinations: arrayOf(arrayOf(number.isRequired).isRequired).isRequired,
        anchors: arrayOf(
            shape({
                category: string.isRequired,
                constraint: string,
                position: arrayOf(number.isRequired),
                matrix_model: arrayOf(number.isRequired),
            }).isRequired,
        ).isRequired,
    }).isRequired,
    stackables: arrayOf(
        shape({
            id: string.isRequired,
            transform: matrixType.isRequired,
            parameters: shapeType.isRequired,
        }).isRequired,
    ).isRequired,
    metadata: shape({
        combinables: shape({
            selfMeta: shape({
                size: string,
                variant: string,
                category: string,
            }),
        }),
        placeables: shape({
            version: number.isRequired,
            combinations: matrixType.isRequired,
            anchors: arrayOf(
                shape({
                    category: oneOf(['floor', 'wall'] as const).isRequired,
                    constraint: string,
                    position: arrayOf(number.isRequired),
                    matrix_model: arrayOf(number.isRequired)
                }).isRequired
            ).isRequired
        })
    }),
    productGeometries: shape({
        simple: productGeometry,
        productMaterials: arrayOf(
            shape({
                id: string.isRequired,
                name: string.isRequired,
                url: string.isRequired
            }).isRequired
        ),
        dynamic: arrayOf(
            shape({
                rules: shape({
                    socketType: shape({
                        size: string.isRequired,
                        category: string.isRequired
                    }),
                    parentHasMetadata: shape({
                        size: string.isRequired,
                        bedspreadType: string.isRequired
                    }).isRequired
                }).isRequired,
                geometry: productGeometry.isRequired,
                socketType: shape({
                    size: string.isRequired,
                    category: string.isRequired
                })
            }).isRequired
        )
    }).isRequired,
    combinablesMetadata: shape({
        size: string.isRequired,
        bedspreadType: string
    }),
    combinablesSocketSet: socketSet,
    materialUrl: string,
    min: shape({ x: number.isRequired, y: number.isRequired,  z: number.isRequired }),
    max: shape({ x: number.isRequired, y: number.isRequired,  z: number.isRequired })
}

const savedPropertiesType: InferPropTypeShape<SavedProperties> = {
    erasedSegments: arrayOf(number.isRequired),
    wallPaint: objectOf(oneOfType([string, number])),
    wallPaintInpaint: objectOf(oneOfType([string, number])),
    lastSavedOn: string,
    clientVersion: string,
    clientLibVersions: string,
    camera: objectOf(oneOfType([string, number])),
    features: objectOf(number),
}

const point2DType: InferPropType<Point2D> = arrayOf(number.isRequired)

const quad4DType: InferPropType<Quat4D> = arrayOf(number.isRequired)

const cornersType: InferPropType<Corners> = arrayOf(point2DType.isRequired)

const renderItemShape: InferPropTypeShape<RenderItem> = {
    id: number.isRequired,
    uniqueId: number.isRequired,
    x: number,
    y: number,
    z: number,
    corners: cornersType.isRequired,
    heading: number.isRequired,
    headingI: number,
    headingJ: number,
    headingK: number,
    mirrorOptionEnabled: bool.isRequired,
    stackedPlane: string,
    combinablePlacement: objectOf(any),
    metrics: objectOf(any),
    readyAndRendered: bool.isRequired,
    placingBehavior: string,
    swappedOutPlacingBehavior: string,
    parentId: number,
    parentIdOrSurface: string,
    parentAttachment: number,
    additionalContacts: arrayOf(any),
    placeables: any,
    anchorCombinationIndex: any,
    p3: shape({
        x: number.isRequired,
        y: number.isRequired,
        z: number.isRequired,
    }),
    placement: shape({
        kind: oneOf(['location3', 'location3Legacy', 'location2Legacy'] as const).isRequired,
        location3: shape({
            localPos: shape({
                x: number.isRequired,
                y: number.isRequired,
                z: number.isRequired,
            }).isRequired,
            bindTo: string.isRequired,
        }).isRequired,
        location2: point2DType,
        rotation: quad4DType.isRequired,
        parentId: string,
        heading: number,
    }),
    smartaPlacement: objectOf(any),
    rawPlacement3d: shape({
        location3: shape({
            localPos: shape({
                x: number.isRequired,
                y: number.isRequired,
                z: number.isRequired,
            }).isRequired,
            bindTo: string.isRequired,
        }).isRequired,
        rotation: quad4DType,
    }),
    pin: shape({
        x: number.isRequired,
        y: number.isRequired,
        hidePin: bool.isRequired,
        itemIsHidden: bool.isRequired,
    }).isRequired,
    swapChainPosition: point2DType,
    isAddedFromDuplicate: bool,
    smartaPlacementState: smartaPlacementType,
    assemblyFlip: string,
    isLoading: bool,
    socket: string,
    socketSet: string,
    collisionState: arrayOf(string.isRequired),
}

export const dimensionsType = shape({
    width: number.isRequired,
    height: number.isRequired,
})

export const sceneType = shape({
    sceneId: string.isRequired,
    jobId: string,
    name: string.isRequired,
    depthUrl: string,
    creationDate: string.isRequired,
    defaultX: number.isRequired,
    defaultY: number.isRequired,
    wid: number.isRequired,
    thumbUrl: string,
    metaData: shape({}),
    manifest: shape({
        pano_0: string.isRequired,
        depth_occlusion_0: string,
        foreground_0: string,
        plane_orientation_0: shape({}).isRequired,
        normals_segmentation_0: string.isRequired,
        lighting: shape({}),
        extra: shape({
            useFloorMask: bool,
        }),
    }),
    hasFloor: bool.isRequired,
    hasWall: bool.isRequired,
    hasWallPaint: bool.isRequired,
    supportsShadows: bool.isRequired,
    supportsOcclusion: bool.isRequired,
    supportsForegroundOcclusion: bool.isRequired,
    supportsDepthOcclusion: bool.isRequired,
    isStock: bool.isRequired,
    roomType: string,
    adminUrl: string,
})

export const scenePlaneType = shape({
    planeIdx: number.isRequired,
    class: string.isRequired,
})

export const scenePlanesType = arrayOf(scenePlaneType)

export const rgbColorType = arrayOf(number)
export const wallColorsType = arrayOf(rgbColorType)

export const wallMarkerType = arrayOf(oneOfType([number, string]))
export const wallMarkersType = arrayOf(wallMarkerType)

const artFrameProfileType: InferPropType<ArtFrameProfile> = shape({
    textureName: string.isRequired,
    albedo: oneOfType([number.isRequired, string.isRequired]).isRequired,
    profile: arrayOf(point2DType.isRequired).isRequired,
    scaleU: number.isRequired,
    scaleV: number.isRequired,
})

const artFrameDataShape: InferPropTypeShape<ArtFrameData> = {
    canvasDepth: number.isRequired,
    matOffset: number.isRequired,
    sections: arrayOf(artFrameProfileType.isRequired),
    color: colorType.isRequired,
    matte: shape({
        id: number.isRequired,
        sections: arrayOf(artFrameProfileType.isRequired),
    }).isRequired,
}

const artProductDataShape: InferPropTypeShape<ArtProductData> = {
    artAssetUrls: arrayOf(string.isRequired).isRequired,
    displayHeightCm: number.isRequired,
    displayWidthCm: number.isRequired,
}

export const artItemType: InferPropType<ArtRenderItemComplete> = shape({
    ...renderItemShape,
    ...productDataShape,
    ...artProductDataShape,
    renderType: oneOf([ART_ITEM] as const).isRequired,
    selected: bool.isRequired,
    frame: shape({
        ...artFrameDataShape,
        id: number.isRequired,
        name: string.isRequired,
        thumbUrl: string.isRequired,
        // eslint-disable-next-line react/forbid-prop-types
        mattes: any,
        // eslint-disable-next-line react/forbid-prop-types
        colors: any,
    }).isRequired,
    frameId: number.isRequired,
    colorId: number.isRequired,
    matteId: number.isRequired,
    size: shape({
        height: number.isRequired,
    }).isRequired,
    rootCorners: cornersType.isRequired,
})

export const furnitureItemType: InferPropType<FurnitureRenderItemComplete> = shape({
    ...renderItemShape,
    ...productDataShape,
    renderType: oneOf([FURNITURE_ITEM] as const).isRequired,
    selected: bool.isRequired,
    isCombinableChild: bool.isRequired,
    rootCorners: cornersType.isRequired,
})

export const renderItemType: InferPropType<RenderItemComplete> = oneOfType([artItemType, furnitureItemType])

export const stackableSurfaceItemType = shape({
    id: string.isRequired,
    transform: arrayOf(arrayOf(number)).isRequired,
    parameters: shapeType.isRequired,
})

const compositionDataProps: InferPropTypeShape<CompositionDataItem> = {
    adminUrl: string,
    creationDate: string.isRequired,
    lastModifiedDate: string.isRequired,
    enableRemix: bool.isRequired,
    geoProperties: objectOf(any).isRequired,
    hiddenSurfaces: arrayOf(number.isRequired).isRequired,
    id: string.isRequired,
    isShared: bool.isRequired,
    isStock: bool.isRequired,
    name: string.isRequired,
    publicCompositionImageUrl: string.isRequired,
    renderItems: objectOf(renderItemType.isRequired).isRequired,
    savedProperties: objectOf(any).isRequired,
    sceneId: string.isRequired,
    sendNotifications: bool.isRequired,
    shareUrl: string,
    thumbUrl: string.isRequired,
    uuid: string.isRequired,
    wid: number.isRequired,
    deletedRenderItems: objectOf(renderItemType.isRequired),
    wallPaint: savedPropertiesType.wallPaint.isRequired,
    wallPaintInpaint: savedPropertiesType.wallPaintInpaint.isRequired,
    originalCompositionData: any,
    isGLTF: bool,
}
export const compositionDataType = shape(compositionDataProps)
export const compositionDataItemsType = arrayOf(compositionDataType)

export const compositionType = shape({
    ...compositionDataProps,
    scene: sceneType,
    isMissingItems: bool.isRequired,
    renderItems: arrayOf(renderItemType),
    hasStackableSurfaces: bool.isRequired,
    canMagicErase: bool.isRequired,
})

export const userType = shape({
    isLoggedIn: bool.isRequired,
    email: string,
    firstName: string,
    gid: string,
    lastName: string,
    wid: number.isRequired,
    metricsId: string.isRequired,
    isAdmin: bool.isRequired,
    canBeAdmin: bool.isRequired,
    signupLoginStatus: number,
    isNewUser: bool.isRequired,
    loginType: arrayOf(string).isRequired,
    subCatalogs: arrayOf(string),
    canChangePassword: bool.isRequired,
})

export const dashboardThumbType = shape({
    thumbUrl: string.isRequired,
    name: string.isRequired,
})

export const productDataType: InferPropType<ProductData> = shape(productDataShape)
export const productsDataType: InferPropType<ProductData[]> = arrayOf(productDataType.isRequired)

export const dropdownOptionKeyType = oneOfType([string, number])
export const dropdownOptionType = shape({
    key: dropdownOptionKeyType.isRequired,
    label: string.isRequired,
})
export const dropdownOptionsType = arrayOf(dropdownOptionType)

export const filterType = shape({
    query: string,
    category: string.isRequired,
    subCategory: string.isRequired,
    subCatalog: string.isRequired,
})

export const filterResultType = shape({
    ids: arrayOf(number),
    count: number,
    currentPage: number,
    hasNext: bool,
    moreToken: string,
})

export const subCategoryFurnitureType = shape({
    category: string.isRequired,
    subCategory: string.isRequired,
})

export const categoriesType = arrayOf(
    shape({
        key: string.isRequired,
        label: string.isRequired,
        subCategories: arrayOf(
            shape({
                key: string.isRequired,
                label: string.isRequired,
            }).isRequired,
        ).isRequired,
    }),
)

export const debugSettingsType = shape({
    linesViz: bool.isRequired,
    geometryViz: bool.isRequired,
    lightsViz: bool.isRequired,
    depthViz: bool.isRequired,
    imitateLowPerformance: bool.isRequired,
    ssViz: bool.isRequired,
    nsViz: bool.isRequired,
    environmentViz: bool.isRequired,
    environmentVizEquirect: bool.isRequired,
    environmentVizBackground: bool.isRequired,
    highlightPlanes: bool.isRequired,
    useAlternateEnvMap: bool.isRequired,
    useFloorContactShadows: bool.isRequired,
    disableFloorDirectSpecular: bool.isRequired,
    useRoomBuilderEnvMap: bool.isRequired,
    keepLocallyGeneratedLights: bool.isRequired,
    defaultToFloor: bool.isRequired,
    frontSideShadows: bool.isRequired,
    enableWalls: bool.isRequired,
    disable3DCompositionSave: bool.isRequired,
    showMemoryStats: bool.isRequired,
    trackedMemoryType: number.isRequired,
    showProductAdminData: bool.isRequired,
    useTAAforScreenshots: bool.isRequired,
    ctxLossFrequencyWindow: number.isRequired,
    disablePins: bool.isRequired,
})

export const previewSettingsType = shape({
    canvasWidth: number.isRequired,
    isSyntheticScene: bool.isRequired,
    isRoomBuilderScene: bool.isRequired,
    is3dMeshScene: bool.isRequired,
    maxTextureSize: number.isRequired,
    onOffOptions: shape({
        collectFrameMetric: bool.isRequired,
        disableOutline: bool.isRequired,
        magicEraserMode: bool.isRequired,
        showItemLoaders: bool.isRequired,
        showOcclusions: bool.isRequired,
        showShadows: bool.isRequired,
        usePBR: bool.isRequired,
        wallCollisions: bool.isRequired,
        enableDebugControls: bool.isRequired,
    }).isRequired,
    featureFlags: shape({
        useWallColorAntialias: bool.isRequired,
    }).isRequired,
    mobileFeatures: shape({
        noAA: bool.isRequired,
        noWallColor: bool.isRequired,
        sequentialLoading: bool.isRequired,
        enableFXAA: bool.isRequired,
    }).isRequired,
})

export const ratingType = objectOf(
    shape({
        id: number,
        value: number,
        note: string,
        job: string.isRequired,
        user: number,
        ratingTag: number.isRequired,
    }),
)
export const ratingOptionsType = arrayOf(
    shape({
        id: number.isRequired,
        name: string.isRequired,
        kind: string.isRequired,
        position: number.isRequired,
    }).isRequired,
)

export const imageLoaderType = shape({ image: string.isRequired, subTitle: string })
export const imageLoaderListType = arrayOf(imageLoaderType)

export const trackingProductInfoType = shape({
    ProductTitle: string,
    ProductId: number.isRequired,
    ProductType: string,
    ProductMeta: string,
    LocalItemNumber: string,
    OnlineAvailability: string,
    InStoreAvailability: string,
    PickupAvailability: bool,
    CanStack: bool,
    HasStackableLandingZones: bool,
    placingBehavior: string,
    isConfigurable: bool,
})

export const trackingRoomInfoType = shape({
    RoomTitle: string,
    RoomId: string,
    RoomSource: string,
})

export const productAndRoomTrackingInfoType = shape({
    ...trackingRoomInfoType,
    ...trackingProductInfoType,
})

export const sidepanelTabsType = shape({
    isSwapSelected: bool.isRequired,
    isBrowseSelected: bool.isRequired,
    isMyListSelected: bool.isRequired,
    isFavoritesSelected: bool.isRequired,
    isDebugSelected: bool.isRequired,
    isRateSelected: bool.isRequired,
})

export const variantOptionType = shape({
    valueKey: string.isRequired,
    productId: number,
    selected: bool.isRequired,
})

export const variantOptionsType = shape({
    options: arrayOf(variantOptionType).isRequired,
    type: string.isRequired,
    typeName: string.isRequired,
    showThumbnail: bool.isRequired,
})

export const variantsType = arrayOf(variantOptionsType)

export const customerLocationType: InferPropType<CustomerLocation> = shape({
    storeId: number,
    zipcode: string,
    storeName: string.isRequired,
})

export const pointXyzType = shape({
    x: number.isRequired,
    y: number.isRequired,
    z: number.isRequired,
})
