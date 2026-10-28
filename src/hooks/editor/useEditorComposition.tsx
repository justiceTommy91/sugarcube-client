import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppDispatch } from 'hooks'
import { saveEditedRoom } from 'models/planner/actions'
import { createRoomPlannerScene } from 'models/scenes/actions'
import { ProductData } from 'models/furniture'
import { findSocketProductGeometry } from 'models/furniture/helpers'
import type { APIComposition, ArtProductData, PlacedFurniture } from 'models/compositions'
import { getHasLocalStoredComposition } from 'models/localStorage/selectors'
import { STORED_COMPOSITION_LABEL } from 'models/localStorage/constants'
import { ART_FRAMES, ART_SIZES, DEFAULT_ART_OPTIONS_ID } from 'models/furniture/artConstants'

import { GLTf } from 'Renderer/gltf/gltf'
import { usePlannerApi } from 'Planner/ui/hooks/usePlannerApi'
import type { CompositionInfo, GeneralParentType, CompositionFurnitureItem, ModelInfo } from 'Planner/api_types'
import { placeablesToPlacement, decomposeItemTransform } from 'Planner/planner_utils'
import { PARENT_TYPE_ITEM, PARENT_TYPE_ROOM_SURFACE, PLACEMENT_WALL_ONLY } from 'Planner/api_constants'
import type { ArtFrameData, Matrix4x4 } from 'Renderer/geomviewer/geom_types'
import { extractPosition, extractQuaternionFromMat4 } from 'Renderer/geometry/utilities'
import { generateImageData } from 'utils/imageData'

export type CompositionFullData = {
    plannerComposition: CompositionInfo
    apiComposition: APIComposition
}

const findCorrectGeometry = (item: PlacedFurniture, itemProduct: ProductData, parentProduct: ProductData) => {
  const sockets = parentProduct.combinablesSocketSet?.sockets
  const socketName = item.gfxAttributes?.combinablePlacement?.socketName
  if (socketName && sockets) {
    return findSocketProductGeometry(socketName as string, itemProduct, parentProduct, sockets)?.modelUrl
  }

  return itemProduct.productGeometries.simple?.modelUrl
}

type ArtDataIndex = 1 | 2 | 3 | 4
const initArtItemFrame = (renderItemPartial: PlacedFurniture, productData: ProductData) => {
  const artData = renderItemPartial.gfxAttributes?.artData ?? {
    frameId: DEFAULT_ART_OPTIONS_ID,
    sizeId: DEFAULT_ART_OPTIONS_ID,
    colorId: DEFAULT_ART_OPTIONS_ID,
    matteId: DEFAULT_ART_OPTIONS_ID,
  }
  const { frameId, sizeId, colorId, matteId, customHeight } = artData

  const framePartial = ART_FRAMES[frameId as ArtDataIndex]
  let size: {id: number, height?: number } = ART_SIZES[sizeId as ArtDataIndex]
  const artProduct = productData as ProductData & ArtProductData
  switch (sizeId) {
    case 1:
      size = { ...size, height: artProduct.displayHeightCm / 100 }
      break
    case 999:
      size = { ...size, height: customHeight || 0.4 }
      break
    default:
      break
  }

    // The colors are stored per-frame, but for now
    // we're pretending like the color selection
    // operates at the artItem scope (not the frame scope)
    const color = ('colors' in framePartial) ? { ...framePartial.colors[colorId as 1 | 2 | 3], id: colorId } : null
    const matte = ('mattes' in framePartial) ? { ...framePartial.mattes[matteId as 1], id: matteId } : null
    const frame = {
        ...framePartial,
        color,
        matte,
    } as unknown as ArtFrameData

    return {
        frame,
        size: size.height ?? 1.0,
    }
}

