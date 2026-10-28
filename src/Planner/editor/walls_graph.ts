/* eslint-disable class-methods-use-this */
import * as THREE from 'three'

import { WasmInterop, WallElementType as WasmWallElementType,
  VertexFreeMoveResult as WasmVertexFreeMoveResult } from '@geomagical/sugarcube-shared'

import type { ColorMap, WallElementType, WallsGraphMutationResult,
  PlannerSettings, WallMoveMethod } from 'Planner/planner_types'
import type { WallSplitResult } from 'Planner/api_types'
import type { RoomTemplate } from 'Planner/room_template/room_template'

import {
  WALLS_GRAPH_DEFAULT_SNAP_METERS,
  WALLS_GRAPH_WALL_ELEMENT_MARGIN,
  WALLS_GRAPH_MIN_WALL_LENGTH,
  WALLS_GRAPH_MAX_WALL_LENGTH,
  MUTATION_FAIL_REASON_UNKNOWN,
  WALL_SPLIT_MIN_DISTANCE,
} from 'Planner/planner_constants'

export type WallGraphOptions = {
  snapModeEnabled?: boolean
  wallMoveSnapLength?: number
}

// An architectural element that belongs to a wall, such as a window, door, etc.
export type WallElement = {
  id: string
  wallId: string
  size: THREE.Vector2
  class: WallElementType
}

export type Wall = {
  id: string,
  vertexIds: [string, string],
  originalLength: number,
  uiColor: THREE.Color,
  elements: Map<string, WallElement>
}

export type WallVertex = {
  id: string,
  wallIds: string[]
}

type WallGraphSnapshot = {
  vertices: Map<string, WallVertex>
  walls: Map<string, Wall>
  wallElements: Map<string, WallElement>
}

const translateWasmMoveResult = (wasmResult: WasmVertexFreeMoveResult): WallsGraphMutationResult => ({
  success: !!wasmResult.success,
  obstacleWallId: wasmResult.obstacleWallId,
  reason: wasmResult.reason,
})

export class WallsGraph {
  private vertices = new Map<string, WallVertex>()
  private walls = new Map<string, Wall>()
  private wallElements = new Map<string, WallElement>()

  private floorShapeIsDirty = false
  private wasmInterop: WasmInterop

  private wallsMoveMethod: WallMoveMethod = `method1`
  private snapModeEnabled = false
  private wallMoveSnapLength = WALLS_GRAPH_DEFAULT_SNAP_METERS
  private reservedSurfaceIds: Set<string>

  private stateSnapshot: WallGraphSnapshot | null = null

  constructor(wasmInterop: WasmInterop, template: RoomTemplate, reservedSurfaceIds: Set<string>) {
    wasmInterop.createWallGraph()
    this.wasmInterop = wasmInterop
    this.reservedSurfaceIds = new Set([...reservedSurfaceIds])
    this.buildGraph(template)
    this.fixWallVerticesOrder()
  }

  public applySettings(settings: PlannerSettings) {
    this.wallsMoveMethod = settings.wallMoveMethod
  }

  public setSnapModeEnabled(enabled: boolean) {
    this.snapModeEnabled = enabled
  }

  public getWalls() {
    return this.walls
  }

  public getWallElements() {
    return this.wallElements
  }

  public getVertices() {
    return this.vertices
  }

  public getWallById(id: string): Wall | undefined {
    return this.walls.get(id)
  }

  public getVertexById(id: string): WallVertex | undefined {
    return this.vertices.get(id)
  }

  public getWallElementByGlobalId(id: string): WallElement | undefined {
    return this.wallElements.get(id)
  }

  public getVertexPosition(id: string) {
    const ret = new THREE.Vector2()
    const vertex = this.getVertexById(id)
    if (!vertex || !this.wasmInterop) {
        return ret
    }
    const position = this.wasmInterop.getVertexPosition(+vertex.id)
    return ret.set(position.x, position.y)
  }

