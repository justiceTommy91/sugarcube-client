import type { WallElementSizeMetadata } from 'Planner/api_types'

// Class to store and retrieve room properties settable by the user,
// such as materials, colors, etc.
export class RoomUserProps {
  private floorMaterialUuid = ''
  private ceilingMaterialUuid = ''
  private wallsMaterialUuid = ''
  private wallsColor: [number, number, number] = [1, 1, 1]
  private wallElementAssets = new Map<string, string>
  private wallElementSizeMetadata = new Map<string, WallElementSizeMetadata>

  public storeFloorMaterialUuid(uuid: string) {
    this.floorMaterialUuid = uuid
  }

  public getFloorMaterialUuid() {
    return this.floorMaterialUuid
  }

  public storeCeilingMaterialUuid(uuid: string) {
    this.ceilingMaterialUuid = uuid
  }

  public getCeilingMaterialUuid() {
    return this.ceilingMaterialUuid
  }

  public storeWallsMaterialUuid(uuid: string) {
    this.wallsMaterialUuid = uuid
  }

  public getWallsMaterialUuid() {
    return this.wallsMaterialUuid
  }

  public storeWallsColor(r: number, g: number, b: number) {
    this.wallsColor[0] = r
    this.wallsColor[1] = g
    this.wallsColor[2] = b
  }

  public getWallsColor(): [number, number, number] {
    return [...this.wallsColor]
  }

  public storeWallElementAsset(elementId: string, uuid: string) {
    this.wallElementAssets.set(elementId, uuid)
  }

  public deleteWallElementData(elementId: string) {
    this.wallElementAssets.delete(elementId)
    this.wallElementSizeMetadata.delete(elementId)
  }

  public getWallElementAsset(elementId: string) {
    return this.wallElementAssets.get(elementId)
  }

  public storeWallElementSizeMetadata(elementId: string, metadata: WallElementSizeMetadata) {
    this.wallElementSizeMetadata.set(elementId, metadata)
  }

  public getWallElementSizeMetadata(elementId: string) {
    return this.wallElementSizeMetadata.get(elementId)
  }
}