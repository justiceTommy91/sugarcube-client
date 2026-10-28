/* eslint-disable  no-unused-vars */
/* eslint-disable  @typescript-eslint/no-unused-vars */

import {
  GLTFGeomagicalCamera,
  RoomGLTFAssetData,
  AssetName,
  ManifestExtra,
  DepthOcclusionMetadata,
  LightingData,
  GLTFImage
} from 'Renderer/assets/Types'
import { AssetsList } from 'Renderer/assets/AssetsList'
import * as constants from 'Renderer/constants'
import CustomGLTFLoader from 'Renderer/gltf/CustomGLTFLoader'
import { GLTf } from 'Renderer/gltf/gltf'
import { GrandCentral } from 'Renderer/GrandCentral'
import {
  NOTIFY_VIEWER_ERROR,
} from 'Renderer/geomviewer/geom_constants'
import { PlaneData, Point2D } from 'Renderer/geomviewer/geom_types'
import { CameraSequence } from 'Renderer/multiview/camera_sequence'
import { RoomGLTFAssets } from './RoomGLTFAssets'

/**
 * Extends the RoomGLTFAssets class to provide access to the GLTF data for a whole room.
 */
export class WholeRoomGLTFAssets extends RoomGLTFAssets {

  constructor(gltf: RoomGLTFAssetData, baseUrl: string) {
    super(gltf, baseUrl, { ignoreTextures: false })
  }

}