  // Try to fit a wall element of given size to a wall.
  // Returns adjusted (if needed) position, or undefined if element doesn't fit.
  private fitWallElementToWall(wall: Wall, position: THREE.Vector2, elementSize: THREE.Vector2, elementId?: string) {
    const elementWidth = elementSize.x
    const elementHeight = elementSize.y
    let elementEdgeLeft = position.x - (0.5 * elementWidth + WALLS_GRAPH_WALL_ELEMENT_MARGIN)
    let elementEdgeRight = position.x + (0.5 * elementWidth + WALLS_GRAPH_WALL_ELEMENT_MARGIN)
    const elementEdgeBottom = position.y - (0.5 * elementHeight + WALLS_GRAPH_WALL_ELEMENT_MARGIN)
    const elementEdgeTop = position.y + (0.5 * elementHeight + WALLS_GRAPH_WALL_ELEMENT_MARGIN)
    const destWallLength = this.getWallLength(wall)
    if (elementWidth > destWallLength) {
      return undefined
    }

    // Because of the check above, we established that wall length is greater than element's width.
    let delta = 0.0
    if (elementEdgeLeft < 0) {
      delta = Math.abs(elementEdgeLeft)
    }
    if (elementEdgeRight > destWallLength) {
      delta = -(elementEdgeRight - destWallLength)
    }
    position.x += delta
    elementEdgeLeft += delta
    elementEdgeRight += delta

    // Check if the moving element intersects any existing elements.
    const intersects = Array.from(wall.elements.values()).some((existingElem) => {
      if (existingElem.id === elementId) {
        return false
      }
      const existingElemPos = this.getWallElementPosition(existingElem.id)
      const existingElemWidth = existingElem.size.x
      const existingElemHeight = existingElem.size.y
      const existingElemEdgeLeft = existingElemPos.x - 0.5 * existingElemWidth
      const existingElemEdgeRight = existingElemPos.x + 0.5 * existingElemWidth
      const fitsHorizontally = elementEdgeRight < existingElemEdgeLeft || elementEdgeLeft > existingElemEdgeRight

      const existingElemEdgeBottom = existingElemPos.y - 0.5 * existingElemHeight
      const existingElemEdgeTop = existingElemPos.y + 0.5 * existingElemHeight
      const fitsVertically = elementEdgeTop < existingElemEdgeBottom || elementEdgeBottom > existingElemEdgeTop

      return !fitsHorizontally && !fitsVertically
    })
    if (intersects) {
      return undefined
    }
    return position
  }

  public setWallElementPosition(elementId: string, wallId: string, position: THREE.Vector2) {
    const element = this.getWallElementByGlobalId(elementId)
    if (!element) {
      return
    }
    const prevWall = this.getWallById(element.wallId)
    const destinationWall = this.getWallById(wallId)
    if (!prevWall || !destinationWall) {
      return
    }
    const adjustedPosition = this.fitWallElementToWall(destinationWall, position, element.size, elementId)
    if (!adjustedPosition) {
      return
    }

    if (element.wallId !== wallId) {
      this.wasmInterop.moveWallElementToWall(+elementId, +destinationWall.id)
      element.wallId = wallId
      prevWall.elements.delete(elementId)
      destinationWall.elements.set(elementId, element)
    }
    this.wasmInterop.setWallElementPosition(+elementId, adjustedPosition.x, adjustedPosition.y)
  }

  public setWallElementSize(elementId: string, size: THREE.Vector2): boolean {
    const element = this.getWallElementByGlobalId(elementId)
    if (!element) {
      return false
    }
    const wall = this.getWallById(element.wallId)
    if (!wall) {
      return false
    }
    const position = this.getWallElementPosition(elementId)
    const adjustedPosition = this.fitWallElementToWall(wall, position, size, elementId)
    if (!adjustedPosition) {
      return false
    }
    element.size.set(size.x, size.y)
    this.wasmInterop.setWallElementSize(+elementId, size.x, size.y)
    if (element.class === `door`) {
      adjustedPosition.y = size.y / 2.0
    }
    this.wasmInterop.setWallElementPosition(+elementId, adjustedPosition.x, adjustedPosition.y)
    return true
  }

  public deleteWallElement(elementId: string) {
    const element = this.getWallElementByGlobalId(elementId)
    if (!element) {
      return
    }
    const wall = this.getWallById(element.wallId)
    if (wall) {
      wall.elements.delete(elementId)
    }
    this.wallElements.delete(elementId)
    this.wasmInterop.deleteWallElement(+elementId)
  }

  public getWallElementPosition(globalElementId: string) {
    const elemId = parseInt(globalElementId, 10)
    const pos = this.wasmInterop.getWallElementPosition(elemId)
    return new THREE.Vector2(pos.x, pos.y)
  }

