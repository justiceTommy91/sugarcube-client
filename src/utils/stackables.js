/*

The following utility routines contain code for interpreting
stackable surface data. Stackables data appears in both the
manifest (static regions) and in furniture metadata (dynamic
regions). Surface defintions can be in V0 format or V1 format. V0
format is the original implementation and supports circular
regions only. V1 supports arbitrary polygon shapes (and
optionally also supports circles, just like in V0, though with
a different layout).

The manifest.md file may be helpful in understanding the data
layout here. See the section on plane_polygon_0, which describes
the new V1 data format:
https://github.com/geomagical/labtech-egress/blob/develop/docs/manifest.md#plane_polygon_0

The methods here take V0 or V1 data and return a common filtered
data format (which looks more like V1). This allows the calling
code to be agnostic of version differences in the underlying
data. 

*/

export const makeStackableFromV1Data = (data) => {
    const parameters = {
        type: data.style,
    }

    if (data.parameters.radius) {
        parameters.radius = data.parameters.radius
    }

    if (data.parameters.vertices) {
        parameters.vertices = data.parameters.vertices.map((v) => [+v[0], +v[1]])
    }

    const transform = data.matrixModel || data.matrix_model || data.transform

    const ret = {
        id: `${data.id}`,
        parameters,
        transform: transform.map((row) => [...row]),
    }

    return ret
}

export const makeStackableFromV0Data = (data) => {
    const c = data.centroid

    let r

    if (!data.rot) {
        r = [
            [1, 0, 0],
            [0, 0, 1],
            [0, -1, 0],
        ]
    } else {
        const d = data.rot

        // This matrix rotation deserves a note of
        // explination. To undersatnd this rotation let
        // Q be the rotation matrix from the if() section
        // above, the one with the [-1, 0, 0] on the
        // first row. The value of `r` below comes out
        // to `r = Q * d`.

        r = [
            [-d[0][0], -d[0][1], -d[0][2]],
            [-d[1][0], -d[1][1], -d[1][2]],
            [+d[2][0], +d[2][1], +d[2][2]],
        ]
    }

    const divs = 32
    const radius = data.style.radius

    const verts = []
    for (let i = 0; i < divs; i += 1) {
        verts.push([radius * Math.cos((2 * Math.PI * i) / divs), radius * Math.sin((2 * Math.PI * i) / divs)])
    }

    const ret = {
        id: `${data.id}`,
        parameters: {
            type: 'circle',
            radius: data.style.radius,
            vertices: verts,
        },
        transform: [
            [r[0][0], r[0][1], r[0][2], c[0]],
            [r[1][0], r[1][1], r[1][2], c[1]],
            [r[2][0], r[2][1], r[2][2], c[2]],
            [0, 0, 0, 1],
        ],
    }

    return ret
}

export const furnitureItemStackables = (furnitureData) => {
    const hasV0 =
        furnitureData.stackables && furnitureData.stackables.planes && furnitureData.stackables.planes.horizontal
    const hasV1 = furnitureData.stackables && furnitureData.stackables.polygons

    if (hasV1) {
        return furnitureData.stackables.polygons.map((data) => makeStackableFromV1Data(data))
    }

    if (hasV0) {
        return furnitureData.stackables.planes.horizontal.map((data) => makeStackableFromV0Data(data))
    }

    return []
}

export const furnitureItemStackableAlternates = (furnitureData) => {
    const hasV0 = furnitureData.stackables?.alternates?.[0]?.planes?.horizontal
    const hasV1 = furnitureData?.stackables?.alternates?.[0]?.polygons

    if (hasV1) {
        return furnitureData.stackables.alternates[0].polygons.map((data) => makeStackableFromV1Data(data))
    }

    if (hasV0) {
        return furnitureData.stackables.alternates[0].planes.horizontal.map((data) => makeStackableFromV0Data(data))
    }

    return []
}
