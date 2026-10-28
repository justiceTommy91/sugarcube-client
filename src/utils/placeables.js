export const furnitureItemPlaceables = (furnitureData) =>
    furnitureData.productGeometries?.simple?.pipelineJson?.placeables || {}

export const hasPlaceablesData = (placeablesData) => !(!placeablesData || Object.keys(placeablesData).length === 0)

export const isFloorOnly = (placeablesData, geometryTypes) => {
    const isFloorOnlyFromGeomTypes = geometryTypes && geometryTypes.length === 1 && geometryTypes[0] === '3d'
    return !hasPlaceablesData(placeablesData) && isFloorOnlyFromGeomTypes
}

export const isWallPlaceableOnly = (placeablesData) => {
    if (!placeablesData) {
        return false
    }

    const isPlaceable = hasPlaceablesData(placeablesData)
    return isPlaceable && placeablesData.anchors.every((e) => e.category === 'wall')
}

export const isWallAndFloor = (placeablesData) => {
    if (!placeablesData) {
        return false
    }

    const isPlaceable = hasPlaceablesData(placeablesData)
    const ret =
        isPlaceable &&
        placeablesData.anchors.some((e) => e.category === 'wall' && e.constraint === 'back') &&
        placeablesData.anchors.some((e) => e.category === 'floor' && e.constraint === 'bottom') &&
        placeablesData.combinations.length === 1 &&
        placeablesData.combinations[0][0] === 0 &&
        placeablesData.combinations[0][1] === 1

    return ret
}

export const isWallAnchored = (placeablesData) => isWallPlaceableOnly(placeablesData) || isWallAndFloor(placeablesData)

// Return whether the item can be placed either on the floor or on a wall, based on the info in placeableData.
export const isWallOrFloor = (placeablesData, geometryTypes) => {
    const isWallOrFloorFromGeomTypes =
        geometryTypes && geometryTypes.includes('3d') && geometryTypes.includes('wall_placeable')
    const hasPlaceablesMetadata = hasPlaceablesData(placeablesData)
    if (!hasPlaceablesMetadata && !isWallOrFloorFromGeomTypes) {
        return false
    }

    let isWallOrFloorFromMetadata = false
    if (hasPlaceablesMetadata) {
        const singleCombinationValues = placeablesData.combinations.filter((e) => e.length === 1).flat()
        isWallOrFloorFromMetadata =
            placeablesData.anchors.some((e) => e.category === 'wall' && e.constraint === 'back') &&
            placeablesData.anchors.some((e) => e.category === 'floor' && e.constraint === 'bottom') &&
            placeablesData.combinations.length === 2 &&
            singleCombinationValues.some((e) => e === 0) &&
            singleCombinationValues.some((e) => e === 1)
    }

    const isWallOrFloorFinal = isWallOrFloorFromMetadata || isWallOrFloorFromGeomTypes

    return isWallOrFloorFinal
}

export const isFloorPlaceable = (placeablesData) =>
    !isWallPlaceableOnly(placeablesData) && !isWallAndFloor(placeablesData)

function hasMatrixModelData(placeablesData) {
    return !!placeablesData?.anchors.some((e) => e.matrixModel !== undefined)
}

// check if matrixModel prop exists in the data and its an array containing 4 arrays of 4 element each
export function isSnapRotatable(placeablesData) {
    if (!placeablesData || Object.keys(placeablesData).length === 0) {
        return false
    }

    return (
        hasMatrixModelData(placeablesData) &&
        placeablesData.anchors.some((e) => !!e.matrixModel) &&
        placeablesData.anchors.some((e) => e.matrixModel.length === 4) &&
        placeablesData.anchors.some((e) => e.matrixModel[0].length === 4) &&
        placeablesData.anchors.some((e) => e.matrixModel[1].length === 4) &&
        placeablesData.anchors.some((e) => e.matrixModel[2].length === 4) &&
        placeablesData.anchors.some((e) => e.matrixModel[3].length === 4)
    )
}