  public getIsFloorShapeDirty() {
    return this.floorShapeIsDirty
  }

  public setIsFloorShapeDirty(dirty: boolean) {
    this.floorShapeIsDirty = dirty
  }

  public getFloorCentroid(): THREE.Vector2 {
    const centroid = new THREE.Vector2()
    if (this.vertices.size > 0) {
      this.vertices.forEach((v) => {
        centroid.add(this.getVertexPosition(v.id))
      })
      centroid.multiplyScalar(1.0 / this.vertices.size)
    }
    return centroid
  }

  private buildGraph(template: RoomTemplate) {
    template.vertices.forEach((templateVertex) => {
      const vertexId = templateVertex.id
      this.wasmInterop.addVertex(vertexId, templateVertex.position)
      this.vertices.set(String(vertexId), {
        id: String(vertexId),
        wallIds: [],
      })
    })
    template.walls.forEach((templateWall) => {
      const wallId = templateWall.id
      this.wasmInterop.addWall(wallId, templateWall.vertices[0], templateWall.vertices[1])
      const newWall: Wall = {
        id: String(wallId),
        vertexIds: [String(templateWall.vertices[0]), String(templateWall.vertices[1])],
        originalLength: this.wasmInterop.getWallLength(wallId),
        uiColor: new THREE.Color(templateWall.color.r, templateWall.color.g, templateWall.color.b),
        elements: new Map(),
      }
      const v1 = this.getVertexById(newWall.vertexIds[0])
      if (v1) {
        v1.wallIds.push(newWall.id)
      }
      const v2 = this.getVertexById(newWall.vertexIds[1])
      if (v2) {
        v2.wallIds.push(newWall.id)
      }
      this.walls.set(newWall.id, newWall)
    })
  }

  // This function makes sense only when there's only one closed walls loop in the room.
  private fixWallVerticesOrder() {
    if (!this.wasmInterop) {
      return
    }
    this.wasmInterop.makeClockwise(true)
    this.walls.forEach((wall) => {
      const [vertId0, vertId1] = this.wasmInterop.getWallVertices(+wall.id)
      wall.vertexIds = [String(vertId0), String(vertId1)]
    })
    this.vertices.forEach((vertex) => {
      const [wallId0, wallId1] = this.wasmInterop.getVertexWalls(+vertex.id)
      vertex.wallIds = [String(wallId0), String(wallId1)]
    })
  }

  public getWallLength(wall: Wall): number {
    return this.wasmInterop.getWallLength(+wall.id)
  }

  public setWallMinLength(wallId: string, minLength: number) {
    const wall = this.walls.get(wallId)
    if (!wall) {
      return
    }
    this.wasmInterop.setWallMinLength(+wall.id, minLength)
  }

  public setWallLength(wallId: string, newLength: number) {
    const wall = this.walls.get(wallId)
    if (!wall) {
      return
    }
    this.wasmInterop.setWallLength(+wall.id, newLength)
  }

  public moveWall(wallId: string, displacement: THREE.Vector2) {
    const wall = this.walls.get(wallId)
    if (!wall) {
      return false
    }
    const { normal } = this.decomposeDisplacementOnWall(displacement, wall)
    if (this.snapModeEnabled && normal.length() < this.wallMoveSnapLength) {
      return false
    }

    let result = false
    switch(this.wallsMoveMethod) {
      case `method1`:
        result = !!this.wasmInterop.moveWall(+wall.id, normal, WALLS_GRAPH_MIN_WALL_LENGTH,
              WALLS_GRAPH_MAX_WALL_LENGTH)
        break
      case `method2`:
        result = !!this.wasmInterop.moveWall2(+wall.id, normal, WALLS_GRAPH_MIN_WALL_LENGTH,
          WALLS_GRAPH_MAX_WALL_LENGTH)
        break
      default:
          break
    }
    return result
  }

  public moveVertex(vertexId: string, displacement: THREE.Vector2, minWallLength?: number): WallsGraphMutationResult {
    const vertex = this.vertices.get(vertexId)
    if (!vertex) {
      return {
        success: false,
        obstacleWallId: -1,
        reason: MUTATION_FAIL_REASON_UNKNOWN,
      }
    }
    const minLength = minWallLength !== undefined ? minWallLength : WALLS_GRAPH_MIN_WALL_LENGTH
    const result = this.wasmInterop.moveVertexFree(+vertex.id, displacement, minLength, WALLS_GRAPH_MAX_WALL_LENGTH)
    return translateWasmMoveResult(result)
  }

