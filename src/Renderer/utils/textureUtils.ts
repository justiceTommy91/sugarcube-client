import TextureHelper from 'Renderer/TextureHelper'
import { DefaultAssetManager } from 'Renderer/rendering/rendering_utils'

export function getTexturePerceivedBrightness(mesh: THREE.Mesh) {
  // Get the walls color brightness.
  let wallColor
  const wallMaterial = mesh.material as THREE.MeshStandardMaterial
  if (wallMaterial.map && wallMaterial.map.uuid !== DefaultAssetManager.getWhiteTexture().uuid) {
    wallColor = new TextureHelper().readPixels(wallMaterial.map)?.data

  }
  if (!wallColor) {
    wallColor = wallMaterial.color.clone().multiplyScalar(255).toArray() || [255, 255, 255]
  }

  return 0.2126 * wallColor[0] / 255
    + 0.7152 * wallColor[1] / 255
    + 0.0722 * wallColor[2] / 255
}