export const useEditorComposition = () => {
  const [compositionData, setCompositionData] = useState<CompositionFullData | undefined>(undefined)

  const { plannerApi } = usePlannerApi()

  const { t } = useTranslation(['dashboard', 'translation'])
  const dispatch = useAppDispatch()

  useEffect(() => {
    const loadComposition = async () => {
        const loadDataString = window.localStorage.getItem(STORED_COMPOSITION_LABEL)
        if (loadDataString) {
          const storedData = JSON.parse(loadDataString)
          // Legacy difference in saving/loading {
          storedData.placedfurnitureSet = storedData.placedFurniture
          storedData.uuid = storedData.compositionId
          storedData.sceneUuid = storedData.sceneId
          storedData.thumbnailUrl = storedData.thumbUrl

          const storedComposition = storedData as APIComposition & {
            furnitures: ProductData[]
          }

          const artImages = new Map<number, ImageData>()
          const artImageUrls = new Map<number, string>()
          await Promise.all(storedComposition.furnitures.map(furnitureInfo => {
            if ('artAssetUrls' in furnitureInfo) {
              const imageUrl =
                Array.isArray(furnitureInfo.artAssetUrls) &&
                furnitureInfo.artAssetUrls.length > 0 &&
                furnitureInfo.artAssetUrls[0]
              if (imageUrl) {
                return generateImageData(imageUrl).then((imageInfo) => {
                  artImages.set(furnitureInfo.id, imageInfo.artImageData)
                  artImageUrls.set(furnitureInfo.id, imageUrl)
                })
              }
            }
            return null
          }))

          const furniture = storedComposition.placedfurnitureSet.map((info) => {
            const furnitureInfo = storedComposition.furnitures.find((data) => data.id === info.furnitureId)
            if (!furnitureInfo) {
              return null
            }
            const parentType: GeneralParentType = info.parentId === 'SURFACE'
              ? PARENT_TYPE_ROOM_SURFACE
              : PARENT_TYPE_ITEM
            let modelInfo: ModelInfo | null = null
            let isImageArtItem = false
            if (furnitureInfo.productGeometries) {
              let glbUrl = furnitureInfo.productGeometries.simple?.modelUrl
              if (parentType === PARENT_TYPE_ITEM) {
                const parentItem = storedComposition.placedfurnitureSet.find(i => i.uniqueId === info.parentId)
                if (parentItem) {
                  const parentProduct = storedComposition.furnitures.find(f => f.id === parentItem.furnitureId)
                  if (parentProduct) {
                    glbUrl = findCorrectGeometry(info, furnitureInfo, parentProduct)
                  }
                }
              }

              if (!glbUrl) {
                return null
              }

              modelInfo = { glbUrl }
            } else {
              isImageArtItem = true
              const frameInfo = initArtItemFrame(info, furnitureInfo)
              const artImageData = artImages.get(furnitureInfo.id)
              const imageUrl = artImageUrls.get(furnitureInfo.id)
              if (!artImageData || !imageUrl) {
                return null
              }
              modelInfo = {
                imageUrl,
                size: frameInfo.size,
                frameData: frameInfo.frame,
                artImageData,
              }
            }

            let position = { x: info.x, y: info.y, z: info.z ?? 0 }
            let rotation = { x: info.headingI ?? 0, y: info.headingJ ?? 0, z: info.headingK ?? 0, w: info.heading, }
            if (info.gfxAttributes?.combinablePlacement?.localTransform) {
              const elements = info.gfxAttributes?.combinablePlacement.localTransform as number[]
              const mat: Matrix4x4 = [
                [elements[0], elements[4], elements[8], elements[12]],
                [elements[1], elements[5], elements[9], elements[13]],
                [elements[2], elements[6], elements[10], elements[14]],
                [elements[3], elements[7], elements[11], elements[15]],
              ]
              position = extractPosition(mat)
              const quat = extractQuaternionFromMat4(mat)
              rotation = { x: quat[0], y: quat[1], z: quat[2], w: quat[3] }
            }

            const decomposed = decomposeItemTransform(position, rotation, furnitureInfo.metadata?.placeables,
              info.gfxAttributes?.anchorCombinationIndex, furnitureInfo.max?.x ?? 0)

            return {
                uniqueId: info.uniqueId,
                model: modelInfo,
                placement: isImageArtItem
                  ? PLACEMENT_WALL_ONLY
                  : placeablesToPlacement(furnitureInfo?.metadata?.placeables),
                position: decomposed.rootPos,
                rotation: decomposed.rootRot,
                parentType,
                parentId: info.parentId === 'SURFACE' ? String(info.parentAttachment) : String(info.parentId),
                modelPosition: decomposed.modelPos,
                modelRotation: decomposed.modelRot,
            }
          }).filter((item): item is CompositionFurnitureItem => !!item)

          setCompositionData({
            plannerComposition: {
                uuid: storedData.uuid,
                furniture,
                floorId: storedData.floorId,
                ceilingId: storedData.ceilingId,
              },
              apiComposition: storedData,
          })
        }
    }
    if (getHasLocalStoredComposition()) {
      loadComposition()
    }
  }, [])

  const saveRoom = useCallback((sceneId: string, compositionId: string, roomGltf: GLTf, envmap?: Blob | null) => {
    if (compositionData) {
      const currentFurnitureState = plannerApi.getFurnitureState()
      const compositionSaveData = {
        compositionId,
        placedFurniture: compositionData.apiComposition.placedfurnitureSet
          .filter(item => !!currentFurnitureState.find(placedItem => placedItem.uniqueId === item.uniqueId))
          .map(item => {
            const currentState = currentFurnitureState.find(placedItem => placedItem.uniqueId === item.uniqueId)
            const result = {
              furnitureId: item.furnitureId,
              gfxAttributes: item.gfxAttributes ?? {},
              heading: currentState?.heading ?? item.heading,
              headingI: currentState?.headingI ?? item.headingI,
              headingJ: currentState?.headingJ ?? item.headingJ,
              headingK: currentState?.headingK ?? item.headingK,
              parentAttachment: item.parentAttachment,
              parentId: item.parentId,
              uniqueId: item.uniqueId,
              x: currentState?.x ?? item.x,
              y: currentState?.y ?? item.y,
              z: currentState?.z ?? item.z,
            }
            if (currentState) {
              if (currentState.parentType === 'item') {
                result.parentId = currentState.parentUniqueId
                result.parentAttachment = 0
                result.gfxAttributes.placingBehavior = `Floor`
                result.gfxAttributes.parentId = +currentState.parentUniqueId
              } else {
                result.parentId = 'SURFACE'
                result.parentAttachment = +currentState.parentUniqueId
                result.gfxAttributes.placingBehavior = currentState.parentType === 'wall'
                    ? `WallPlaceable`
                    : `Floor`
                delete result.gfxAttributes.parentId
              }
            }
            return result
          }),
          name: compositionData.apiComposition.name,
          sceneId: compositionData.apiComposition.sceneId,
          isShared: compositionData.apiComposition.isShared,
          savedProperties: compositionData.apiComposition.savedProperties,
        }
      delete compositionSaveData.savedProperties.wallPaint
      delete compositionSaveData.savedProperties.wallPaintInpaint
      dispatch(saveEditedRoom(sceneId, t('dashboard:dashboard.planner.default room name'), roomGltf, envmap,
        compositionSaveData))
    } else {
      dispatch(createRoomPlannerScene(t('dashboard:dashboard.planner.default room name'), roomGltf, envmap))
    }
  }, [compositionData])

  return { compositionData, saveRoom }
}