  public testDeleteVertex(vertexId: string): boolean {
    return this.wasmInterop.testDeleteVertex(+vertexId)
  }

  public deleteVertex(vertexId: string) {
    const vertex = this.getVertexById(vertexId)
    if (!vertex) {
      return null
    }
    const result = this.wasmInterop.deleteVertex(+vertexId)
    if (!result) {
      return null
    }
    this.vertices.delete(vertexId)

    // Re-connect cached walls and vertices.
    // Assuming here that a vertex always has exactly 2 attached walls.
    const [retainedWallId, deletedWallId] = this.wasmInterop.wallExists(+vertex.wallIds[0])
      ? [vertex.wallIds[0], vertex.wallIds[1]]
      : [vertex.wallIds[1], vertex.wallIds[0]]

    const actualVertices = this.wasmInterop.getWallVertices(+retainedWallId)
    const retainedWall = this.getWallById(retainedWallId)
    if (retainedWall && actualVertices.length === 2) {
      retainedWall.vertexIds = actualVertices.map(v => String(v)) as [string, string]
      retainedWall.vertexIds.forEach((vid) => {
        const v = this.vertices.get(vid)
        const actualWallIds = this.wasmInterop.getVertexWalls(+vid)
        if (!v || actualWallIds.length !== 2) {
          return
        }
        v.wallIds = actualWallIds.map(id => String(id))
      })
    }
    const deletedWall = this.getWallById(deletedWallId)
    if (deletedWall && retainedWall) {
      this.walls.delete(deletedWallId)
      deletedWall.elements.forEach((element) => {
        element.wallId = retainedWallId
        retainedWall.elements.set(element.id, element)
      })
    }

    this.fixWallVerticesOrder()
    this.setIsFloorShapeDirty(true)
    return { retainedWallId, deletedWallId }
  }

  public testSplitWall(wallId: string, distance: number): boolean {
    const wall = this.getWallById(wallId)
    if (!wall) {
      return false
    }
    const wallLength = this.getWallLength(wall)
    const worldDistance = wallLength * distance
    const onElement = [...wall.elements.values()].some((element) => {
      const pos = this.wasmInterop.getWallElementPosition(parseInt(element.id, 10))
      return worldDistance >= pos.x - (element.size.x * 0.5 + WALLS_GRAPH_WALL_ELEMENT_MARGIN) &&
      worldDistance <= pos.x + (element.size.x * 0.5 + WALLS_GRAPH_WALL_ELEMENT_MARGIN)
    })
    const proximityLimit = WALL_SPLIT_MIN_DISTANCE
    const tooCloseToCorners = (worldDistance < proximityLimit) || ((wallLength - worldDistance) < proximityLimit)
    return !onElement && !tooCloseToCorners
  }

  // Find a split point as a middle point of one of segments along the wall, free from  a wall element,
  // and th closest to the middle of the wall itself.
  public getAutoSplitDistance(wallId: string): number | undefined {
    const wall = this.getWallById(wallId)
    if (!wall) {
      return undefined
    }
    const wallLength = this.getWallLength(wall)
    if (wallLength <= WALL_SPLIT_MIN_DISTANCE * 2) {
      return undefined
    }
    if (wall.elements.size === 0.0) {
      return 0.5
    }

    // Collect all segments occupied by wall elements.
    const forbiddenSegments = [...wall.elements.values()]
      .map(wallElement => ({pos: this.getWallElementPosition(wallElement.id).x, ...wallElement}))
      .sort((e1, e2) => this.getWallElementPosition(e1.id).x - this.getWallElementPosition(e2.id).x)
      .map(wallElement => ({
        p1: wallElement.pos - (0.5 * wallElement.size.x + WALLS_GRAPH_WALL_ELEMENT_MARGIN),
        p2: wallElement.pos + (0.5 * wallElement.size.x + WALLS_GRAPH_WALL_ELEMENT_MARGIN),
      }))

    // Collect middle points of all "free" segments.
    let startPoint = WALL_SPLIT_MIN_DISTANCE
    const endPoint = wallLength - WALL_SPLIT_MIN_DISTANCE
    const candidates: number[] = []
    for (let i = 0; i < forbiddenSegments.length; i += 1) {
      const forbiddenSegment = forbiddenSegments[i]
      const allowedSegmentLen = forbiddenSegment.p1 - startPoint
      if (allowedSegmentLen > 0.0) {
        candidates.push(startPoint + allowedSegmentLen * 0.5)
      }
      startPoint = forbiddenSegment.p2
    }
    if (startPoint < endPoint) {
      candidates.push(startPoint + 0.5 * (endPoint - startPoint))
    }

    // Find a candidate point which is the closest to the middle of the wall.
    const sorted = candidates
      .map(p => p / wallLength)
      .sort((a, b) => Math.abs(0.5 - a) - Math.abs(0.5 - b))
    return sorted[0]
  }

