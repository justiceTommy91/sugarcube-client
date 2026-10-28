import { toPoint3 } from 'Renderer/geometry'
import type { Matrix4x4 } from 'Renderer/geomviewer'
import {
    composeTransform,
    createIdentity4,
    multiplyMatrices4x4,
} from 'Renderer/geometry/utilities'
import { GLTf, Material } from 'Renderer/gltf/gltf'

export type GltfParseOptions = {
    ignoreTextures?: boolean
}

// Applies the supplied options in place on the supplied .gltf object.
export function applyGltfParsingOptions (
    gltf:  GLTf,
    options: GltfParseOptions,
) {
    // Apply the available options.
    if (options.ignoreTextures) {
        gltf.materials?.forEach((material: Material) => {
            Object.keys(material)
                .filter(key => key.endsWith('Texture'))
                .forEach(key => { delete material[key] })
            Object.keys(material.pbrMetallicRoughness || {})
                .filter(key => key.endsWith('Texture'))
                .forEach(key => { delete material.pbrMetallicRoughness?.[key] })
        })
        delete gltf.textures
    }
    return gltf
}

export function parseGltfNodeWorldTransform(
    gltf: GLTf,
    nodeIndex: number
) {
    // Build a lookup table of each node's parent, then
    // track a chain from the provided node index.
    const parent = new Array(gltf.nodes?.length || 0).fill(null)
    for (let i = 0; i < (gltf.nodes?.length || 0); i += 1) {
        for (const child of gltf.nodes?.[i].children || [])
            parent[child] = i
    }
    let parentIndex = nodeIndex
    const nodeChain = [nodeIndex]
    while (parent[parentIndex] != null) {
        parentIndex = parent[parentIndex]
        nodeChain.push(parentIndex)
    }
    nodeChain.reverse()

    // Get the world transform of the node by multiplying
    // all the local transforms of all the nodes.
    let worldTransform = createIdentity4()
    nodeChain.forEach(currentIndex => {
        // Get the local transform of the node.
        const node = gltf.nodes?.[currentIndex]
        if (!node) {
            return
        }

        let localTransform: Matrix4x4
        if (node?.matrix) {
            localTransform = [
                node.matrix.slice(0, 4),
                node.matrix.slice(4, 8),
                node.matrix.slice(8, 12),
                node.matrix.slice(12, 16)
            ] as Matrix4x4
        } else {
            const translation = node.translation || [0, 0, 0]
            const rotation = node.rotation || [0, 0, 0, 1]
            const scale = node.scale || [1, 1, 1]
            localTransform = composeTransform(toPoint3(translation), rotation, toPoint3(scale))
        }

        // Multiply by the world transform of the parent nodes.
        worldTransform = multiplyMatrices4x4(localTransform, worldTransform)
    })

    return worldTransform
}
