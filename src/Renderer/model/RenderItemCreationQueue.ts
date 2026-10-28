/* eslint-disable class-methods-use-this */
import { gvStartupWarden } from 'Renderer/foundation/geom_app'
import {
  MASK_DATA_READY,
  ENVIRONMENT_MAP_READY,
  WALL_SNAP_READY,
  PLANE_DATA_READY,
  RENDER_DIMENSIONS_READY,
  WASM_LOAD_COMPLETE
} from 'Renderer/StartupWarden'
import Renderer from 'Renderer'
import type { ArtItemParameters,
   FurnitureItemParameters, Placement, StackableSurfaceParameters } from 'Renderer/geomviewer/geom_types'
import FurnitureItem3D, { type UpdateReactFunction } from 'Renderer/model/FurnitureItem3D'
import StackableSurfaceItem3D, { type StackSurfParentItemProxy } from 'Renderer/model/StackableSurfaceItem3D'
import { RenderItem3D } from 'Renderer/model/RenderItem3D'
import ArtItem3D from './ArtItem3D'

type DependencyResolvedCallback = () => void

export class RenderItemCreationQueue {
  private positioningReadyPromise: Promise<void>
  private resolvedDependencies: Set<string> = new Set()
  private unresolvedDependencies: Map<string, DependencyResolvedCallback[]> = new Map()
  private isDiscarded = false

  constructor() {
    this.positioningReadyPromise = new Promise((resolve) => {
      // eslint-disable-next-line no-bitwise
      const startupStages = RENDER_DIMENSIONS_READY |
        MASK_DATA_READY |
        ENVIRONMENT_MAP_READY |
        WALL_SNAP_READY |
        PLANE_DATA_READY |
        WASM_LOAD_COMPLETE
      gvStartupWarden()?.registerCallback(startupStages, () => {
        resolve()
      })
    })
  }

  public discard() {
    this.isDiscarded = true
  }

  public resolveRoomElement(id: string) {
    this.resolvedDependencies.add(id)
  }

  public createFurnitureItem(id: string, renderer: Renderer, placement: Placement, parameters: FurnitureItemParameters,
    updateCallback: UpdateReactFunction): Promise<FurnitureItem3D | null> {
      const dependencies = this.getFurnitureDeps(parameters)

      return this.createItemInternal(
        id, dependencies, () => new FurnitureItem3D(id, renderer, placement, parameters,
        updateCallback))
  }

  public createArtItem(id: string, renderer: Renderer, placement: Placement, 
    parameters: ArtItemParameters): Promise<ArtItem3D | null> {
      const dependencies = this.getArtItemDeps(parameters)
      return this.createItemInternal(id, dependencies, () => new ArtItem3D(id, renderer, 
        placement, parameters.image, parameters.frameData, parameters.size))
  }

  public createStackableSurface(id:string, renderer: Renderer, planeParameters: StackableSurfaceParameters,
    parentProxy?: StackSurfParentItemProxy) {
      const dependencies = this.getStackableSurfaceDeps(parentProxy)
      return this.createItemInternal(
        id, dependencies, () => new StackableSurfaceItem3D(id, renderer, planeParameters,
        parentProxy))
  }

  private async createItemInternal<T extends RenderItem3D>(id: string, dependencies: string[],
    creationFn: () => T): Promise<T | null> {
    await this.positioningReadyPromise
    const unsolvedDeps = dependencies.filter(dep => !this.isDependencyResolved(dep))
    const dependencyPromises = unsolvedDeps.map(dep =>
      new Promise<void>(resolve => { this.registerDependency(dep, resolve) }))
    await Promise.all(dependencyPromises)
    if (this.isDiscarded) {
      return null
    }
    const item = creationFn()
    this.onDependencyResolved(id)
    return item
  }

  private registerDependency(itemId: string, callback: DependencyResolvedCallback) {
    const callbacks = this.unresolvedDependencies.get((itemId)) || []
    callbacks.push(callback)
    this.unresolvedDependencies.set(itemId, callbacks)
  }

  private onDependencyResolved(itemId: string) {
    const awaitingCallbacks = this.unresolvedDependencies.get((itemId))
    if (awaitingCallbacks) {
      awaitingCallbacks.forEach((cb) => cb())
      this.unresolvedDependencies.delete(itemId)
    }
    this.resolvedDependencies.add(itemId)
  }

  private isDependencyResolved(itemId: string) {
    return this.resolvedDependencies.has(itemId)
  }

  private getFurnitureDeps(parameters: FurnitureItemParameters): string[] {
    const ret: string[] = []
    if (parameters.canStack && parameters.stackOnSurfaceId) {
      ret.push(parameters.stackOnSurfaceId)
    }
    if (parameters.combinablePlacement) {
      ret.push(String(parameters.combinablePlacement.parentId))
    }
    return ret
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  private getArtItemDeps (parameters: ArtItemParameters): string[] {
    return []
  }

  private getStackableSurfaceDeps(parentProxy?: StackSurfParentItemProxy): string[] {
    const ret: string[] = []
    if (parentProxy !== undefined) {
       ret.push(String(parentProxy.uniqueId))
    }
    return ret
  }
}