  public splitWall(wallId: string, distance: number): WallSplitResult | null {
    const wall = this.getWallById(wallId)
    if (!wall) {
      return null
    }

    // Since wasm wall graph will allow wall splitting if the split point is not withing a wall element,
    // we can safely decide which element goes where here.
    const leftElements = new Map<string, WallElement>()
    const rightElements = new Map<string, WallElement>()
    const wallLength = this.getWallLength(wall)
    wall.elements.forEach((element) => {
      const position = this.getWallElementPosition(element.id)
      const elements = position.x < (wallLength * distance) ? leftElements : rightElements
      elements.set(element.id, element)
    })

    const newVertexId = WallsGraph.generateNewId(this.vertices)
    const newWallId = WallsGraph.generateNewId(this.walls, this.reservedSurfaceIds)
    if (!newVertexId || !newWallId) {
      return null
    }

    const result = this.wasmInterop.splitWall(+newVertexId, +newWallId, +wall.id, distance)
    if (!result) {
      return null
    }
    const newVertexWalls = this.wasmInterop.getVertexWalls(+newVertexId)
    if (newVertexWalls.length !== 2 || newVertexWalls[0] === -1 || newVertexWalls[1] === -1) {
      return null
    }
    const newWallVertices = this.wasmInterop.getWallVertices(+newWallId)
    const oldWallVertices = this.wasmInterop.getWallVertices(+wallId)
    if (newWallVertices.length !== 2 || newWallVertices[0] === -1 || newWallVertices[1] === -1 ||
        oldWallVertices.length !== 2 || oldWallVertices[0] === -1 || oldWallVertices[1] === -1
    ) {
      return null
    }
    // Before splitting: oldV1 --------------------wallId------------------------oldV2
    // After splitting:  oldV1--------oldWallId-----newV--------newWall----------oldV2
    const oldVertexId1 = oldWallVertices[0] === +newVertexId ? oldWallVertices[1] : oldWallVertices[0]
    const oldVertexId2 = newWallVertices[0] === +newVertexId ? newWallVertices[1] : newWallVertices[0]
    const oldVertex2 = [...this.vertices.values()].find(v => +v.id === oldVertexId2)
    if (!oldVertex2) {
      return null
    }

    wall.elements = leftElements
    leftElements.forEach((element) => { element.wallId = wall.id })
    rightElements.forEach((element) => { element.wallId = newWallId })
    oldVertex2.wallIds = oldVertex2.wallIds[0] === wallId
      ? [newWallId, oldVertex2.wallIds[1]]
      : [oldVertex2.wallIds[0], newWallId]

    wall.vertexIds = [String(oldVertexId1), newVertexId]
    this.walls.set(newWallId, {
      id: newWallId,
      vertexIds: [newVertexId, oldVertex2.id],
      originalLength: this.wasmInterop.getWallLength(+newWallId),
      uiColor: new THREE.Color(),
      elements: rightElements,
    })

    this.vertices.set(newVertexId, {
      id: newVertexId,
      wallIds: [wallId, newWallId]
    })
    this.fixWallVerticesOrder()
    this.setIsFloorShapeDirty(true)
    return { newVertexId, newWallId }
  }

  public setWallColors(colors: ColorMap) {
    colors.forEach((rgb255, wallId) => {
      const wall = this.walls.get(wallId)
      if (!wall) {
        return
      }
      wall.uiColor.setRGB(rgb255[0] / 255.0, rgb255[1] / 255.0, rgb255[2] / 255.0)
    })
  }

  public setWallGraphColor(rgb255: [number, number, number]) {
    this.walls.forEach(wall => wall.uiColor.setRGB(rgb255[0] / 255.0, rgb255[1] / 255.0, rgb255[2] / 255.0))
  }

  public decomposeDisplacementOnWall(displacement: THREE.Vector2, wall: Wall) {
    return this.decomposeDisplacement(displacement, this.getWallDirection(wall))
  }

  private decomposeDisplacement(displacement: THREE.Vector2, direction: THREE.Vector2) {
    const unitDirection = direction.normalize()
    const dot = displacement.dot(unitDirection)
    const tangent = unitDirection.clone().multiplyScalar(dot)
    const normal = displacement.clone().sub(tangent)
    return { tangent, normal }
  }

  // Get a vector from wall's vertex1 to vertex2, not normalized.
  public getWallDirection(wall: Wall): THREE.Vector2 {
    const ret = new THREE.Vector2()
    const vertex1 = this.vertices.get(wall.vertexIds[0])
    const vertex2 = this.vertices.get(wall.vertexIds[1])
    if (!vertex1 || !vertex2) {
      return ret
    }

    const pos1 = this.wasmInterop.getVertexPosition(+vertex1.id)
    const pos2 = this.wasmInterop.getVertexPosition(+vertex2.id)
    const position1 = new THREE.Vector2(pos1.x, pos1.y)
    const position2 = new THREE.Vector2(pos2.x, pos2.y)

    return ret.subVectors(position2, position1)
  }

  // Each wall has two vertices associated with it. Given one of them, getWallOtherVertex returns the other one.
  public getWallOtherVertex(wall: Wall, givenVertex: WallVertex) {
    const vertexId = givenVertex.id === wall.vertexIds[0] ? wall.vertexIds[1] : wall.vertexIds[0]
    return this.vertices.get(vertexId)
  }

  public getAdjacentWalls(wallid: string): Wall[] {
    const wall = this.walls.get(wallid)
    if (!wall) {
      return []
    }
    return wall.vertexIds.map(vertexId => {
      const vertex = this.getVertexById(vertexId)
      if (!vertex) {
        return undefined
      }
      return this.getVertexOtherWall(wall, vertex)
    }).filter((w): w is Wall => !!w)
  }

  public collectClosedLoop() {
    const startingWall = Array.from(this.walls.values())[0]
    if (!startingWall) {
      return []
    }
    const startingVertex = this.getVertexById(startingWall.vertexIds[0])
    if (startingVertex && startingWall) {
      return this.followLoop(startingVertex, startingWall)
    }
    return []
  }

  private followLoop(startVertex: WallVertex, startWall: Wall) {
    const loopStartVertex = startVertex
    const ret: WallVertex[] = [loopStartVertex]

    let nextVertex: WallVertex | undefined = startVertex
    let nextWall: Wall | undefined = startWall
    // The loop may close in the middle of sequence, e.g. 0-1-2-3-4-2.
    let startIndex = 0
    do {
      nextVertex = this.getWallOtherVertex(nextWall, nextVertex)
      if (nextVertex) {
        if (ret.includes(nextVertex)) {
          // Loop is closed, stop now.
          startIndex = ret.indexOf(nextVertex)
          nextVertex = undefined
        } else {
          ret.push(nextVertex)
          nextWall = this.getVertexOtherWall(nextWall, nextVertex)
          if (nextVertex.wallIds.length > 2) {
            // TODO: support multiple loops per room.
          }
        }
      } else {
        nextWall = undefined
        ret.length = 0
      }
    } while (nextVertex && nextWall)
    return ret.slice(startIndex, ret.length)
  }

  public getVertexOtherWall(oneWall: Wall, givenVertex: WallVertex): Wall | undefined {
    // Handling only 2 walls per vertex case for now.
    if (givenVertex.wallIds.length < 2) {
      return undefined
    }
    const otherWallId = oneWall.id === givenVertex.wallIds[0] ? givenVertex.wallIds[1] : givenVertex.wallIds[0]
    return this.walls.get(otherWallId)
  }

  public getVertexNeighborVertices(vertexId: string): [WallVertex | undefined, WallVertex | undefined] {
    const vertex = this.getVertexById(vertexId)
    if (!vertex) {
      return [undefined, undefined]
    }
    const wall1 = this.getWallById(vertex.wallIds[0])
    const wall2 = this.getWallById(vertex.wallIds[1])
    const neighbor1 = wall1 ? this.getWallOtherVertex(wall1, vertex) : undefined
    const neighbor2 = wall2 ? this.getWallOtherVertex(wall2, vertex) : undefined
    return [neighbor1, neighbor2]
  }

  public getWallNeighborWalls(wallId: string): [Wall | undefined, Wall | undefined] {
    const wall = this.getWallById(wallId)
    if (!wall) {
      return [undefined, undefined]
    }
    const vertices = wall.vertexIds.map(id => this.getVertexById(id))
    const neighbor1 = vertices[0] ? this.getVertexOtherWall(wall, vertices[0]) : undefined
    const neighbor2 = vertices[1] ? this.getVertexOtherWall(wall, vertices[1]) : undefined
    return [neighbor1, neighbor2]
  }

  // Check if both vertex's walls lay on the same line.
  public isVertexInLine(vertexId: string) {
    const vertex = this.getVertexById(vertexId)
    if (!vertex) {
      return false
    }
    const wallDirections = vertex.wallIds
      .map(id => this.getWallById(id))
      .map(wall => wall ? this.getWallDirection(wall).normalize() : undefined)
    if (wallDirections[0] && wallDirections[1]) {
      const DEG_TO_RAD = Math.PI / 180.0
      const angleThreshold = Math.cos(1.0 * DEG_TO_RAD)
      // No Math.Abs here is because assumption is that all walls directions follow the same winding -
      // one is "incoming", and the other is "outgoing".
      // If dot product is -1, it means that walls are collapsed somehow and form a 0 angle.
      // That situation is incorrect.
      return wallDirections[0].dot(wallDirections[1]) > angleThreshold
    }

    return false
  }

  // Returns an array of left and right points of every door element attached to this wall.
  // The points are scaled to [0 -> 1] interval and sorted.
  public getSortedDoorPoints(wall: Wall){
    if (wall.elements.size === 0) {
      return []
    }

    const wallLength = this.getWallLength(wall)
    const doorPoints: Array<number> = []

    wall.elements
      .forEach(el => {
        if (el.class === 'door') {
          const pos = this.getWallElementPosition(el.id)
          const halfSize = el.size.x / 2
          doorPoints.push((pos.x - halfSize) / wallLength)
          doorPoints.push((pos.x + halfSize) / wallLength)
        }
      })

    return doorPoints.sort((a, b) => a - b)
  }

  public collectElementPlacementPositions(wallId: string) {
    const ret: number[] = []
    const wall = this.getWallById(wallId)
    if (!wall) {
      return ret
    }

    const wallLength = this.getWallLength(wall)
    if (wall.elements.size === 0) {
      ret.push(wallLength * 0.5)
      return ret
    }

    const sortedElements = [...wall.elements.values()]
      .map(el => ({ position: this.getWallElementPosition(el.id), size: el.size }))
      .sort((a, b) => (a.position.x - a.size.x / 2) - (b.position.x - b.size.x / 2))

    const firstElementStart = sortedElements[0].position.x - sortedElements[0].size.x / 2
    if (firstElementStart > 0) {
        ret.push(firstElementStart / 2)
    }

    for (let i = 0; i < sortedElements.length - 1; i += 1) {
      const currentElementEnd = sortedElements[i].position.x + sortedElements[i].size.x / 2
      const nextElementStart = sortedElements[i + 1].position.x - sortedElements[i + 1].size.x / 2

      const gapSize = nextElementStart - currentElementEnd
      if (gapSize > 0) {
          ret.push(currentElementEnd + gapSize / 2)
      }
    }

    const lastElementEnd = sortedElements[sortedElements.length - 1].position.x +
      sortedElements[sortedElements.length - 1].size.x / 2
    if (lastElementEnd < wallLength) {
        ret.push(lastElementEnd + (wallLength - lastElementEnd) / 2)
    }

    // Sort by how far each position is from the center of the wall.
    const center = wallLength * 0.5
    ret.sort((a, b) => (b - center) - (a - center))

    return ret
  }

  public testAddWallElement(wallId: string, position: THREE.Vector2, size: THREE.Vector2) {
    const wall = this.getWallById(wallId)
    if (!wall) {
      return false
    }
    const adjustedPosition = this.fitWallElementToWall(wall, position, size)
    if (!adjustedPosition) {
      return false
    }
    return true
  }

  public addWallElement(wallId: string, position: THREE.Vector2, size: THREE.Vector2, surfaceClass: WallElementType) {
    const wall = this.getWallById(wallId)
    if (!wall) {
      return undefined
    }
    const adjustedPosition = this.fitWallElementToWall(wall, position, size)
    if (!adjustedPosition) {
      return undefined
    }

    const newElementId = WallsGraph.generateNewId(this.wallElements)
    if (!newElementId) {
      return undefined
    }
    const result = this.wasmInterop.addWallElement(+newElementId, +wall.id,
      { x: adjustedPosition.x, y: adjustedPosition.y }, { w: size.x, h: size.y }, WALLS_GRAPH_WALL_ELEMENT_MARGIN,
      WallsGraph.surfaceClassToWasmType(surfaceClass))
    if (!result) {
      return undefined
    }

    const newWallElement: WallElement = {
      id: newElementId,
      wallId: wall.id,
      size,
      class: surfaceClass,
    }
    wall.elements.set(newElementId, newWallElement)
    this.wallElements.set(newElementId, newWallElement)

    return newElementId
  }

  private static surfaceClassToWasmType(surfaceClass: string) {
    let type = WasmWallElementType.UNKNOWN
    switch (surfaceClass) {
      case 'window':
        type = WasmWallElementType.WINDOW
        break
      case 'door':
        type = WasmWallElementType.DOOR
        break
      case 'opening':
        type = WasmWallElementType.OPENING
        break
      default:
        break
    }
    return type
  }

  public createSnapshot() {
    this.wasmInterop.createSnapshot()

    const stateSnapshot: WallGraphSnapshot = {
      vertices: new Map<string, WallVertex>(),
      walls: new Map<string, Wall>(),
      wallElements: new Map<string, WallElement>()
    }
    this.vertices.forEach((vertex) => {
      stateSnapshot.vertices.set(vertex.id, { ...vertex })
    })
    this.wallElements.forEach((element) => {
      stateSnapshot.wallElements.set(element.id, { ...element })
    })
    this.walls.forEach((wall) => {
      const snapshotWallElements = new Map<string, WallElement>()
      wall.elements.forEach((element) => {
        const snapshotElement = stateSnapshot.wallElements.get(element.id)
        if (snapshotElement) {
          snapshotWallElements.set(element.id, snapshotElement)
        }
      })
      const snapshotWall: Wall = {
        ...wall,
        elements: snapshotWallElements,
      }
      stateSnapshot.walls.set(wall.id, snapshotWall)
    })
    this.stateSnapshot = stateSnapshot
  }

  public restoreSnapshot() {
    if (this.stateSnapshot) {
      this.vertices = this.stateSnapshot.vertices
      this.walls = this.stateSnapshot.walls
      this.wallElements = this.stateSnapshot.wallElements
    }
    this.wasmInterop.restoreSnapshot(true)
  }

  public clearSnapshot() {
    this.wasmInterop.clearSnapshot()
    this.stateSnapshot = null
  }

  private static generateNewId(existing: Map<string, unknown>, reserved?: Set<string>) {
    const maxTries = 100
    let tryCounter = 0
    let numId = 0 // Since entities can be deleted, there might be gaps in existing numeric ids.
    while (tryCounter <= maxTries) {
      const id = String(numId)
      if (!existing.has(id) && !reserved?.has(id)) {
        return id
      }
      numId += 1
      tryCounter += 1
    }
    return undefined
  }

  public getFloorArea(): number {
    const vertexLoop = this.collectClosedLoop()
    if (vertexLoop.length < 3) {
      return 0
    }

    let area = 0
    for (let i = 0; i < vertexLoop.length; i += 1) {
      const p1 = this.getVertexPosition(vertexLoop[i].id)
      const p2 = this.getVertexPosition(vertexLoop[(i + 1) % vertexLoop.length].id)
      area += p1.x * p2.y - p2.x * p1.y
    }
    return Math.abs(area) * 0.5
  }
}
